import React, { useState, useEffect } from 'react';
import type { ModelEvaluationResponse } from '../types';
import {
  ArrowUpRight,
  TrendingDown,
  Zap,
  Layers,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const [_data, setData] = useState<ModelEvaluationResponse | null>(null);

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const res = await fetch('/api/analytics/model-evaluation');
        const json: ModelEvaluationResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load evaluation metrics:', err);
      }
    };
    fetchEvaluation();
  }, []);

  // Multi-curve Accuracy data (Epoch 0 to 20) matching the mockup
  const accuracyTrainingData = [
    { epoch: 0, 'MobileNetV2 (Train)': 0.58, 'MobileNetV2 (Val)': 0.56, 'CNN (Train)': 0.52, 'CNN (Val)': 0.50 },
    { epoch: 2, 'MobileNetV2 (Train)': 0.81, 'MobileNetV2 (Val)': 0.79, 'CNN (Train)': 0.73, 'CNN (Val)': 0.71 },
    { epoch: 4, 'MobileNetV2 (Train)': 0.89, 'MobileNetV2 (Val)': 0.88, 'CNN (Train)': 0.82, 'CNN (Val)': 0.80 },
    { epoch: 6, 'MobileNetV2 (Train)': 0.93, 'MobileNetV2 (Val)': 0.91, 'CNN (Train)': 0.86, 'CNN (Val)': 0.84 },
    { epoch: 8, 'MobileNetV2 (Train)': 0.94, 'MobileNetV2 (Val)': 0.93, 'CNN (Train)': 0.88, 'CNN (Val)': 0.85 },
    { epoch: 10, 'MobileNetV2 (Train)': 0.95, 'MobileNetV2 (Val)': 0.94, 'CNN (Train)': 0.89, 'CNN (Val)': 0.87 },
    { epoch: 12, 'MobileNetV2 (Train)': 0.96, 'MobileNetV2 (Val)': 0.95, 'CNN (Train)': 0.90, 'CNN (Val)': 0.88 },
    { epoch: 14, 'MobileNetV2 (Train)': 0.965, 'MobileNetV2 (Val)': 0.958, 'CNN (Train)': 0.91, 'CNN (Val)': 0.89 },
    { epoch: 16, 'MobileNetV2 (Train)': 0.97, 'MobileNetV2 (Val)': 0.962, 'CNN (Train)': 0.915, 'CNN (Val)': 0.90 },
    { epoch: 18, 'MobileNetV2 (Train)': 0.972, 'MobileNetV2 (Val)': 0.965, 'CNN (Train)': 0.92, 'CNN (Val)': 0.91 },
    { epoch: 20, 'MobileNetV2 (Train)': 0.975, 'MobileNetV2 (Val)': 0.968, 'CNN (Train)': 0.925, 'CNN (Val)': 0.921 }
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Model Performance &amp; Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Compare model performance, view training metrics and analyze wildfire activity
        </p>
      </div>

      {/* Top KPI Summary Cards: 4 across */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: MobileNetV2 Accuracy */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400">MobileNetV2 Accuracy</div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">96.8%</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Card 2: MobileNetV2 F1-score */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400">MobileNetV2 F1-score</div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">96.5%</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Card 3: CNN Accuracy */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400">CNN Accuracy</div>
            <div className="text-3xl font-extrabold text-cyan-200 mt-1">92.1%</div>
          </div>
          <TrendingDown className="w-5 h-5 text-cyan-400" />
        </div>

        {/* Card 4: CNN F1-score */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400">CNN F1-score</div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">91.3%</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      {/* Middle Row: Training Curves (65%) + Confusion Matrix (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Chart: Training & Validation Accuracy (7 cols) */}
        <div className="lg:col-span-7 bg-[#111726] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-white flex items-center space-x-2">
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <span>Training &amp; Validation Accuracy</span>
            </h3>
            <span className="text-[10px] text-slate-400">20 Epochs &bull; Test Partition</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyTrainingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="epoch" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0.4, 1.0]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                <Line
                  type="monotone"
                  dataKey="MobileNetV2 (Train)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="MobileNetV2 (Val)"
                  stroke="#38bdf8"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="CNN (Train)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="CNN (Val)"
                  stroke="#34d399"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  dot={{ r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Confusion Matrix (MobileNetV2 - Test Set) (5 cols) */}
        <div className="lg:col-span-5 bg-[#111726] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-white">Confusion Matrix (MobileNetV2 - Test Set)</h3>
            <span className="text-[10px] text-slate-400">Total: 6,300</span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            {/* 2x2 Heatmap Matrix */}
            <div className="flex-1">
              <div className="text-[10px] text-center text-slate-400 font-semibold mb-1">
                Predicted
              </div>
              <div className="flex">
                <div className="text-[10px] text-slate-400 font-semibold -rotate-90 flex items-center justify-center w-4 select-none">
                  Actual
                </div>
                <div className="flex-1 space-y-1.5">
                  {/* Row 1: Nowildfire */}
                  <div className="grid grid-cols-2 gap-1.5 text-center text-xs">
                    <div className="bg-[#1e40af] text-white p-3 rounded-xl border border-blue-600/40 font-mono font-bold flex flex-col justify-center shadow-inner">
                      <span className="text-base">2,735</span>
                      <span className="text-[9px] text-blue-200 mt-0.5 font-sans">Nowildfire (TN)</span>
                    </div>
                    <div className="bg-[#1e293b] text-slate-300 p-3 rounded-xl border border-slate-700 font-mono font-semibold flex flex-col justify-center">
                      <span className="text-base text-slate-200">85</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-sans">Wildfire (FP)</span>
                    </div>
                  </div>

                  {/* Row 2: Wildfire */}
                  <div className="grid grid-cols-2 gap-1.5 text-center text-xs">
                    <div className="bg-[#1e293b] text-slate-300 p-3 rounded-xl border border-slate-700 font-mono font-semibold flex flex-col justify-center">
                      <span className="text-base text-slate-200">102</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-sans">Nowildfire (FN)</span>
                    </div>
                    <div className="bg-[#1d4ed8] text-white p-3 rounded-xl border border-blue-500/50 font-mono font-bold flex flex-col justify-center shadow-inner">
                      <span className="text-base">3,378</span>
                      <span className="text-[9px] text-blue-200 mt-0.5 font-sans">Wildfire (TP)</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 text-[10px] text-slate-400 text-center pl-4 mt-1 font-mono">
                <span>Nowildfire</span>
                <span>Wildfire</span>
              </div>
            </div>

            {/* Vertical Color Scale Bar on Right */}
            <div className="h-40 w-5 flex flex-col justify-between items-center text-[9px] font-mono text-slate-400">
              <span>4,000</span>
              <div className="w-2.5 flex-1 mx-auto my-1 rounded-sm bg-gradient-to-b from-[#1d4ed8] via-[#2563eb] to-[#0f172a] border border-slate-700"></div>
              <span>0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Model Comparison Table (70%) + Inference Performance (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Model Comparison Table (8 cols) */}
        <div className="lg:col-span-8 bg-[#111726] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white">Model Comparison (Test Set)</h3>
            <span className="text-[10px] text-slate-400">Comprehensive Metrics</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                  <th className="py-2 px-3">Model</th>
                  <th className="py-2 px-3">Accuracy</th>
                  <th className="py-2 px-3">Precision</th>
                  <th className="py-2 px-3">Recall</th>
                  <th className="py-2 px-3">F1-Score</th>
                  <th className="py-2 px-3">ROC-AUC</th>
                  <th className="py-2 px-3">Model Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                <tr className="hover:bg-slate-800/20 text-slate-200">
                  <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>MobileNetV2</span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">96.8%</td>
                  <td className="py-2.5 px-3">96.9%</td>
                  <td className="py-2.5 px-3">96.1%</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">96.5%</td>
                  <td className="py-2.5 px-3">0.993</td>
                  <td className="py-2.5 px-3 text-slate-400">14.2 MB</td>
                </tr>
                <tr className="hover:bg-slate-800/20 text-slate-300">
                  <td className="py-2.5 px-3 font-sans font-medium flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span>Baseline CNN</span>
                  </td>
                  <td className="py-2.5 px-3">92.1%</td>
                  <td className="py-2.5 px-3">92.4%</td>
                  <td className="py-2.5 px-3">91.2%</td>
                  <td className="py-2.5 px-3">91.8%</td>
                  <td className="py-2.5 px-3">0.965</td>
                  <td className="py-2.5 px-3 text-slate-400">5.6 MB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Inference Performance Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#111726] border border-slate-800/90 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Inference Performance</span>
            </h3>
            <span className="text-[10px] text-slate-400">Latency Benchmarks</span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">GPU Latency</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">~ 45 ms</div>
              <div className="text-[9px] text-slate-400">per image (GPU)</div>
            </div>

            <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">CPU Latency</div>
              <div className="text-lg font-bold text-amber-400 font-mono">~ 320 ms</div>
              <div className="text-[9px] text-slate-400">per image (CPU)</div>
            </div>
          </div>

          <div className="bg-[#0a0f1d] px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Input Resolution:</span>
            </div>
            <span className="font-mono font-bold text-white">224 &times; 224 px</span>
          </div>
        </div>
      </div>
    </div>
  );
};
