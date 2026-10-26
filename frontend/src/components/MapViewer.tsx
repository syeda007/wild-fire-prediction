import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { Hotspot } from '../types';
import { Layers, Flame, Info } from 'lucide-react';

interface MapViewerProps {
  center: [number, number];
  zoom: number;
  hotspots: Hotspot[];
  mode: 'live' | 'historical';
  selectedDate?: string;
  scaleText?: string;
}

const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

const InvalidateSize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({
  center,
  zoom,
  hotspots,
  scaleText = '500 km'
}) => {
  const [basemap, setBasemap] = useState<'satellite' | 'dark'>('satellite');

  const getMarkerColor = (frp: number | null) => {
    if (frp === null || frp <= 10) return '#fde047'; // 1 - 10 MW (light yellow)
    if (frp <= 100) return '#eab308'; // 10 - 100 MW (yellow-orange)
    if (frp <= 500) return '#f97316'; // 100 - 500 MW (orange-red)
    return '#ef4444'; // > 500 MW (intense red)
  };

  const getMarkerRadius = (frp: number | null) => {
    if (frp === null || frp <= 10) return 3.5;
    if (frp <= 100) return 4.5;
    if (frp <= 500) return 6.5;
    return 8.5;
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#090d16]"
      style={{ height: '490px', minHeight: '490px', width: '100%' }}
    >
      {/* Basemap Toggle Button (Top-Right of Map) */}
      <div className="absolute top-3 right-3 z-[1000] flex bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-slate-700 shadow-xl">
        <button
          onClick={() => setBasemap(basemap === 'satellite' ? 'dark' : 'satellite')}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
          title="Toggle Satellite / Dark Canvas Basemap"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{basemap === 'satellite' ? 'Satellite Imagery' : 'Dark Canvas'}</span>
        </button>
      </div>

      {/* Map Legend Overlay (Bottom-Left) matching mockup */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/80 text-[11px] shadow-2xl min-w-[170px]">
        <div className="font-semibold text-slate-200 mb-2 border-b border-slate-700/60 pb-1 text-[11px]">
          Fire Radiative Power (MW)
        </div>
        <div className="space-y-1.5 font-medium">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow-sm shadow-red-500/50"></span>
            <span className="text-slate-300">&gt; 500</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-sm shadow-orange-500/50"></span>
            <span className="text-slate-300">100 &ndash; 500</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span>
            <span className="text-slate-300">10 &ndash; 100</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#fde047]"></span>
            <span className="text-slate-300">1 &ndash; 10</span>
          </div>
        </div>
      </div>

      {/* Scale Indicator (Bottom-Left next to legend) */}
      <div className="absolute bottom-4 left-[200px] z-[1000] bg-black/75 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono border-b border-l border-r border-slate-400">
        {scaleText}
      </div>

      {/* React Leaflet Map */}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={center} zoom={zoom} />
        <InvalidateSize />

        {basemap === 'satellite' ? (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        ) : (
          <TileLayer
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
        )}

        {/* Hotspot Markers */}
        {hotspots.map((h, i) => {
          const color = getMarkerColor(h.frp);
          const radius = getMarkerRadius(h.frp);

          return (
            <CircleMarker
              key={`${h.lat}_${h.lon}_${h.acq_date}_${h.acq_time}_${i}`}
              center={[h.lat, h.lon]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 1.2
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                    <span className="font-bold text-sm text-amber-400 flex items-center space-x-1">
                      <Flame className="w-4 h-4 text-orange-400 inline" />
                      <span>Thermal Hotspot</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                      {h.confidence} Conf.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                    <div>
                      <p className="text-slate-400 text-[10px]">Coordinates</p>
                      <p className="font-mono">{h.lat.toFixed(4)}°, {h.lon.toFixed(4)}°</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Observation Time</p>
                      <p className="font-mono">{h.acq_date} {h.acq_time} UTC</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Radiative Power (FRP)</p>
                      <p className="font-semibold text-orange-300">{h.frp !== null ? `${h.frp.toFixed(1)} MW` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Sensor / Satellite</p>
                      <p>{h.instrument} ({h.satellite})</p>
                    </div>
                  </div>

                  <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>NASA Satellite Thermal Observation</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
