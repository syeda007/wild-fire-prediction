import os
import io
import time
import csv
import logging
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("firms_service")

# Preset bounding boxes for major wildfire observation regions [min_lon, min_lat, max_lon, max_lat]
PRESET_REGIONS = {
    "quebec_canada": {
        "name": "Quebec, Canada (Boreal Forest)",
        "bbox": [-80.0, 45.0, -57.0, 58.0],
        "center": [52.0, -68.5],
        "default_zoom": 6
    },
    "canada_all": {
        "name": "Canada (National)",
        "bbox": [-141.0, 41.5, -52.0, 70.0],
        "center": [56.0, -96.0],
        "default_zoom": 4
    },
    "us_west": {
        "name": "United States (West Coast)",
        "bbox": [-125.0, 32.0, -114.0, 49.0],
        "center": [39.0, -120.0],
        "default_zoom": 6
    },
    "mediterranean": {
        "name": "Mediterranean Basin (Southern Europe)",
        "bbox": [-10.0, 35.0, 30.0, 45.0],
        "center": [39.5, 15.0],
        "default_zoom": 5
    },
    "australia": {
        "name": "Australia (South-East)",
        "bbox": [138.0, -39.0, 154.0, -28.0],
        "center": [-33.5, 146.0],
        "default_zoom": 6
    }
}

class FIRMSService:
    def __init__(self, map_key: Optional[str] = None):
        self.map_key = map_key or os.getenv("NASA_FIRMS_MAP_KEY", "")
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_seconds = 600 # 10 minutes cache to protect rate limits

    def get_supported_regions(self) -> Dict[str, Any]:
        return PRESET_REGIONS

    def fetch_live_hotspots(
        self,
        region_key: str = "quebec_canada",
        source: str = "VIIRS_SNPP_NRT",
        day_range: int = 1,
        custom_bbox: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        day_range = max(1, min(int(day_range), 5))
        """
        Fetch near-real-time satellite thermal anomaly detections from NASA FIRMS Area API.
        Area API URL format:
        https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]
        """
        if not self.map_key:
            return {
                "success": False,
                "error": "NASA_FIRMS_MAP_KEY is missing. Please set it in backend/.env",
                "hotspots": [],
                "count": 0
            }

        # Resolve bbox
        if custom_bbox and len(custom_bbox) == 4:
            bbox = custom_bbox
            region_name = f"Custom [{bbox[0]:.2f}, {bbox[1]:.2f}, {bbox[2]:.2f}, {bbox[3]:.2f}]"
            center = [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]
            zoom = 6
        else:
            region_info = PRESET_REGIONS.get(region_key, PRESET_REGIONS["quebec_canada"])
            bbox = region_info["bbox"]
            region_name = region_info["name"]
            center = region_info["center"]
            zoom = region_info["default_zoom"]

        bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        cache_key = f"{source}_{bbox_str}_{day_range}"

        # Check in-memory cache
        now = time.time()
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if now - entry["cached_at"] < self.cache_ttl_seconds:
                return {
                    **entry["data"],
                    "cached": True,
                    "cached_seconds_ago": round(now - entry["cached_at"])
                }

        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{self.map_key}/{source}/{bbox_str}/{day_range}"
        logger.info(f"Querying NASA FIRMS: source={source}, bbox={bbox_str}, days={day_range}")

        try:
            resp = requests.get(url, timeout=18)
            if resp.status_code == 403:
                return {
                    "success": False,
                    "error": "Invalid NASA FIRMS MAP_KEY or unauthorized access.",
                    "hotspots": [],
                    "count": 0
                }
            if resp.status_code == 429:
                return {
                    "success": False,
                    "error": "NASA FIRMS rate limit exceeded. Please wait a moment before refreshing.",
                    "hotspots": [],
                    "count": 0
                }
            if resp.status_code != 200:
                return {
                    "success": False,
                    "error": f"NASA FIRMS API returned HTTP {resp.status_code}: {resp.text[:200]}",
                    "hotspots": [],
                    "count": 0
                }

            # Parse CSV
            csv_text = resp.text.strip()
            hotspots = []
            total_frp = 0.0
            frp_count = 0
            max_frp = 0.0
            confidence_counts = {"nominal": 0, "low": 0, "high": 0}

            reader = csv.DictReader(io.StringIO(csv_text))
            for row in reader:
                try:
                    lat = float(row.get("latitude", 0))
                    lon = float(row.get("longitude", 0))
                    
                    frp_val = row.get("frp")
                    frp = float(frp_val) if frp_val not in (None, "", "N/A") else None
                    if frp is not None:
                        total_frp += frp
                        frp_count += 1
                        if frp > max_frp:
                            max_frp = frp

                    conf_raw = str(row.get("confidence", "nominal")).lower()
                    if conf_raw in ("h", "high"):
                        conf_str = "high"
                    elif conf_raw in ("l", "low"):
                        conf_str = "low"
                    else:
                        conf_str = "nominal"
                    confidence_counts[conf_str] += 1

                    bright_ti4 = float(row.get("bright_ti4", 0)) if row.get("bright_ti4") else None
                    bright_ti5 = float(row.get("bright_ti5", 0)) if row.get("bright_ti5") else None
                    acq_date = row.get("acq_date", "")
                    acq_time = row.get("acq_time", "")
                    sat = row.get("satellite", "")
                    instrument = row.get("instrument", source)
                    daynight = row.get("daynight", "D")

                    hotspots.append({
                        "lat": lat,
                        "lon": lon,
                        "brightness_ti4": bright_ti4,
                        "brightness_ti5": bright_ti5,
                        "frp": frp,
                        "confidence": conf_str,
                        "acq_date": acq_date,
                        "acq_time": acq_time,
                        "satellite": sat,
                        "instrument": instrument,
                        "daynight": daynight,
                        "data_type": "NASA Satellite-Detected Thermal Anomaly"
                    })
                except (ValueError, KeyError) as parse_err:
                    continue

            result = {
                "success": True,
                "region_name": region_name,
                "center": center,
                "zoom": zoom,
                "source": source,
                "day_range": day_range,
                "count": len(hotspots),
                "hotspots": hotspots,
                "summary": {
                    "total_detections": len(hotspots),
                    "mean_frp": round(total_frp / frp_count, 2) if frp_count > 0 else 0.0,
                    "max_frp": round(max_frp, 2),
                    "confidence_breakdown": confidence_counts,
                    "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
                },
                "disclaimer": "Thermal anomaly coordinates and FRP are observed directly by NASA VIIRS/MODIS satellite sensors. These points are empirical thermal detections, not predictions made by MobileNetV2."
            }

            # Cache the result
            self.cache[cache_key] = {
                "cached_at": now,
                "data": result
            }

            return result

        except requests.exceptions.RequestException as e:
            logger.error(f"Error querying NASA FIRMS: {e}")
            return {
                "success": False,
                "error": f"Failed to connect to NASA FIRMS API: {str(e)}",
                "hotspots": [],
                "count": 0
            }
