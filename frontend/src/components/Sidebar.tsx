import React from 'react';
import {
  Flame,
  Activity,
  History,
  Scan,
  BarChart2,
  Settings,
  Info,
  X,
  ExternalLink,
  Database,
  Cpu
} from 'lucide-react';

export type NavTab = 'live' | 'historical' | 'detection' | 'analytics';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showAbout: boolean;
  setShowAbout: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  showSettings,
  setShowSettings,
  showAbout,
  setShowAbout
}) => {
  const navItems = [
    { id: 'live' as NavTab, label: 'Live Monitoring', icon: Activity },
    { id: 'historical' as NavTab, label: 'Historical Replay', icon: History },
    { id: 'detection' as NavTab, label: 'AI Image Detection', icon: Scan },
    { id: 'analytics' as NavTab, label: 'Analytics', icon: BarChart2 }
  ];

  return (
    <>
      <aside className="w-60 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none flex-shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 flex items-center space-x-3 border-b border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
              <Flame className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">
                Wildfire Intelligence
              </h1>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                Satellite Data &bull; AI Analysis &bull; Real-time Monitoring
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Menu Items */}
        <div className="p-3 border-t border-slate-800/60 space-y-1">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>About</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">System Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">NASA FIRMS API Key</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400">
                  <span>94851fffe942e07c8ad9a38b131abccd</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Configured in backend/.env</p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">API Cache Policy</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none">
                  <option>15 Minutes (Active Cache to avoid rate limits)</option>
                  <option>30 Minutes</option>
                  <option>Always bypass cache (Direct NASA)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Map Default Basemap</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none">
                  <option>Esri World Imagery (Satellite)</option>
                  <option>CartoDB Dark Canvas</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">About Wildfire Intelligence</h3>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Satellite-Based Wildfire Detection & Monitoring Platform</strong> is a third-year AI/ML engineering project integrating deep learning satellite image classification with NASA FIRMS active fire telemetry.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-400 font-semibold">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>MobileNetV2 ML</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fine-tuned on 42,850 boreal satellite patches with Grad-CAM explainability.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <Database className="w-3.5 h-3.5" />
                    <span>NASA FIRMS VIIRS</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time Area API queries & 650,899 archived 2023 Quebec observations.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Scientific Distinction: </span>
                Optical surface feature classification (burn scars/smoke plumes) is explicitly distinguished from instantaneous thermal radiative anomaly detection (FRP in Megawatts).
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <a
                href="https://firms.modaps.eosdis.nasa.gov/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>NASA FIRMS Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setShowAbout(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
