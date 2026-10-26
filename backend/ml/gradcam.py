import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import matplotlib as mpl
import matplotlib.pyplot as plt

class GradCAM:
    """
    Gradient-weighted Class Activation Mapping (Grad-CAM) for visual explanations.
    Hooks into the final convolutional layer of MobileNetV2 or Baseline CNN.
    """
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.hook_handles = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        h1 = self.target_layer.register_forward_hook(forward_hook)
        h2 = self.target_layer.register_full_backward_hook(backward_hook)
        self.hook_handles.extend([h1, h2])

    def generate_heatmap(self, input_tensor, target_class=None):
        self.model.eval()
        self.model.zero_grad()
        
        # Forward pass
        output = self.model(input_tensor)
        
        if target_class is None:
            target_class = output.argmax(dim=1).item()
            
        # Backward pass for the target class logit
        target_score = output[0, target_class]
        target_score.backward(retain_graph=True)
        
        # Global average pooling of gradients
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True) # shape [1, C, 1, 1]
        
        # Linear combination of weighted activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True) # shape [1, 1, H, W]
        cam = F.relu(cam) # Apply ReLU to focus on features that have a positive influence
        
        # Normalize between 0 and 1
        cam = cam.squeeze().cpu().numpy()
        if np.max(cam) != np.min(cam):
            cam = (cam - np.min(cam)) / (np.max(cam) - np.min(cam) + 1e-8)
        else:
            cam = np.zeros_like(cam)
            
        return cam, target_class, F.softmax(output, dim=1)[0].detach().cpu().numpy()

    def overlay_on_image(self, original_img, cam, alpha=0.45, colormap="turbo"):
        """
        Overlays the normalized CAM heatmap onto the original PIL image.
        Returns a PIL image of the blended heatmap.
        """
        # Resize cam to match image size
        cam_resized = Image.fromarray(np.uint8(255 * cam)).resize(original_img.size, Image.BILINEAR)
        cam_array = np.array(cam_resized) / 255.0
        
        # Apply colormap
        try:
            cmap = mpl.colormaps[colormap]
        except (AttributeError, KeyError):
            cmap = plt.get_cmap(colormap)
        colored_cam = cmap(cam_array)[:, :, :3] # Keep RGB
        colored_cam = np.uint8(255 * colored_cam)
        
        # Blend
        orig_array = np.array(original_img.convert("RGB"))
        blended = np.uint8(orig_array * (1 - alpha) + colored_cam * alpha)
        
        return Image.fromarray(blended), Image.fromarray(colored_cam)

    def close(self):
        for h in self.hook_handles:
            h.remove()
