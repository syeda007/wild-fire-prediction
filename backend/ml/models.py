import torch
import torch.nn as nn
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights

class BaselineCNN(nn.Module):
    """
    Baseline Custom 4-Layer Convolutional Neural Network.
    Provides standard empirical comparison for MobileNetV2 transfer learning.
    """
    def __init__(self, num_classes=2):
        super(BaselineCNN, self).__init__()
        self.features = nn.Sequential(
            # Block 1: 224x224 -> 112x112
            nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            
            # Block 2: 112x112 -> 56x56
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            
            # Block 3: 56x56 -> 28x28
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            
            # Block 4: 28x28 -> 14x14
            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            
            nn.AdaptiveAvgPool2d((1, 1))
        )
        
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.35),
            nn.Linear(256, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        feat = self.features(x)
        out = self.classifier(feat)
        return out


class MobileNetV2Wildfire(nn.Module):
    """
    MobileNetV2 with ImageNet Pretrained Weights and Fine-Tuned Wildfire Classifier Head.
    Freezes lower generic feature layers to accelerate transfer learning and prevent overfitting.
    """
    def __init__(self, num_classes=2, pretrained=True, freeze_backbone_depth=14):
        super(MobileNetV2Wildfire, self).__init__()
        weights = MobileNet_V2_Weights.DEFAULT if pretrained else None
        base = mobilenet_v2(weights=weights)
        
        self.features = base.features
        
        # Freeze lower feature extractor layers for efficient transfer learning
        if freeze_backbone_depth > 0:
            for layer in self.features[:freeze_backbone_depth]:
                for param in layer.parameters():
                    param.requires_grad = False
        
        # Custom classification head
        in_features = base.classifier[1].in_features # 1280
        self.classifier = nn.Sequential(
            nn.Dropout(0.35),
            nn.Linear(in_features, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = nn.functional.adaptive_avg_pool2d(x, (1, 1))
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x
