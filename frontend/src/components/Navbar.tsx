import React from 'react';
import { Flame, History, Eye, BarChart3, Radio, ShieldCheck, Database } from 'lucide-react';

export type NavTab = 'live' | 'historical' | 'detection' | 'analytics';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  systemStatus: {
    online: boolean;
    nasaConfigured: boolean;
    mobilenetLoaded: boolean;
    historicalRecords: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, systemStatus }) => {
  return (
    <header className="bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('live')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white tracking-tight">WILD-INTEL</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  AI + NASA FIRMS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Satellite Wildfire Intelligence Platform</p>
            </div>
          </div>

          {/* Navigation Options */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectTab('live')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentTab === 'live'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Live Monitoring</span>
            </button>

            <button
              onClick={() => onSelectTab('historical')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentTab === 'historical'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historical Replay</span>
            </button>

            <button
              onClick={() => onSelectTab('detection')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentTab === 'detection'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>AI Image Detection</span>
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Metrics</span>
            </button>
          </nav>

          {/* System Status Indicators */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium">Backend Ready</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400" title="Suomi-NPP VIIRS Archive Loaded">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium">{systemStatus.historicalRecords > 0 ? `${(systemStatus.historicalRecords/1000).toFixed(0)}k Archive` : 'Archive'}</span>
            </div>
            
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400" title="Trained MobileNetV2 Active">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">MobileNetV2</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
