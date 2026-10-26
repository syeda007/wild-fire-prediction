import os
import io
import time
import base64
from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import transforms

# Ensure ml module can be imported whether running from repo root or backend/
import sys
for p in [
    Path(__file__).resolve().parent / "ml",
    Path(__file__).resolve().parent.parent / "ml",
    Path.cwd() / "ml",
    Path.cwd() / "backend" / "ml",
]:
    if p.is_dir() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

from models import MobileNetV2Wildfire
from gradcam import GradCAM

def find_model_path() -> Path:
    candidates = [
        Path(os.getenv("MODEL_PATH", "")) if os.getenv("MODEL_PATH") else None,
        Path(__file__).resolve().parent / "models" / "mobilenetv2_wildfire.pt",
        Path(__file__).resolve().parent.parent / "models" / "mobilenetv2_wildfire.pt",
        Path.cwd() / "models" / "mobilenetv2_wildfire.pt",
        Path.cwd() / "backend" / "models" / "mobilenetv2_wildfire.pt",
    ]
    for c in candidates:
        if c and c.is_file():
            return c
    return Path(__file__).resolve().parent / "models" / "mobilenetv2_wildfire.pt"

class InferenceService:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = Path(model_path) if model_path else find_model_path()
        self.device = torch.device("cpu")
        self.model: Optional[MobileNetV2Wildfire] = None
        self.grad_cam: Optional[GradCAM] = None
        self.load_error: Optional[str] = None
        self.classes = ["Reference Unburned Zone", "Wildfire-Associated Satellite Terrain"]
        self.optimal_threshold = 0.50
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.load_model()

    def load_model(self):
        # Refresh model path in case files were initialized post-startup
        if not self.model_path.exists():
            self.model_path = find_model_path()

        if not self.model_path.exists():
            self.load_error = f"Model checkpoint not found. Looked at: {self.model_path}"
            print(f"[InferenceService] {self.load_error}")
            return

        try:
            checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
            model = MobileNetV2Wildfire(num_classes=2, pretrained=False)
            model.load_state_dict(checkpoint["state_dict"])
            model.eval()
            self.model = model
            
            # Setup Grad-CAM on final convolutional block of MobileNetV2
            target_layer = self.model.features[-1]
            self.grad_cam = GradCAM(self.model, target_layer)
            
            val_metrics = checkpoint.get("val_metrics", {})
            self.optimal_threshold = val_metrics.get("optimal_threshold", 0.50)
            self.load_error = None
            print(f"Successfully loaded MobileNetV2 checkpoint from {self.model_path} (Optimal Threshold: {self.optimal_threshold})")
        except Exception as e:
            self.load_error = f"Error loading model: {str(e)}"
            print(f"[InferenceService] {self.load_error}")

    def predict(self, image_bytes: bytes) -> Dict[str, Any]:
        if self.model is None:
            self.load_model()
            if self.model is None:
                err_msg = self.load_error or "Trained MobileNetV2 model is not yet loaded. Please wait for model training to finalize."
                return {
                    "success": False,
                    "error": f"Model load failed: {err_msg} (checked path: {self.model_path})"
                }

        t_start = time.time()
        try:
            orig_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            return {"success": False, "error": f"Invalid image format: {str(e)}"}

        input_tensor = self.transform(orig_img).unsqueeze(0).to(self.device)

        # Generate prediction and Grad-CAM heatmap
        try:
            cam, predicted_class_idx, probabilities = self.grad_cam.generate_heatmap(input_tensor)
            
            fire_prob = float(probabilities[1])
            ref_prob = float(probabilities[0])
            
            # Use threshold-informed classification
            is_wildfire = fire_prob >= self.optimal_threshold
            class_name = "Wildfire-Associated Satellite Terrain" if is_wildfire else "Reference Unburned Zone"
            confidence_score = fire_prob if is_wildfire else ref_prob

            # Create overlaid image & raw heatmap
            blended_img, heatmap_img = self.grad_cam.overlay_on_image(orig_img, cam, alpha=0.45, colormap="turbo")

            # Convert images to base64 Data URLs
            orig_buf = io.BytesIO()
            orig_img.save(orig_buf, format="JPEG", quality=90)
            orig_b64 = "data:image/jpeg;base64," + base64.b64encode(orig_buf.getvalue()).decode()

            blended_buf = io.BytesIO()
            blended_img.save(blended_buf, format="PNG")
            blended_b64 = "data:image/png;base64," + base64.b64encode(blended_buf.getvalue()).decode()

            heat_buf = io.BytesIO()
            heatmap_img.save(heat_buf, format="PNG")
            heat_b64 = "data:image/png;base64," + base64.b64encode(heat_buf.getvalue()).decode()

            latency_ms = round((time.time() - t_start) * 1000, 1)

            return {
                "success": True,
                "prediction": {
                    "class_name": class_name,
                    "is_wildfire": is_wildfire,
                    "fire_probability": round(fire_prob, 4),
                    "reference_probability": round(ref_prob, 4),
                    "confidence_percentage": round(confidence_score * 100, 1),
                    "optimal_threshold": self.optimal_threshold,
                    "inference_latency_ms": latency_ms
                },
                "explainability": {
                    "method": "Grad-CAM (Gradient-weighted Class Activation Mapping)",
                    "target_layer": "MobileNetV2.features[18] (Final Inverted Residual Conv)",
                    "interpretation": "Bright red/yellow regions highlighted in the heatmap indicate spatial textures, burn scars, or smoke plumes that contributed most strongly to the model's classification score."
                },
                "images": {
                    "original": orig_b64,
                    "gradcam_blended": blended_b64,
                    "gradcam_heatmap": heat_b64
                },
                "methodological_disclaimer": "Academic ML Note: Ground truth training labels represent satellite optical patches over historically fire-affected terrain vs reference regions. The model detects visual wildfire surface characteristics (scars/smoke) and does not independently guarantee active flaming combustion at image acquisition time. Active thermal hotspots require NASA FIRMS sensor verification."
            }

        except Exception as e:
            return {"success": False, "error": f"Inference failed: {str(e)}"}
