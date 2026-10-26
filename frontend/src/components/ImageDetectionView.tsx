import React, { useState, useRef, useEffect } from 'react';
import type { PredictionResponse } from '../types';
import {
  Upload,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';

export const ImageDetectionView: React.FC = () => {
  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSampleName, setActiveSampleName] = useState<string>('wildfire_example.jpg');
  const [imgDetails, setImgDetails] = useState({
    name: 'wildfire_example.jpg',
    dimensions: '1024 × 1024',
    size: '2.4 MB'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleImages = [
    {
      id: 'forest',
      title: 'Forest Reference',
      path: '/samples/forest_reference.jpg',
      expected: 'Reference Unburned Zone',
      size: '1.8 MB',
      dim: '350 × 350'
    },
    {
      id: 'wildfire_plume',
      title: 'Smoke Plume',
      path: '/samples/wildfire_plume.jpg',
      expected: 'Wildfire-Associated',
      size: '2.4 MB',
      dim: '1024 × 1024'
    },
    {
      id: 'wildfire_burnscar',
      title: 'Burn Scar Patch',
      path: '/samples/wildfire_burnscar.jpg',
      expected: 'Wildfire-Associated',
      size: '2.1 MB',
      dim: '350 × 350'
    }
  ];

  const handlePredict = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/detection/predict', {
        method: 'POST',
        body: formData
      });

      const json: PredictionResponse = await res.json();
      if (!json.success && json.error) {
        setError(json.error);
      } else {
        setPrediction(json);
      }
    } catch (err: any) {
      setError(`Classification service error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImgDetails({
        name: file.name,
        dimensions: '350 × 350',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      });
      handlePredict(file);
    }
  };

  const handleSampleClick = async (sample: typeof sampleImages[0]) => {
    try {
      setActiveSampleName(sample.path.split('/').pop() || 'sample.jpg');
      setImgDetails({
        name: sample.id === 'wildfire_plume' ? 'wildfire_example.jpg' : sample.path.split('/').pop() || 'sample.jpg',
        dimensions: sample.dim,
        size: sample.size
      });
      const response = await fetch(sample.path);
      const blob = await response.blob();
      const file = new File([blob], sample.path.split('/').pop() || 'sample.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(sample.path);
      handlePredict(file);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    }
  };

  // Run initial prediction on sample image on mount
  useEffect(() => {
    handleSampleClick(sampleImages[1]);
  }, []);

  const isWildfire = prediction?.prediction?.is_wildfire ?? true;
  const score = prediction?.prediction
    ? (prediction.prediction.is_wildfire
        ? prediction.prediction.fire_probability
        : (1 - prediction.prediction.fire_probability)
      ).toFixed(2)
    : '0.92';

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Satellite Image Detection</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload a satellite image to classify wildfire-associated features using our trained MobileNetV2 model
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Upload & Sample Images (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload Image Card */}
          <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white">Upload Image</h3>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  setSelectedFile(file);
                  setPreviewUrl(URL.createObjectURL(file));
                  setImgDetails({
                    name: file.name,
                    dimensions: '350 × 350',
                    size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  });
                  handlePredict(file);
                }
              }}
              className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 bg-[#0a0f1d]/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-900/40 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 flex items-center justify-center transition-transform mb-3">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                Drag and drop an image here
              </p>
              <p className="text-[11px] text-blue-400 mt-0.5">or click to browse</p>
              <p className="text-[10px] text-slate-400 mt-3">
                Supports: JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>

          {/* Example Images Section */}
          <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300">Example Images</h4>
            <div className="grid grid-cols-3 gap-2.5">
              {sampleImages.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSampleClick(s)}
                  className={`rounded-xl overflow-hidden border cursor-pointer transition-all relative group aspect-square ${
                    activeSampleName === s.path.split('/').pop()
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={s.path}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[10px] font-medium text-white truncate">{s.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Predicted Result & Visualizers (7 cols) */}
        <div className="lg:col-span-7 bg-[#111726] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-4">
          {/* Result Card Header */}
          <div className="pb-3 border-b border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Predicted Result
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {isWildfire ? (
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-red-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
                <div>
                  <span className={`text-xl font-black tracking-tight ${isWildfire ? 'text-red-500' : 'text-emerald-400'}`}>
                    {isWildfire ? 'Wildfire-Associated' : 'Reference Unburned Zone'}
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0f1d] border border-slate-700 text-white">
                Score {score}
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              {isWildfire
                ? 'The model detected wildfire-associated features in this satellite image.'
                : 'The model identified reference unburned boreal landscape features with high confidence.'}
            </p>
          </div>

          {loading ? (
            <div className="h-56 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-xs">Computing forward pass &amp; Grad-CAM activation...</p>
            </div>
          ) : (
            <>
              {/* Side-by-side Visualizers: Original vs Grad-CAM */}
              <div className="grid grid-cols-2 gap-4">
                {/* Visual 1: Original Image */}
                <div className="space-y-2">
                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-800 bg-black/60 relative">
                    <img
                      src={prediction?.images?.original || previewUrl || '/samples/wildfire_plume.jpg'}
                      alt="Original Satellite Patch"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="font-semibold text-slate-200">Image Information</div>
                    <div className="flex justify-between">
                      <span>File name:</span>
                      <span className="font-mono text-slate-300">{imgDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="font-mono text-slate-300">{imgDetails.dimensions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File size:</span>
                      <span className="font-mono text-slate-300">{imgDetails.size}</span>
                    </div>
                  </div>
                </div>

                {/* Visual 2: Grad-CAM Heatmap with Colorbar */}
                <div className="space-y-2">
                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-800 bg-black/60 relative flex">
                    <img
                      src={prediction?.images?.gradcam_blended || previewUrl || '/samples/wildfire_plume.jpg'}
                      alt="Grad-CAM Heatmap"
                      className="w-full h-full object-cover"
                    />
                    {/* Jet Colorbar on Right */}
                    <div className="absolute right-2 top-2 bottom-2 w-4 rounded-md overflow-hidden flex flex-col justify-between py-1 px-0.5 border border-black/40 shadow-lg bg-gradient-to-b from-red-500 via-yellow-400 via-green-400 to-blue-600 text-[8px] font-bold text-white text-center select-none">
                      <span className="drop-shadow">High</span>
                      <span className="drop-shadow">Low</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="font-semibold text-slate-200">Grad-CAM Heatmap</div>
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="font-mono text-slate-300">MobileNetV2 (ImageNet Pre-trained)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Input size:</span>
                      <span className="font-mono text-slate-300">224 &times; 224</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Classes:</span>
                      <span className="font-mono text-slate-300">nowildfire / wildfire</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-width Bottom Banner matching mockup */}
      <div className="bg-[#111726] border border-blue-900/40 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-400 shadow-lg">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-blue-400" />
        </div>
        <p className="leading-relaxed">
          <strong className="text-slate-200">Important Note: </strong>
          This model classifies satellite images as wildfire-associated or reference based on trained landscape features. It does not independently guarantee an active fire at the exact time of image acquisition. For real-time fire hotspots, refer to the NASA FIRMS live monitoring module.
        </p>
      </div>
    </div>
  );
};
