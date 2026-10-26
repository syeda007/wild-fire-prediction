import os
import time
import requests
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

MAP_KEY = os.getenv("NASA_FIRMS_MAP_KEY", "94851fffe942e07c8ad9a38b131abccd")
OUTPUT_CSV = Path("D:/PBA/data/historical/quebec_wildfires_2023.csv")
OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)

# Quebec Bounding box [-80.0, 45.0, -60.0, 56.0]
BBOX = "-80,45,-60,56"
SOURCE = "VIIRS_SNPP_SP" # Standard Science Processing product

# Key dates during the 2023 Canadian Wildfire outbreak in Quebec
DATES = [
    "2023-06-01", "2023-06-02", "2023-06-03", "2023-06-04", "2023-06-05",
    "2023-06-06", "2023-06-07", "2023-06-08", "2023-06-10", "2023-06-15",
    "2023-06-20", "2023-06-25", "2023-06-30", "2023-07-05", "2023-07-10",
    "2023-07-15", "2023-07-20", "2023-07-23"
]

def fetch_historical_archive():
    print(f"Fetching real NASA FIRMS historical observations for Quebec (2023)...", flush=True)
    all_dfs = []
    
    for d in DATES:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{BBOX}/1/{d}"
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 200 and len(r.text.strip()) > 50:
                from io import StringIO
                df_day = pd.read_csv(StringIO(r.text))
                all_dfs.append(df_day)
                print(f"  [{d}] Received {len(df_day)} NASA hotspot detections", flush=True)
            else:
                print(f"  [{d}] HTTP {r.status_code} or empty response", flush=True)
        except Exception as e:
            print(f"  [{d}] Failed: {e}", flush=True)
        time.sleep(1) # Respect NASA rate limits
        
    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        combined.to_csv(OUTPUT_CSV, index=False)
        print(f"\nSuccessfully compiled {len(combined)} real historical observations into {OUTPUT_CSV}", flush=True)
    else:
        print("No historical data fetched.", flush=True)

if __name__ == "__main__":
    fetch_historical_archive()
