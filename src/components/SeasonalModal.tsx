import React, { useEffect, useRef } from 'react';
import { MapPin, Sparkles, Tag, X } from 'lucide-react';
import { SEASONAL_SPOTLIGHTS } from '../data/delicacies';
import { Restaurant } from '../types/restaurant';

interface SeasonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  onPickRestaurant: (restaurant: Restaurant) => void;
}

export const SeasonalModal: React.FC<SeasonalModalProps> = ({
  isOpen,
  onClose,
  restaurants,
  onPickRestaurant,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const offerRestaurants = restaurants.filter((r) => Boolean(r.ongoingOffer));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13, 15, 18, 0.62)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seasonal-modal-title"
        className="glass-panel-solid w-full max-w-3xl max-h-[90dvh] rounded-3xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 sm:px-6 py-4 sm:py-5 border-b flex items-start justify-between gap-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-2"
              style={{ background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bavarian Seasonal Picks, Offers &amp; New Spots</span>
            </div>
            <h2 id="seasonal-modal-title" className="font-display text-2xl font-bold leading-tight">
              What’s Hot &amp; Worth Ordering Right Now
            </h2>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Winter warming broths, weekday Mittagsmenü deals, and rising regional kitchens across Munich and Bavaria.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close seasonal recommendations"
            className="touch-target p-2 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-5">
          {/* Curated Seasonal Collections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEASONAL_SPOTLIGHTS.map((item) => {
              const spots = restaurants.filter((r) => item.restaurantIds.includes(r.id));
              return (
                <article
                  key={item.id}
                  className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="space-y-2">
                    <span
                      className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}
                    >
                      {item.seasonTag}
                    </span>
                    <h3 className="font-display text-base font-bold leading-snug">{item.title}</h3>
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent-saffron)' }}>
                      Try: {item.dishFocus}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.whyNowInBavaria}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {spots.map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          onPickRestaurant(spot);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-transform hover:scale-[1.03]"
                        style={{
                          background: 'var(--bg-surface-solid)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <MapPin className="w-3 h-3" style={{ color: 'var(--accent-saffron)' }} />
                        <span>{spot.name}</span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Active Offers List */}
          <section aria-label="Active weekday offers and specials" className="space-y-2.5">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
              <span>Ongoing Lunch &amp; Thali Specials</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offerRestaurants.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onPickRestaurant(r);
                    onClose();
                  }}
                  className="text-left p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: 'var(--accent-emerald-soft)',
                    borderColor: 'rgba(15, 118, 110, 0.3)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{r.name}</span>
                    <span className="text-[11px] font-mono-data" style={{ color: 'var(--text-muted)' }}>
                      {r.city}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mt-1" style={{ color: 'var(--accent-emerald)' }}>
                    {r.ongoingOffer?.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {r.ongoingOffer?.details}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
