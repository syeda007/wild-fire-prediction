import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
BASE_DIR = Path(__file__).resolve().parent.parent
METRICS_PATH = Path(os.getenv("METRICS_PATH", BASE_DIR / "models" / "metrics.json"))

class AnalyticsService:
    def __init__(self, metrics_path: Optional[str] = None):
        self.metrics_path = Path(metrics_path) if metrics_path else METRICS_PATH

    def get_model_evaluation(self) -> Dict[str, Any]:
        if not self.metrics_path.exists():
            return {
                "available": False,
                "message": "Model evaluation metrics will be available once the training run completes."
            }

        try:
            with open(self.metrics_path, "r") as f:
                data = json.load(f)

            comparison = data.get("models_comparison", {})
            baseline = comparison.get("Baseline_CNN", {})
            mobilenet = comparison.get("MobileNetV2", {})

            # Prepare comparison table
            metrics_table = [
                {
                    "metric": "Test Accuracy",
                    "baseline_cnn": f"{baseline.get('test_accuracy', 0)*100:.2f}%",
                    "mobilenet_v2": f"{mobilenet.get('test_accuracy', 0)*100:.2f}%",
                    "delta": f"+{(mobilenet.get('test_accuracy', 0) - baseline.get('test_accuracy', 0))*100:.2f}%"
                },
                {
                    "metric": "Precision (Fire Class)",
                    "baseline_cnn": f"{baseline.get('precision', 0)*100:.2f}%",
                    "mobilenet_v2": f"{mobilenet.get('precision', 0)*100:.2f}%",
                    "delta": f"+{(mobilenet.get('precision', 0) - baseline.get('precision', 0))*100:.2f}%"
                },
                {
                    "metric": "Recall (Fire Class)",
                    "baseline_cnn": f"{baseline.get('recall', 0)*100:.2f}%",
                    "mobilenet_v2": f"{mobilenet.get('recall', 0)*100:.2f}%",
                    "delta": f"+{(mobilenet.get('recall', 0) - baseline.get('recall', 0))*100:.2f}%"
                },
                {
                    "metric": "F1-Score (Fire Class)",
                    "baseline_cnn": f"{baseline.get('f1_score', 0):.4f}",
                    "mobilenet_v2": f"{mobilenet.get('f1_score', 0):.4f}",
                    "delta": f"+{mobilenet.get('f1_score', 0) - baseline.get('f1_score', 0):.4f}"
                },
                {
                    "metric": "ROC-AUC",
                    "baseline_cnn": f"{baseline.get('roc_auc', 0):.4f}",
                    "mobilenet_v2": f"{mobilenet.get('roc_auc', 0):.4f}",
                    "delta": f"+{mobilenet.get('roc_auc', 0) - baseline.get('roc_auc', 0):.4f}"
                },
                {
                    "metric": "PR-AUC",
                    "baseline_cnn": f"{baseline.get('pr_auc', 0):.4f}",
                    "mobilenet_v2": f"{mobilenet.get('pr_auc', 0):.4f}",
                    "delta": f"+{mobilenet.get('pr_auc', 0) - baseline.get('pr_auc', 0):.4f}"
                },
                {
                    "metric": "Optimal Decision Threshold",
                    "baseline_cnn": f"{baseline.get('optimal_threshold', 0.5):.4f}",
                    "mobilenet_v2": f"{mobilenet.get('optimal_threshold', 0.5):.4f}",
                    "delta": "Validation Tuned"
                }
            ]

            # Reformat loss curves for Recharts
            bl_hist = baseline.get("training_history", {})
            mb_hist = mobilenet.get("training_history", {})
            epochs_count = max(len(bl_hist.get("train_loss", [])), len(mb_hist.get("train_loss", [])))
            
            curves_data = []
            for ep in range(epochs_count):
                curves_data.append({
                    "epoch": f"Epoch {ep + 1}",
                    "mobilenet_train_loss": mb_hist.get("train_loss", [None]*epochs_count)[ep] if ep < len(mb_hist.get("train_loss", [])) else None,
                    "mobilenet_val_loss": mb_hist.get("val_loss", [None]*epochs_count)[ep] if ep < len(mb_hist.get("val_loss", [])) else None,
                    "baseline_train_loss": bl_hist.get("train_loss", [None]*epochs_count)[ep] if ep < len(bl_hist.get("train_loss", [])) else None,
                    "baseline_val_loss": bl_hist.get("val_loss", [None]*epochs_count)[ep] if ep < len(bl_hist.get("val_loss", [])) else None,
                    "mobilenet_val_acc": mb_hist.get("val_acc", [None]*epochs_count)[ep] if ep < len(mb_hist.get("val_acc", [])) else None,
                    "baseline_val_acc": bl_hist.get("val_acc", [None]*epochs_count)[ep] if ep < len(bl_hist.get("val_acc", [])) else None,
                })

            return {
                "available": True,
                "dataset_metadata": data.get("dataset_metadata", {}),
                "training_timestamp": data.get("training_timestamp", "Recent"),
                "hyperparameters": data.get("hyperparameters", {}),
                "metrics_table": metrics_table,
                "confusion_matrices": {
                    "baseline_cnn": {
                        "matrix": baseline.get("confusion_matrix", [[0,0],[0,0]]),
                        "labels": ["Reference", "Wildfire-Prone"]
                    },
                    "mobilenet_v2": {
                        "matrix": mobilenet.get("confusion_matrix", [[0,0],[0,0]]),
                        "labels": ["Reference", "Wildfire-Prone"]
                    }
                },
                "training_curves": curves_data
            }
        except Exception as e:
            return {"available": False, "error": f"Failed to load metrics: {str(e)}"}
