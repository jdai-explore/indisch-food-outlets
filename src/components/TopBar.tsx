import React, { useEffect, useRef } from 'react';
import {
  Compass,
  Flame,
  List,
  Map as MapIcon,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { CityPreset } from '../types/restaurant';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  presets: CityPreset[];
  activePreset: CityPreset;
  onSelectPreset: (preset: CityPreset) => void;
  viewMode: 'map' | 'list';
  onToggleViewMode: (mode: 'map' | 'list') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenBeyondClassics: () => void;
  onOpenSeasonal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  presets,
  activePreset,
  onSelectPreset,
  viewMode,
  onToggleViewMode,
  theme,
  onToggleTheme,
  onOpenBeyondClassics,
  onOpenSeasonal,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateOffset = () => {
      const bottom = Math.ceil(el.getBoundingClientRect().bottom + 10);
      document.documentElement.style.setProperty('--hud-top', `${bottom}px`);
    };
    updateOffset();
    const ro = new ResizeObserver(updateOffset);
    ro.observe(el);
    window.addEventListener('resize', updateOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <header ref={headerRef} className="fixed top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-30 flex flex-col gap-2 pointer-events-none">
      {/* Tier 1: Unified Floating Search & Controls Bar */}
      <div className="glass-panel rounded-2xl px-2.5 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-crimson))' }}
            aria-hidden="true"
          >
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold tracking-tight leading-none">
                SpiceAtlas
              </span>
              <span
                className="font-mono-data text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase"
                style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-saffron)' }}
              >
                Bayern
              </span>
            </div>
          </div>
        </div>

        {/* Inline Search */}
        <div className="relative flex-1 min-w-0 md:max-w-md">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search dish, city, or state…"
            aria-label="Search restaurants, Indian states, cities, or signature dishes"
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border transition-colors"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-subtle)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="touch-target absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:opacity-80 cursor-pointer flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop Quiet Discovery Chips (mobile places them in Tier 2 rail) */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenBeyondClassics}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:opacity-85 border"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Flame className="w-3.5 h-3.5" style={{ color: 'var(--accent-crimson)' }} />
            <span>Beyond Butter Chicken</span>
          </button>

          <button
            type="button"
            onClick={onOpenSeasonal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:opacity-85 border"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-emerald)' }} />
            <span>Seasonal &amp; Offers</span>
          </button>
        </div>

        {/* View Mode & Theme Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
          <div
            className="inline-flex p-0.5 rounded-xl border"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => onToggleViewMode('map')}
              aria-pressed={viewMode === 'map'}
              aria-label="3D Map view"
              className="touch-target inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              style={{
                background: viewMode === 'map' ? 'var(--bg-surface-solid)' : 'transparent',
                color: viewMode === 'map' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'map' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">3D Map</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="Accessible List view"
              className="touch-target inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              style={{
                background: viewMode === 'list' ? 'var(--bg-surface-solid)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'list' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Saffron Parchment light mode' : 'Switch to Cardamom Night dark mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="touch-target p-2 rounded-xl border cursor-pointer transition-colors flex items-center justify-center"
            style={{
              background: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tier 2: Single Scrollable Pill Rail with Soft Edge Fade */}
      <nav
        aria-label="Discovery guides and Bavarian city camera jumps"
        className="scroll-fade-x flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto pb-0.5 pr-6"
      >
        {/* Mobile-only quick guide pills inside the same sleek rail */}
        <button
          type="button"
          onClick={onOpenBeyondClassics}
          className="md:hidden shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <Flame className="w-3 h-3" style={{ color: 'var(--accent-crimson)' }} />
          <span>Beyond Classics</span>
        </button>

        <button
          type="button"
          onClick={onOpenSeasonal}
          className="md:hidden shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <Sparkles className="w-3 h-3" style={{ color: 'var(--accent-emerald)' }} />
          <span>Seasonal</span>
        </button>

        <span
          className="md:hidden h-4 w-px shrink-0 mx-0.5"
          style={{ background: 'var(--border-strong)' }}
          aria-hidden="true"
        />

        {presets.map((preset) => {
          const isActive = activePreset.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              aria-pressed={isActive}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
              style={{
                background: isActive ? 'var(--accent-saffron)' : 'var(--bg-surface)',
                color: isActive ? '#1C1917' : 'var(--text-primary)',
                border: `1px solid ${isActive ? 'var(--accent-saffron)' : 'var(--border-subtle)'}`,
                backdropFilter: 'blur(14px)',
                boxShadow: isActive ? '0 4px 14px rgba(217,119,6,0.32)' : 'var(--shadow-card)',
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
