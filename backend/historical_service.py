import os
import io
import time
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
def find_historical_data_dir() -> Path:
    candidates = [
        Path(os.getenv("HISTORICAL_DATA_DIR", "")) if os.getenv("HISTORICAL_DATA_DIR") else None,
        Path(__file__).resolve().parent / "data" / "historical",
        Path(__file__).resolve().parent.parent / "data" / "historical",
        Path.cwd() / "data" / "historical",
        Path.cwd() / "backend" / "data" / "historical",
    ]
    for c in candidates:
        if c and c.is_dir():
            return c
    return Path(__file__).resolve().parent / "data" / "historical"

class HistoricalReplayService:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir) if data_dir else find_historical_data_dir()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.data_dir / "archive_processed.pkl"
        self.df: Optional[pd.DataFrame] = None
        self.current_filename: Optional[str] = None
        self.daily_summary_cache: Optional[List[Dict[str, Any]]] = None
        self.distinct_dates: List[str] = []
        self.is_loading = False
        self.is_ready = False
        
        # Start loading in background thread to allow instant server boot
        self._load_thread = threading.Thread(target=self.load_default_archive, daemon=True)
        self._load_thread.start()

    def load_default_archive(self):
        if self.is_loading or self.is_ready:
            return
        self.is_loading = True
        
        # Check if preprocessed pickle exists for instant loading (< 0.5s)
        if self.cache_file.exists():
            try:
                t0 = time.time()
                cached = pd.read_pickle(self.cache_file)
                self.df = cached["df"]
                self.current_filename = cached["filename"]
                self.distinct_dates = cached["distinct_dates"]
                self.daily_summary_cache = cached["daily_summary"]
                self.is_ready = True
                self.is_loading = False
                print(f"[HistoricalReplayService] Loaded {len(self.df)} records from cache in {time.time()-t0:.2f}s", flush=True)
                return
            except Exception as e:
                print(f"[HistoricalReplayService] Cache read error: {e}, will parse CSV.", flush=True)

        csv_files = list(self.data_dir.glob("*.csv"))
        if not csv_files:
            self.is_loading = False
            return

        # Prioritize the large official archive if available
        target_file = None
        for f in csv_files:
            if "fire_archive" in f.name.lower():
                target_file = f
                break
        if not target_file:
            for f in csv_files:
                if "quebec" in f.name.lower():
                    target_file = f
                    break
        if not target_file:
            target_file = csv_files[0]

        try:
            self._parse_and_set_df(str(target_file))
        except Exception as e:
            print(f"[HistoricalReplayService] Error loading historical CSV {target_file}: {e}", flush=True)
        finally:
            self.is_loading = False

    def _parse_and_set_df(self, filepath: str):
        t0 = time.time()
        print(f"[HistoricalReplayService] Parsing historical CSV: {filepath}...", flush=True)
        
        usecols = ["latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp", "daynight"]
        df = pd.read_csv(filepath, usecols=lambda c: c.strip().lower() in usecols)
        df.columns = [c.strip().lower() for c in df.columns]

        df["acq_date"] = pd.to_datetime(df["acq_date"]).dt.strftime("%Y-%m-%d")
        if "frp" not in df.columns:
            df["frp"] = 0.0
        else:
            df["frp"] = pd.to_numeric(df["frp"], errors="coerce").fillna(0.0)

        if "confidence" not in df.columns:
            df["confidence"] = "nominal"

        # Downsample float64 to float32 for 50% memory savings
        df["latitude"] = df["latitude"].astype("float32")
        df["longitude"] = df["longitude"].astype("float32")
        df["frp"] = df["frp"].astype("float32")

        df = df.sort_values(by=["acq_date"]).reset_index(drop=True)
        self.df = df
        self.current_filename = os.path.basename(filepath)
        self.distinct_dates = sorted(df["acq_date"].unique().tolist())

        # Pre-compute daily summary for instant timeline charting
        daily = df.groupby("acq_date").agg(
            count=("latitude", "count"),
            avg_frp=("frp", "mean"),
            max_frp=("frp", "max"),
            sum_frp=("frp", "sum")
        ).reset_index()

        daily["avg_frp"] = daily["avg_frp"].round(2)
        daily["max_frp"] = daily["max_frp"].round(2)
        daily["sum_frp"] = daily["sum_frp"].round(2)

        cumulative = 0
        timeline = []
        for _, r in daily.iterrows():
            cumulative += int(r["count"])
            timeline.append({
                "date": r["acq_date"],
                "daily_count": int(r["count"]),
                "cumulative_count": cumulative,
                "avg_frp": float(r["avg_frp"]),
                "max_frp": float(r["max_frp"]),
                "total_frp": float(r["sum_frp"])
            })

        self.daily_summary_cache = timeline
        self.is_ready = True

        # Save fast cache for instant subsequent loads
        try:
            pd.to_pickle({
                "df": self.df,
                "filename": self.current_filename,
                "distinct_dates": self.distinct_dates,
                "daily_summary": self.daily_summary_cache
            }, self.cache_file)
            print(f"[HistoricalReplayService] Saved preprocessed cache to {self.cache_file}", flush=True)
        except Exception as err:
            print(f"[HistoricalReplayService] Cache save notice: {err}", flush=True)

        print(f"[HistoricalReplayService] Ingested {len(df)} records across {len(self.distinct_dates)} days in {time.time()-t0:.2f}s", flush=True)

    def import_csv(self, filename: str, content_bytes: bytes) -> Dict[str, Any]:
        dest_path = self.data_dir / filename
        with open(dest_path, "wb") as f:
            f.write(content_bytes)

        try:
            self._parse_and_set_df(str(dest_path))
            return {
                "success": True,
                "filename": filename,
                "total_rows": len(self.df),
                "date_range": [self.distinct_dates[0], self.distinct_dates[-1]],
                "message": f"Successfully ingested {len(self.df)} historical NASA observations."
            }
        except Exception as e:
            if dest_path.exists():
                dest_path.unlink()
            return {"success": False, "error": f"Failed to parse CSV: {str(e)}"}

    def get_metadata(self) -> Dict[str, Any]:
        if not self.is_ready or self.df is None or len(self.df) == 0:
            return {
                "available": self.is_ready,
                "loading": self.is_loading,
                "study_case": "2023 Canadian Wildfires (Quebec Study Period: June 1 - July 23, 2023)",
                "dataset_source": "NASA FIRMS (Suomi-NPP VIIRS Archive)",
                "total_records": len(self.df) if self.df is not None else 650899,
                "date_range": ["2023-06-01", "2023-07-23"],
                "instructions": "Place archived CSV in D:\\PBA\\data\\historical or use the Historical Import UI."
            }

        return {
            "available": True,
            "loading": False,
            "filename": self.current_filename,
            "study_case": "2023 Canadian Wildfires (Focus on Quebec Boreal Outbreak)",
            "dataset_source": "NASA FIRMS Archive (VIIRS Suomi-NPP 375m Science Product)",
            "total_records": len(self.df),
            "start_date": self.distinct_dates[0],
            "end_date": self.distinct_dates[-1],
            "distinct_dates": self.distinct_dates,
            "center": [52.0, -68.5],
            "default_zoom": 6,
            "disclaimer": "This is a chronological observation replay of empirical NASA satellite thermal detections, not a mathematical fire spread simulation model."
        }

    def get_observations_for_date(
        self,
        target_date: str,
        cumulative: bool = False,
        region_filter: str = "quebec",
        max_points: int = 1500
    ) -> Dict[str, Any]:
        if not self.is_ready or self.df is None or len(self.df) == 0:
            return {"count": 0, "hotspots": [], "date": target_date, "loading": self.is_loading}

        if cumulative:
            subset = self.df[self.df["acq_date"] <= target_date]
        else:
            subset = self.df[self.df["acq_date"] == target_date]

        # Apply spatial filter if requested
        if region_filter == "quebec":
            subset = subset[
                (subset["latitude"] >= QUEBEC_BBOX["min_lat"]) &
                (subset["latitude"] <= QUEBEC_BBOX["max_lat"]) &
                (subset["longitude"] >= QUEBEC_BBOX["min_lon"]) &
                (subset["longitude"] <= QUEBEC_BBOX["max_lon"])
            ]

        total_in_period = len(subset)
        if len(subset) > max_points:
            step = max(1, len(subset) // max_points)
            subset = subset.iloc[::step]

        hotspots = []
        for _, row in subset.iterrows():
            hotspots.append({
                "lat": float(row["latitude"]),
                "lon": float(row["longitude"]),
                "frp": float(row.get("frp", 0.0)),
                "confidence": str(row.get("confidence", "nominal")),
                "acq_date": str(row["acq_date"]),
                "acq_time": str(row.get("acq_time", "")),
                "satellite": str(row.get("satellite", "SNPP")),
                "instrument": "VIIRS",
                "daynight": str(row.get("daynight", "D"))
            })

        return {
            "target_date": target_date,
            "cumulative": cumulative,
            "region_filter": region_filter,
            "total_detections_in_period": total_in_period,
            "displayed_count": len(hotspots),
            "hotspots": hotspots
        }

    def get_timeline_trends(self) -> Dict[str, Any]:
        if not self.daily_summary_cache:
            return {"available": False, "timeline": [], "loading": self.is_loading}

        timeline = self.daily_summary_cache
        peak_entry = max(timeline, key=lambda x: x["daily_count"]) if timeline else None

        return {
            "available": True,
            "loading": False,
            "total_days": len(timeline),
            "timeline": timeline,
            "peak_day": peak_entry["date"] if peak_entry else None,
            "peak_count": peak_entry["daily_count"] if peak_entry else 0
        }
