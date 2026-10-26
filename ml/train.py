import os
import sys
import time
import json
import argparse
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, precision_recall_curve, auc
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Local imports
from dataset import WildfireDataset, get_transforms
from models import BaselineCNN, MobileNetV2Wildfire

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for i, (images, labels, _) in enumerate(loader):
        images = images.to(device)
        labels = labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels.data).item()
        total += labels.size(0)
        
        if (i + 1) % 15 == 0 or (i + 1) == len(loader):
            print(f"  Batch [{i+1}/{len(loader)}] - Batch Loss: {loss.item():.4f}, Running Acc: {correct/total:.4f}", flush=True)
        
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc

def evaluate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    all_labels = []
    all_preds = []
    all_probs = []
    
    with torch.no_grad():
        for images, labels, _ in loader:
            images = images.to(device)
            labels = labels.to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * images.size(0)
            probs = torch.softmax(outputs, dim=1)[:, 1] # Probability of wildfire class
            _, preds = torch.max(outputs, 1)
            
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)
            
            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(preds.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
            
    eval_loss = running_loss / total
    eval_acc = correct / total
    
    all_labels = np.array(all_labels)
    all_preds = np.array(all_preds)
    all_probs = np.array(all_probs)
    
    precision = precision_score(all_labels, all_preds, zero_division=0)
    recall = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    roc_auc = roc_auc_score(all_labels, all_probs)
    
    prec_curve, rec_curve, thresholds = precision_recall_curve(all_labels, all_probs)
    pr_auc = auc(rec_curve, prec_curve)
    
    # Calculate optimal threshold by max F1 on PR curve
    f1_scores = 2 * (prec_curve * rec_curve) / (prec_curve + rec_curve + 1e-8)
    best_idx = np.argmax(f1_scores)
    best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5
    
    cm = confusion_matrix(all_labels, all_preds).tolist()
    
    metrics = {
        "loss": round(eval_loss, 4),
        "accuracy": round(eval_acc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "optimal_threshold": round(best_threshold, 4),
        "confusion_matrix": cm,
        "sample_count": total
    }
    
    return metrics

def train_model(model_name, model, train_loader, val_loader, epochs, lr, device, save_path):
    print(f"\n==========================================")
    print(f"Training: {model_name}")
    print(f"Device: {device} | Epochs: {epochs} | LR: {lr}")
    print(f"==========================================")
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=1)
    
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "val_f1": []
    }
    
    best_val_loss = float('inf')
    best_val_f1 = 0.0
    
    start_time = time.time()
    
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = evaluate(model, val_loader, criterion, device)
        scheduler.step(val_metrics["loss"])
        
        t_elapsed = time.time() - t0
        
        history["train_loss"].append(round(train_loss, 4))
        history["train_acc"].append(round(train_acc, 4))
        history["val_loss"].append(val_metrics["loss"])
        history["val_acc"].append(val_metrics["accuracy"])
        history["val_f1"].append(val_metrics["f1"])
        
        print(f"Epoch [{epoch}/{epochs}] ({t_elapsed:.1f}s) - "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.4f} | "
              f"Val Loss: {val_metrics['loss']:.4f}, Acc: {val_metrics['accuracy']:.4f}, F1: {val_metrics['f1']:.4f}", flush=True)
        
        # Save best model checkpoint
        if val_metrics["f1"] > best_val_f1 or (val_metrics["f1"] == best_val_f1 and val_metrics["loss"] < best_val_loss):
            best_val_f1 = val_metrics["f1"]
            best_val_loss = val_metrics["loss"]
            
            torch.save({
                "model_name": model_name,
                "epoch": epoch,
                "state_dict": model.state_dict(),
                "val_metrics": val_metrics,
                "history": history
            }, save_path)
            print(f"  --> Saved new best checkpoint to {save_path} (F1: {best_val_f1:.4f})", flush=True)
            
    total_time = time.time() - start_time
    print(f"Training completed in {total_time/60:.2f} mins.", flush=True)
    return history

def plot_curves(mobilenet_hist, baseline_hist, save_path):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss curves
    axes[0].plot(mobilenet_hist["train_loss"], label="MobileNetV2 Train Loss", color="#3b82f6", linewidth=2)
    axes[0].plot(mobilenet_hist["val_loss"], label="MobileNetV2 Val Loss", color="#60a5fa", linestyle="--", linewidth=2)
    axes[0].plot(baseline_hist["train_loss"], label="Baseline CNN Train Loss", color="#ef4444", linewidth=2)
    axes[0].plot(baseline_hist["val_loss"], label="Baseline CNN Val Loss", color="#f87171", linestyle="--", linewidth=2)
    axes[0].set_title("Training & Validation Loss Curves", fontsize=12, fontweight="bold")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Cross Entropy Loss")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Accuracy curves
    axes[1].plot(mobilenet_hist["train_acc"], label="MobileNetV2 Train Acc", color="#3b82f6", linewidth=2)
    axes[1].plot(mobilenet_hist["val_acc"], label="MobileNetV2 Val Acc", color="#60a5fa", linestyle="--", linewidth=2)
    axes[1].plot(baseline_hist["train_acc"], label="Baseline CNN Train Acc", color="#ef4444", linewidth=2)
    axes[1].plot(baseline_hist["val_acc"], label="Baseline CNN Val Acc", color="#f87171", linestyle="--", linewidth=2)
    axes[1].set_title("Training & Validation Accuracy", fontsize=12, fontweight="bold")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=200)
    plt.close()
    print(f"Saved training curves chart to {save_path}")

def run_training_pipeline(dataset_dir="D:/dataset", epochs=4, batch_size=32, max_train_per_class=1200, max_eval_per_class=400):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using execution device: {device}")
    
    models_dir = Path("D:/PBA/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    train_transform, eval_transform = get_transforms()
    
    print("\nLoading datasets...")
    train_ds = WildfireDataset(dataset_dir, split="train", transform=train_transform, max_samples_per_class=max_train_per_class)
    val_ds = WildfireDataset(dataset_dir, split="valid", transform=eval_transform, max_samples_per_class=max_eval_per_class)
    test_ds = WildfireDataset(dataset_dir, split="test", transform=eval_transform, max_samples_per_class=max_eval_per_class)
    
    print(f"Training set:   {len(train_ds)} samples")
    print(f"Validation set: {len(val_ds)} samples")
    print(f"Test set:       {len(test_ds)} samples")
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)
    
    # 1. Train Baseline CNN
    baseline_model = BaselineCNN(num_classes=2).to(device)
    baseline_save_path = models_dir / "baseline_cnn.pt"
    baseline_history = train_model("Baseline Custom CNN", baseline_model, train_loader, val_loader, epochs=epochs, lr=1e-3, device=device, save_path=baseline_save_path)
    
    # Evaluate Baseline on Test Set
    checkpoint_baseline = torch.load(baseline_save_path, map_location=device, weights_only=False)
    baseline_model.load_state_dict(checkpoint_baseline["state_dict"])
    baseline_test_metrics = evaluate(baseline_model, test_loader, nn.CrossEntropyLoss(), device)
    print("\n[Baseline CNN Final Test Metrics]:", json.dumps(baseline_test_metrics, indent=2))
    
    # 2. Train MobileNetV2
    mobilenet_model = MobileNetV2Wildfire(num_classes=2, pretrained=True).to(device)
    mobilenet_save_path = models_dir / "mobilenetv2_wildfire.pt"
    mobilenet_history = train_model("MobileNetV2 (Transfer Learning)", mobilenet_model, train_loader, val_loader, epochs=epochs, lr=3e-4, device=device, save_path=mobilenet_save_path)
    
    # Evaluate MobileNetV2 on Test Set
    checkpoint_mobilenet = torch.load(mobilenet_save_path, map_location=device, weights_only=False)
    mobilenet_model.load_state_dict(checkpoint_mobilenet["state_dict"])
    mobilenet_test_metrics = evaluate(mobilenet_model, test_loader, nn.CrossEntropyLoss(), device)
    print("\n[MobileNetV2 Final Test Metrics]:", json.dumps(mobilenet_test_metrics, indent=2))
    
    # 3. Plot curves
    curves_path = models_dir / "training_curves.png"
    plot_curves(mobilenet_history, baseline_history, curves_path)
    
    # 4. Save consolidated metrics.json
    metrics_summary = {
        "dataset_metadata": {
            "source": "Wildfire Prediction Dataset (Satellite Images)",
            "classes": ["nowildfire", "wildfire"],
            "total_images": 42850,
            "train_samples_used": len(train_ds),
            "val_samples_used": len(val_ds),
            "test_samples_used": len(test_ds),
            "image_resolution": "350x350 rescaled to 224x224",
            "semantic_definition": "Labels represent satellite optical imagery centered over historical wildfire-affected / burn-scarred terrain vs. unburned reference zones. Inferences indicate optical wildfire landscape features rather than instant thermal flame detection."
        },
        "models_comparison": {
            "Baseline_CNN": {
                "name": "Custom 4-Layer CNN",
                "test_accuracy": baseline_test_metrics["accuracy"],
                "precision": baseline_test_metrics["precision"],
                "recall": baseline_test_metrics["recall"],
                "f1_score": baseline_test_metrics["f1"],
                "roc_auc": baseline_test_metrics["roc_auc"],
                "pr_auc": baseline_test_metrics["pr_auc"],
                "optimal_threshold": baseline_test_metrics["optimal_threshold"],
                "confusion_matrix": baseline_test_metrics["confusion_matrix"],
                "training_history": baseline_history
            },
            "MobileNetV2": {
                "name": "MobileNetV2 (Pretrained ImageNet + Fine-tuned)",
                "test_accuracy": mobilenet_test_metrics["accuracy"],
                "precision": mobilenet_test_metrics["precision"],
                "recall": mobilenet_test_metrics["recall"],
                "f1_score": mobilenet_test_metrics["f1"],
                "roc_auc": mobilenet_test_metrics["roc_auc"],
                "pr_auc": mobilenet_test_metrics["pr_auc"],
                "optimal_threshold": mobilenet_test_metrics["optimal_threshold"],
                "confusion_matrix": mobilenet_test_metrics["confusion_matrix"],
                "training_history": mobilenet_history
            }
        },
        "training_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "hyperparameters": {
            "epochs": epochs,
            "batch_size": batch_size,
            "optimizer": "AdamW",
            "loss_function": "CrossEntropyLoss",
            "input_resolution": [224, 224, 3],
            "data_augmentation": ["RandomHorizontalFlip", "RandomVerticalFlip", "RandomRotation(15)", "ColorJitter"]
        }
    }
    
    with open(models_dir / "metrics.json", "w") as f:
        json.dump(metrics_summary, f, indent=2)
    print(f"\nAll metrics successfully saved to {models_dir / 'metrics.json'}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Wildfire Detection Models")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--max_train", type=int, default=1200, help="Max train samples per class")
    parser.add_argument("--max_eval", type=int, default=400, help="Max eval samples per class")
    args = parser.parse_args()
    
    run_training_pipeline(
        epochs=args.epochs,
        batch_size=args.batch_size,
        max_train_per_class=args.max_train,
        max_eval_per_class=args.max_eval
    )
