import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Star,
  Tag,
} from 'lucide-react';
import { IndianRegionCategory, Restaurant } from '../types/restaurant';
import { getRegionStyle, REGION_STYLES } from '../utils/regions';

export type QuickFilter =
  | 'all'
  | 'new'
  | 'offers'
  | 'seasonal'
  | 'street-food'
  | 'fine-dining'
  | 'pure-veg';

interface SidebarRailProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (r: Restaurant) => void;
  selectedRegion: IndianRegionCategory | 'all';
  onSelectRegion: (region: IndianRegionCategory | 'all') => void;
  quickFilter: QuickFilter;
  onSelectQuickFilter: (f: QuickFilter) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  cityLabel: string;
  hasInspectorOpen?: boolean;
}

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'All Verified' },
  { id: 'new', label: 'New & Rising' },
  { id: 'offers', label: 'Lunch Offers' },
  { id: 'seasonal', label: 'Winter Picks' },
  { id: 'street-food', label: 'Street Food' },
  { id: 'fine-dining', label: 'Fine Dining' },
  { id: 'pure-veg', label: '100% Veg' },
];

export const SidebarRail: React.FC<SidebarRailProps> = ({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  selectedRegion,
  onSelectRegion,
  quickFilter,
  onSelectQuickFilter,
  isCollapsed,
  onToggleCollapse,
  cityLabel,
  hasInspectorOpen = false,
}) => {
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    setVisibleCount(60);
  }, [restaurants]);

  const visibleRestaurants = restaurants.slice(0, visibleCount);
  const remainingCount = restaurants.length - visibleRestaurants.length;

  if (isCollapsed) {
    return (
      <aside
        className={`fixed left-3 z-20 hidden ${hasInspectorOpen ? 'lg:block' : 'md:block'}`}
        style={{ top: 'var(--hud-top, 120px)' }}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand restaurant list sidebar"
          className="glass-panel px-3 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-semibold cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <ChevronRight className="w-4 h-4" />
          <span>{restaurants.length} Spots</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Filtered Bavarian Indian restaurants"
      className={`fixed left-3 bottom-14 w-[320px] lg:w-[335px] max-w-[calc(100vw-24px)] z-20 hidden ${
        hasInspectorOpen ? 'lg:flex' : 'md:flex'
      } flex-col glass-panel rounded-2xl overflow-hidden`}
      style={{ top: 'var(--hud-top, 120px)' }}
    >
      {/* Header & Collapse */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="font-display text-base font-bold leading-tight">
            {cityLabel === 'All Bavaria' ? 'All Bavaria' : `${cityLabel} Kitchens`}
          </h2>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {restaurants.length} open &amp; verified Indian kitchens
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse restaurant sidebar"
          className="p-1.5 rounded-lg hover:opacity-80 cursor-pointer"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div
        className="px-3.5 py-2.5 border-b space-y-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => {
            const active = quickFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectQuickFilter(f.id)}
                aria-pressed={active}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                style={{
                  background: active ? 'var(--text-primary)' : 'var(--bg-subtle)',
                  color: active ? 'var(--bg-canvas)' : 'var(--text-secondary)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Indian Region Filter */}
        <select
          aria-label="Filter by Indian regional cuisine"
          value={selectedRegion}
          onChange={(e) => onSelectRegion(e.target.value as IndianRegionCategory | 'all')}
          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer"
          style={{
            background: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <option value="all">All Indian Regions &amp; States</option>
          {(Object.keys(REGION_STYLES) as IndianRegionCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {REGION_STYLES[cat].label}
            </option>
          ))}
        </select>
      </div>

      {/* Scrollable Restaurant Cards */}
      <div className="flex-1 overflow-y-auto custom-scroll p-2.5 space-y-2">
        {restaurants.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-sm font-semibold">No matching kitchens found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Try switching to “All Bavaria” or clearing your active filters.
            </p>
          </div>
        ) : (
          <>
          {visibleRestaurants.map((r) => {
            const region = getRegionStyle(r.regionCategory);
            const isSelected = selectedRestaurant?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRestaurant(r)}
                className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer"
                style={{
                  background: isSelected ? 'var(--bg-surface-solid)' : 'transparent',
                  borderColor: isSelected ? region.color : 'var(--border-subtle)',
                  boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold leading-snug">{r.name}</h3>
                      {r.isNewSpot && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase"
                          style={{ background: 'var(--accent-crimson-soft)', color: 'var(--accent-crimson)' }}
                        >
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>
                        {r.city}
                        {r.district ? ` · ${r.district}` : ''}
                      </span>
                    </p>
                  </div>
                  {typeof r.googleRating === 'number' ? (
                    <div
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono-data text-xs font-bold"
                      style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-amber-gold)' }}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      {r.googleRating.toFixed(1)}
                    </div>
                  ) : (
                    <span
                      className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-lg font-mono-data text-[10px] font-semibold"
                      style={{ background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald)' }}
                    >
                      Open · OSM
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: region.bgSoft, color: region.color }}
                  >
                    {r.indianState}
                  </span>
                  {r.ongoingOffer && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald)' }}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      Offer
                    </span>
                  )}
                  {r.isSeasonalWinterPick && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Winter
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 60)}
              className="w-full py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-opacity hover:opacity-85"
              style={{
                background: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Show 60 more ({remainingCount} remaining)
            </button>
          )}
          </>
        )}
      </div>
    </aside>
  );
};
