import React from 'react';
import { Globe, MapPin, Phone, Sparkles, Star, Tag } from 'lucide-react';
import { IndianRegionCategory, Restaurant } from '../types/restaurant';
import { getRegionStyle, REGION_STYLES } from '../utils/regions';
import { QuickFilter } from './SidebarRail';

interface AccessibleGridViewProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (r: Restaurant) => void;
  selectedRegion: IndianRegionCategory | 'all';
  onSelectRegion: (r: IndianRegionCategory | 'all') => void;
  quickFilter: QuickFilter;
  onSelectQuickFilter: (f: QuickFilter) => void;
  cityLabel: string;
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

export const AccessibleGridView: React.FC<AccessibleGridViewProps> = ({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  selectedRegion,
  onSelectRegion,
  quickFilter,
  onSelectQuickFilter,
  cityLabel,
}) => {
  return (
    <main
      id="main-content"
      className="min-h-screen pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      style={{ paddingTop: 'calc(var(--hud-top, 120px) + 16px)' }}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {cityLabel === 'All Bavaria'
              ? 'Authentic Indian Kitchens Across Bavaria'
              : `Authentic Indian Kitchens in ${cityLabel}`}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Accessible keyboard-first directory · {restaurants.length} open &amp; verified Indian kitchens (Pakistani/closed venues excluded)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by Indian regional cuisine"
            value={selectedRegion}
            onChange={(e) => onSelectRegion(e.target.value as IndianRegionCategory | 'all')}
            className="px-3 py-2 rounded-xl text-xs font-semibold border"
            style={{
              background: 'var(--bg-surface-solid)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <option value="all">All Indian Regions</option>
            {(Object.keys(REGION_STYLES) as IndianRegionCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {REGION_STYLES[cat].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Quick category filters">
        {QUICK_FILTERS.map((f) => {
          const active = quickFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectQuickFilter(f.id)}
              aria-pressed={active}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
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

      {/* Cards Grid */}
      {restaurants.length === 0 ? (
        <div
          className="p-10 rounded-3xl border text-center"
          style={{ background: 'var(--bg-surface-solid)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-base font-bold">No matching kitchens found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Try clearing your search or selecting “All Bavaria”.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((r) => {
            const region = getRegionStyle(r.regionCategory);
            const isSelected = selectedRestaurant?.id === r.id;
            return (
              <article
                key={r.id}
                className="rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-shadow"
                style={{
                  background: 'var(--bg-surface-solid)',
                  borderColor: isSelected ? region.color : 'var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5"
                        style={{ background: region.bgSoft, color: region.color }}
                      >
                        {r.indianState}
                      </span>
                      <h2 className="font-display text-lg font-bold leading-snug">{r.name}</h2>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{r.address}</span>
                      </p>
                    </div>
                    {typeof r.googleRating === 'number' ? (
                      <div
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-xl font-mono-data text-xs font-bold"
                        style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-amber-gold)' }}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {r.googleRating.toFixed(1)}
                      </div>
                    ) : (
                      <span
                        className="shrink-0 inline-flex items-center px-2 py-1 rounded-xl font-mono-data text-[10px] font-semibold"
                        style={{ background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald)' }}
                      >
                        Open · OSM
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    “{r.positiveReviews[0]?.quote}”
                  </p>

                  {r.signatureDishes[0] && (
                    <div
                      className="p-2.5 rounded-xl text-xs"
                      style={{ background: 'var(--bg-subtle)' }}
                    >
                      <span className="font-bold" style={{ color: 'var(--accent-saffron)' }}>
                        Must-try:
                      </span>{' '}
                      <span className="font-semibold">{r.signatureDishes[0].name}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {r.isNewSpot && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ background: 'var(--accent-crimson-soft)', color: 'var(--accent-crimson)' }}
                      >
                        New &amp; Rising
                      </span>
                    )}
                    {r.ongoingOffer && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald)' }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {r.ongoingOffer.title}
                      </span>
                    )}
                    {r.isSeasonalWinterPick && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Winter Pick
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    {r.phone && (
                      <a
                        href={`tel:${r.phone.replace(/\s+/g, '')}`}
                        aria-label={`Call ${r.name}`}
                        className="p-2 rounded-xl border no-underline"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a
                      href={r.website || `https://www.google.com/search?q=${encodeURIComponent(`${r.name} ${r.city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit website or search for ${r.name}`}
                      className="p-2 rounded-xl border no-underline"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(r)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    style={{ background: 'var(--accent-saffron)', color: '#1C1917' }}
                  >
                    Inspect Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};
