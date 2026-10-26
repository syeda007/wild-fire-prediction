import os
import random
from pathlib import Path
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

class WildfireDataset(Dataset):
    """
    Dataset loader for Wildfire Satellite Patches.
    Labels: 0 = nowildfire (Reference zone), 1 = wildfire (Wildfire-affected zone)
    """
    def __init__(self, root_dir, split="train", transform=None, max_samples_per_class=None, seed=42):
        self.root_dir = Path(root_dir) / split
        self.split = split
        self.transform = transform
        self.samples = [] # (path, label)
        self.classes = ["nowildfire", "wildfire"]
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
        
        random.seed(seed)
        
        for c in self.classes:
            class_dir = self.root_dir / c
            if not class_dir.exists():
                continue
            
            label = self.class_to_idx[c]
            print(f"Loading {split}/{c} files...", flush=True)
            filenames = [f for f in os.listdir(class_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            random.shuffle(filenames)
            
            if max_samples_per_class is not None and max_samples_per_class > 0:
                filenames = filenames[:max_samples_per_class]
                
            for fn in filenames:
                self.samples.append((str(class_dir / fn), label))
                
        random.shuffle(self.samples)
        print(f"Loaded {len(self.samples)} samples for split '{split}'", flush=True)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        with Image.open(path) as img:
            image = img.convert("RGB")
            
        if self.transform:
            image = self.transform(image)
            
        return image, label, path

def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, eval_transform
