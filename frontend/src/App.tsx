import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { HistoricalReplayView } from './components/HistoricalReplayView';
import { ImageDetectionView } from './components/ImageDetectionView';
import { AnalyticsView } from './components/AnalyticsView';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('live');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex overflow-hidden">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showAbout={showAbout}
        setShowAbout={setShowAbout}
      />

      {/* Main View Area */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto px-6 py-5 bg-[#0b0f19]">
        <div className="max-w-[1600px] mx-auto">
          {currentTab === 'live' && <LiveMonitoringView />}
          {currentTab === 'historical' && <HistoricalReplayView />}
          {currentTab === 'detection' && <ImageDetectionView />}
          {currentTab === 'analytics' && <AnalyticsView />}
        </div>
      </main>
    </div>
  );
};

export default App;
