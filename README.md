# Satellite Wildfire Intelligence Platform 🔥🛰️

A full-stack, AI-powered wildfire intelligence and environmental monitoring platform combining deep learning (MobileNetV2 + Grad-CAM visual explainability), near real-time NASA FIRMS thermal anomaly detection, and historical observation replay.

---

## 🌟 Key Features

1. **AI Satellite Image Classification & Grad-CAM Explainability**:
   - Classifies satellite patches into *Wildfire-Associated Satellite Terrain* vs. *Reference Unburned Zone*.
   - Generates pixel-level **Grad-CAM heatmaps** overlaid on optical satellite images with Turbo colormaps to highlight spatial visual cues (smoke plumes, burn scars, active flaming zones).

2. **NASA FIRMS Live Hotspot Monitoring**:
   - Streams thermal anomaly detections directly from NASA satellites (VIIRS S-NPP, VIIRS NOAA-20, MODIS).
   - Real-time interactive mapping with cluster inspection, Brightness Temperature (K), Fire Radiative Power (MW), and confidence metrics.

3. **Historical Wildfire Replay & Spatio-Temporal Analysis**:
   - High-throughput replay of 650,000+ historical satellite fire detections across Canada and global hotspots.
   - Cumulative and single-day temporal progression filters, timeline charts, and custom CSV import.

4. **Model Performance & Analytics**:
   - Comprehensive model evaluation metrics (ROC-AUC, PR-AUC, Confusion Matrix, Optimal Decision Threshold).

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet / React-Leaflet, Lucide Icons, Recharts.
- **Backend API**: FastAPI, Uvicorn, Pydantic, Python-dotenv.
- **Machine Learning**: PyTorch, TorchVision, MobileNetV2, Grad-CAM, NumPy, Pandas, Matplotlib, Scikit-learn.

---

## 🚀 Quickstart: Running Locally

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and `npm` or `pnpm`

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your NASA FIRMS MAP KEY (get free key from https://firms.modaps.eosdis.nasa.gov/api/map_key)

# Run FastAPI backend
python main.py
```
*API will run at `http://localhost:8000` (API docs at `http://localhost:8000/docs`).*

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend will run at `http://localhost:5173`.*

---

## 🌐 How to Deploy This Platform

### Option A: Modern Cloud Hosting (Recommended & Easiest)

#### 1. Backend on **Render** / **Railway**
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com) or [Railway](https://railway.app).
3. Create a **New Web Service** linked to your GitHub repo.
4. Set root directory to `backend` (or project root).
5. Build command:
   ```bash
   pip install -r requirements.txt
   ```
6. Start command:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
7. In the **Environment Variables** dashboard, add:
   - `NASA_FIRMS_MAP_KEY`: *(Your NASA FIRMS Key)*
   - `PORT`: `8000`

#### 2. Frontend on **Vercel** / **Netlify**
1. Sign in to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Import the `frontend` folder from your repository.
3. Build Settings:
   - Framework: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Set environment variable / rewrite for your API:
   - In production, set `VITE_API_URL` to your live Render backend URL, or configure Vercel rewrite `vercel.json` to proxy `/api/*` to your backend.

---

### Option B: Docker / Container Deployment

Create a `Dockerfile` for containerized environments (AWS ECS, Google Cloud Run, Azure App Services, or DigitalOcean):

```dockerfile
# Dockerfile for Backend
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📜 License
MIT License.
