import React from 'react';
import {
  Compass,
  Layers,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { IndianRegionCategory } from '../types/restaurant';
import { REGION_STYLES } from '../utils/regions';

interface MapControlsProps {
  pitchMode: '3d' | '2d';
  onTogglePitch: () => void;
  isOrbiting: boolean;
  onToggleOrbit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetMunich: () => void;
  hasInspectorOpen: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  pitchMode,
  onTogglePitch,
  isOrbiting,
  onToggleOrbit,
  onZoomIn,
  onZoomOut,
  onResetMunich,
  hasInspectorOpen,
}) => {
  const categories = Object.keys(REGION_STYLES) as IndianRegionCategory[];

  return (
    <>
      {/* Bottom-Left Compact Regional Legend */}
      <div
        aria-label="Indian regional cuisine map legend"
        className="fixed bottom-3 left-3 z-20 hidden sm:flex items-center gap-2.5 flex-wrap glass-panel px-3 py-2 rounded-2xl max-w-[calc(100vw-240px)]"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Regions
        </span>
        {categories.map((cat) => (
          <div key={cat} className="inline-flex items-center gap-1.5 text-[11px] font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: REGION_STYLES[cat].color }}
              aria-hidden="true"
            />
            <span>{REGION_STYLES[cat].shortLabel}</span>
          </div>
        ))}
      </div>

      {/* Bottom-Right 3D Aerial Controls */}
      <div
        className={`fixed bottom-12 z-20 flex flex-col gap-1.5 transition-all ${
          hasInspectorOpen ? 'right-[420px] hidden lg:flex' : 'right-3'
        }`}
        role="group"
        aria-label="3D aerial map controls"
      >
        <div className="glass-panel rounded-2xl p-1.5 flex flex-col gap-1">
          <button
            type="button"
            onClick={onTogglePitch}
            aria-pressed={pitchMode === '3d'}
            title={pitchMode === '3d' ? 'Switch to 2D Top-Down' : 'Switch to 3D Aerial Tilt'}
            className="px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            style={{
              background: pitchMode === '3d' ? 'var(--accent-saffron-soft)' : 'transparent',
              color: pitchMode === '3d' ? 'var(--accent-saffron)' : 'var(--text-primary)',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{pitchMode === '3d' ? '3D' : '2D'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleOrbit}
            aria-pressed={isOrbiting}
            title={isOrbiting ? 'Pause 360° Aerial Orbit' : 'Start 360° Aerial Orbit'}
            className="px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            style={{
              background: isOrbiting ? 'var(--accent-crimson-soft)' : 'transparent',
              color: isOrbiting ? 'var(--accent-crimson)' : 'var(--text-primary)',
            }}
          >
            <Compass className={`w-3.5 h-3.5 ${isOrbiting ? 'animate-spin' : ''}`} />
            <span>Orbit</span>
          </button>
        </div>

        <div className="glass-panel rounded-2xl p-1.5 flex flex-col gap-1">
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in map"
            className="p-2 rounded-xl hover:opacity-80 cursor-pointer flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out map"
            className="p-2 rounded-xl hover:opacity-80 cursor-pointer flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onResetMunich}
            aria-label="Reset aerial camera to Munich"
            title="Reset to Munich Aerial View"
            className="p-2 rounded-xl hover:opacity-80 cursor-pointer flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
