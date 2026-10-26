import os
import hashlib
from pathlib import Path
from PIL import Image
import json

DATASET_ROOT = Path("D:/dataset")

def inspect():
    print(f"Inspecting dataset at: {DATASET_ROOT.resolve()}")
    if not DATASET_ROOT.exists():
        print(f"ERROR: {DATASET_ROOT} does not exist!")
        return

    # Check top-level files / folders
    subdirs = [f for f in DATASET_ROOT.iterdir()]
    print(f"Top-level contents: {[f.name for f in subdirs]}")

    stats = {
        "splits": {},
        "total_images": 0,
        "class_counts": {},
        "formats": {},
        "dimensions": {},
        "corrupted_images": [],
        "duplicate_hash_count": 0,
    }

    hashes = {}
    duplicates = []
    
    sample_files = []

    for item in subdirs:
        if item.is_dir():
            split_name = item.name
            stats["splits"][split_name] = {}
            for class_dir in item.iterdir():
                if class_dir.is_dir():
                    class_name = class_dir.name
                    files = [f for f in class_dir.iterdir() if f.is_file()]
                    stats["splits"][split_name][class_name] = len(files)
                    stats["class_counts"][class_name] = stats["class_counts"].get(class_name, 0) + len(files)
                    stats["total_images"] += len(files)

                    if len(sample_files) < 10 and files:
                        sample_files.append((split_name, class_name, files[0].name))

    print("\n--- Structure and Counts ---")
    print(json.dumps(stats["splits"], indent=2))
    print(f"Total images found: {stats['total_images']}")
    print(f"Class totals: {stats['class_counts']}")

    # Inspect images (sample dimensions, check corrupted, check duplicate hashes)
    print("\nVerifying images, dimensions, corruption and duplicates...")
    checked = 0
    corrupted = 0
    dim_counts = {}
    format_counts = {}

    for split_name, class_dict in stats["splits"].items():
        for class_name in class_dict:
            c_dir = DATASET_ROOT / split_name / class_name
            for img_path in c_dir.iterdir():
                if not img_path.is_file():
                    continue
                checked += 1
                try:
                    with Image.open(img_path) as img:
                        img_format = img.format
                        img_size = img.size # (width, height)
                        img_mode = img.mode
                        dim_counts[img_size] = dim_counts.get(img_size, 0) + 1
                        format_counts[f"{img_format}_{img_mode}"] = format_counts.get(f"{img_format}_{img_mode}", 0) + 1
                    
                    # Compute MD5 to check exact duplicate images
                    with open(img_path, 'rb') as f:
                        file_hash = hashlib.md5(f.read()).hexdigest()
                    if file_hash in hashes:
                        duplicates.append((str(img_path), hashes[file_hash]))
                    else:
                        hashes[file_hash] = str(img_path)

                except Exception as e:
                    corrupted += 1
                    stats["corrupted_images"].append({"path": str(img_path), "error": str(e)})

    stats["duplicate_hash_count"] = len(duplicates)
    stats["dimensions"] = {str(k): v for k, v in dim_counts.items()}
    stats["formats"] = format_counts

    print("\n--- Image Specs ---")
    print(f"Total checked: {checked}")
    print(f"Corrupted: {corrupted}")
    print(f"Exact duplicates by hash: {len(duplicates)}")
    print(f"Formats and color modes: {stats['formats']}")
    print(f"Dimensions distribution: {stats['dimensions']}")

    # Let's inspect coordinate patterns from filenames
    print("\n--- Sample Filenames ---")
    for s, c, fn in sample_files:
        print(f"[{s} / {c}]: {fn}")

    # Check if there are any non-image files or readme files in dataset root
    extra_files = [f.name for f in DATASET_ROOT.iterdir() if f.is_file()]
    print(f"Root files (e.g. metadata/readme): {extra_files}")

    with open("d:/PBA/dataset_inspection_report.json", "w") as out:
        json.dump({
            "stats": stats,
            "sample_duplicates": duplicates[:10] if duplicates else []
        }, out, indent=2)

if __name__ == "__main__":
    inspect()
