import React, { useState, useEffect } from 'react';
import type { LiveFirmsResponse } from '../types';
import { MapViewer } from './MapViewer';
import {
  Flame,
  Clock,
  Calendar,
  Satellite,
  Target,
  Zap,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const LiveMonitoringView: React.FC = () => {
  const [data, setData] = useState<LiveFirmsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<string>('canada_all');
  const [source, setSource] = useState<string>('VIIRS_SNPP_NRT');
  const [dateRange, setDateRange] = useState<string>('3');
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  const fetchLiveHotspots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/firms/live?region=${region}&source=${source}&days=${dateRange}`);
      const json: LiveFirmsResponse = await res.json();
      if (!json.success && json.error) {
        setError(json.error);
      } else {
        setData(json);
        setLastFetchTime(json.summary?.last_updated || new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
      }
    } catch (err: any) {
      setError(`Failed to connect to backend NASA FIRMS service: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveHotspots();
  }, [region, source, dateRange]);

  // Real statistics derived directly from NASA FIRMS payload
  const activeCount = data ? data.count : 0;
  const highConfCount = data ? data.summary.confidence_breakdown.high : 0;
  // Calculate Total FRP in GW: sum of all FRP (MW) / 1000
  const totalFRP_GW = data && data.count > 0
    ? ((data.count * (data.summary.mean_frp || 0)) / 1000).toFixed(1)
    : '0.0';

  // Latest NASA Satellite pass timestamp from payload
  const latestSatPass = data && data.hotspots.length > 0
    ? `${data.hotspots[0].acq_date} ${data.hotspots[0].acq_time} UTC`
    : null;

  return (
    <div className="space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Live Wildfire Monitoring</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real satellite-detected hotspots from NASA FIRMS (VIIRS &amp; MODIS)
          </p>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 bg-[#111726] border border-slate-800 px-3 py-1.5 rounded-full text-[11px] text-slate-300 font-mono shadow-sm">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {lastFetchTime ? `Fetched: ${lastFetchTime}` : 'Fetching live feed...'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live FIRMS Feed</span>
          </div>
        </div>
      </div>

      {/* Main Top Section: Map + Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {/* Left Map Container (takes 3 cols) */}
        <div className="lg:col-span-3 h-[490px] relative">
          <MapViewer
            center={data?.center || [54.5, -95.0]}
            zoom={data?.zoom || 4}
            hotspots={data?.hotspots || []}
            mode="live"
            scaleText="500 km"
          />
        </div>

        {/* Right Controls & Quick Metrics Card (takes 1 col) */}
        <div className="lg:col-span-1 bg-[#111726] border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-3.5">
            {/* Region Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="canada_all">Canada (All)</option>
                <option value="quebec_canada">Quebec (Boreal Forest)</option>
                <option value="us_west">United States (West Coast)</option>
                <option value="mediterranean">Mediterranean Basin</option>
                <option value="australia">Australia (Southeast)</option>
              </select>
            </div>

            {/* Date Range Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date Range</label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none pr-8 cursor-pointer"
                >
                  <option value="5">Last 5 Days (Max)</option>
                  <option value="3">Last 3 Days</option>
                  <option value="1">Last 24 Hours</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Satellite Source Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Satellite Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="VIIRS_SNPP_NRT">VIIRS (S-NPP + NOAA-20)</option>
                <option value="MODIS_NRT">MODIS (Terra + Aqua)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchLiveHotspots}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Querying NASA FIRMS...' : 'Refresh Data'}</span>
            </button>
          </div>

          {/* Embedded Metric Cards inside Controls Box */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            {/* Stat 1: Active Hotspots */}
            <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/70 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white leading-none">
                  {loading ? '...' : activeCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Active Hotspots</div>
                <div className="text-[10px] text-orange-400 font-medium mt-0.5">
                  {latestSatPass ? `Pass: ${latestSatPass}` : 'NASA VIIRS Observation'}
                </div>
              </div>
            </div>

            {/* Stat 2: Total FRP */}
            <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/70 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white leading-none">
                  {loading ? '...' : totalFRP_GW}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Total FRP (GW)</div>
                <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                  {data?.summary.mean_frp ? `Mean: ${data.summary.mean_frp} MW` : 'Radiative Power'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Zero count notification if region has 0 detections */}
      {!loading && !error && data && data.count === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            0 thermal anomalies detected in {data.region_name} over the last {dateRange} {dateRange === '1' ? 'day' : 'days'}. Try selecting a broader region or increasing the lookback range.
          </span>
        </div>
      )}

      {/* Bottom Metric Cards: 4 across */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Active Hotspots */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white leading-tight">
              {loading ? '...' : activeCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">Active Hotspots</div>
          </div>
        </div>

        {/* Card 2: High Confidence */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white leading-tight">
              {loading ? '...' : highConfCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">High Confidence (&gt;80%)</div>
          </div>
        </div>

        {/* Card 3: Total FRP */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white leading-tight">
              {loading ? '...' : `${totalFRP_GW} GW`}
            </div>
            <div className="text-xs text-slate-400 font-medium">Total Fire Radiative Power</div>
          </div>
        </div>

        {/* Card 4: Satellite Sources */}
        <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Satellite className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white leading-tight">2</div>
              <div className="text-xs text-slate-400 font-medium">Satellite Sources</div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Real-time Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};
