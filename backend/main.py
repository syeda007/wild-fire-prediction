import os
import io
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from firms_service import FIRMSService
from historical_service import HistoricalReplayService
from inference_service import InferenceService
from analytics_service import AnalyticsService

app = FastAPI(
    title="Satellite Wildfire Intelligence Platform API",
    description="Backend API for AI-based wildfire detection, NASA FIRMS live monitoring, and historical replay.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Services
firms_service = FIRMSService()
historical_service = HistoricalReplayService()
inference_service = InferenceService()
analytics_service = AnalyticsService()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "nasa_firms_configured": bool(firms_service.map_key),
        "mobilenet_loaded": inference_service.model is not None,
        "mobilenet_path": str(inference_service.model_path),
        "mobilenet_path_exists": inference_service.model_path.exists(),
        "mobilenet_error": getattr(inference_service, "load_error", None),
        "historical_records_loaded": len(historical_service.df) if historical_service.df is not None else 0,
        "historical_dir": str(historical_service.data_dir),
        "historical_dir_exists": historical_service.data_dir.exists(),
        "cwd": str(Path.cwd())
    }

# ==========================================
# Module 2: NASA FIRMS Live Monitoring
# ==========================================
@app.get("/api/firms/regions")
def get_supported_regions():
    return firms_service.get_supported_regions()

@app.get("/api/firms/live")
def get_live_hotspots(
    region: str = Query("quebec_canada", description="Region key from presets or 'custom'"),
    source: str = Query("VIIRS_SNPP_NRT", description="VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, or MODIS_NRT"),
    days: int = Query(1, ge=1, le=5, description="Observation lookback days (1 to 5)"),
    min_lon: Optional[float] = None,
    min_lat: Optional[float] = None,
    max_lon: Optional[float] = None,
    max_lat: Optional[float] = None
):
    custom_bbox = None
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        custom_bbox = [min_lon, min_lat, max_lon, max_lat]
        
    result = firms_service.fetch_live_hotspots(
        region_key=region,
        source=source,
        day_range=days,
        custom_bbox=custom_bbox
    )
    return result

# ==========================================
# Module 3: Historical Wildfire Replay
# ==========================================
@app.get("/api/historical/metadata")
def get_historical_metadata():
    return historical_service.get_metadata()

@app.get("/api/historical/observations")
def get_historical_observations(
    date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    cumulative: bool = Query(False, description="Whether to include all detections up to this date"),
    max_points: int = Query(2500, description="Maximum points to return for map performance")
):
    return historical_service.get_observations_for_date(date, cumulative=cumulative, max_points=max_points)

@app.get("/api/historical/trends")
def get_historical_trends():
    return historical_service.get_timeline_trends()

@app.post("/api/historical/import-csv")
async def import_historical_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    contents = await file.read()
    result = historical_service.import_csv(file.filename, contents)
    return result

# ==========================================
# Module 1: AI Satellite Image Classification & Grad-CAM
# ==========================================
@app.post("/api/detection/predict")
async def predict_wildfire_patch(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a JPG or PNG image.")
    
    image_bytes = await file.read()
    result = inference_service.predict(image_bytes)
    return result

# ==========================================
# Module 4: Analytics and Model Evaluation
# ==========================================
@app.get("/api/analytics/model-evaluation")
def get_model_evaluation():
    return analytics_service.get_model_evaluation()

@app.get("/api/analytics/training-curves-image")
def get_training_curves_image():
    base_dir = Path(__file__).resolve().parent.parent
    curves_path = base_dir / "models" / "training_curves.png"
    if not curves_path.exists():
        raise HTTPException(status_code=404, detail="Training curves chart not yet generated.")
    return FileResponse(str(curves_path), media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting Wildfire Intelligence Backend on http://{host}:{port}...", flush=True)
    uvicorn.run(app, host=host, port=port)
