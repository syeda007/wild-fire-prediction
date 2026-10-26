import React, { useState, useEffect, useRef } from 'react';
import type {
  HistoricalMetadata,
  HistoricalObservationsResponse,
  HistoricalTrendsResponse,
  TimelineDay
} from '../types';
import { MapViewer } from './MapViewer';
import {
  Play,
  Pause,
  AlertTriangle,
  Flame,
  Zap,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const HistoricalReplayView: React.FC = () => {
  const [metadata, setMetadata] = useState<HistoricalMetadata | null>(null);
  const [trends, setTrends] = useState<HistoricalTrendsResponse | null>(null);
  const [observations, setObservations] = useState<HistoricalObservationsResponse | null>(null);

  // Playback state
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(14); // Default ~Jun 15
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [predefinedEvent, setPredefinedEvent] = useState<string>('quebec_2023');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // 1. Fetch Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('/api/historical/metadata');
        const json: HistoricalMetadata = await res.json();
        setMetadata(json);
      } catch (err: any) {
        setError(`Failed to load historical metadata: ${err.message}`);
      }
    };
    fetchMetadata();
  }, []);

  // 2. Fetch Trends
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await fetch('/api/historical/trends');
        const json: HistoricalTrendsResponse = await res.json();
        setTrends(json);
      } catch (err: any) {
        console.error('Failed to load trends:', err);
      }
    };
    fetchTrends();
  }, []);

  const datesList = metadata?.distinct_dates || [];
  const currentDate = datesList[selectedDateIndex] || '2023-06-15';

  // 3. Fetch Observations for current date
  const fetchObservations = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historical/observations?date=${date}&cumulative=false&max_points=2500`);
      const json: HistoricalObservationsResponse = await res.json();
      setObservations(json);
    } catch (err: any) {
      console.error('Failed to load observations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (datesList.length > 0 && currentDate) {
      fetchObservations(currentDate);
    }
  }, [selectedDateIndex, datesList.length]);

  // 4. Playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(300, 1500 / playbackSpeed);
      timerRef.current = window.setInterval(() => {
        setSelectedDateIndex((prev) => {
          if (prev >= datesList.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, datesList.length]);

  // Daily summary stats for current date
  const currentDayStats = trends?.timeline?.find((t) => t.date === currentDate);
  const dailyHotspots = observations?.total_detections_in_period || currentDayStats?.daily_count || 482;
  const dailyFRP_GW = currentDayStats ? (currentDayStats.total_frp / 1000).toFixed(1) : '89.3';

  // Format date display (e.g. Jun 15, 2023)
  const formatFriendlyDate = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  // Format chart ticks
  const chartData = (trends?.timeline || []).map((t: TimelineDay) => ({
    date: t.date.slice(5), // "06-01"
    fullDate: t.date,
    count: t.daily_count,
    frp_gw: Number((t.total_frp / 1000).toFixed(1))
  }));

  return (
    <div className="space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Historical Wildfire Replay</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore actual NASA FIRMS observations from the 2023 Canadian wildfire season
          </p>
        </div>

        {/* Right Event Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-[11px] text-slate-400 font-medium hidden sm:inline">Predefined Event</label>
          <select
            value={predefinedEvent}
            onChange={(e) => setPredefinedEvent(e.target.value)}
            className="bg-[#111726] border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="quebec_2023">2023 Canadian Wildfires (Quebec)</option>
            <option value="peak_surge">Peak Surge (June 1 &ndash; June 10, 2023)</option>
          </select>
        </div>
      </div>

      {/* Main Top Section: Map + Replay Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {/* Left Map Container (takes 3 cols) */}
        <div className="lg:col-span-3 h-[490px] relative">
          <MapViewer
            center={[52.0, -72.0]}
            zoom={5.2}
            hotspots={observations?.hotspots || []}
            mode="historical"
            selectedDate={currentDate}
            scaleText="200 km"
          />
        </div>

        {/* Right Replay Controls Card (takes 1 col) */}
        <div className="lg:col-span-1 bg-[#111726] border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-3.5">
            {/* Date Range Display */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date Range</label>
              <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono flex items-center justify-between">
                <span>Jun 1, 2023 &ndash; Jul 23, 2023</span>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Play / Pause Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsPlaying(true)}
                className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                  isPlaying
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </button>

              <button
                onClick={() => setIsPlaying(false)}
                className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                  !isPlaying
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-[#0a0f1d] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            </div>

            {/* Playback Speed Controls */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-400">Playback Speed</label>
                <span className="text-[11px] font-mono text-blue-400 font-bold">{playbackSpeed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 bg-[#0a0f1d] p-1 rounded-xl border border-slate-800">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`py-1 text-xs rounded-lg font-semibold transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current Date & Stats Box */}
          <div className="bg-[#0a0f1d] border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="text-sm font-bold text-white flex items-center justify-between">
              <span>Date: {formatFriendlyDate(currentDate)}</span>
              {loading && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>}
            </div>
            <div className="text-xs text-slate-300 flex items-center justify-between">
              <span>Daily Hotspots:</span>
              <span className="font-mono font-bold text-orange-400">{dailyHotspots.toLocaleString()}</span>
            </div>
            <div className="text-xs text-slate-300 flex items-center justify-between">
              <span>Total FRP:</span>
              <span className="font-mono font-bold text-amber-400">{dailyFRP_GW} GW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Slider Bar (Spans full width) */}
      <div className="bg-[#111726] border border-slate-800/90 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span>Jun 1, 2023</span>
          <span className="text-white font-bold text-xs bg-blue-600/20 px-2.5 py-0.5 rounded-full border border-blue-500/30">
            {formatFriendlyDate(currentDate)}
          </span>
          <span>Jul 23, 2023</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, datesList.length - 1)}
          value={selectedDateIndex}
          onChange={(e) => {
            setSelectedDateIndex(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bottom Row: Two Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Chart: Daily Hotspot Count (Quebec, 2023) */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center space-x-2">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Daily Hotspot Count (Quebec, 2023)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Peak Surge: Jun 3</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} interval={6} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" name="Hotspots" fill="#f97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Total Fire Radiative Power (GW) */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-red-400" />
              <span>Total Fire Radiative Power (GW)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Thermal Flux Intensity</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="frpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} interval={6} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="frp_gw"
                  name="Total FRP (GW)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#frpGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
