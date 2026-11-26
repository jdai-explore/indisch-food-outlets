import React, { useEffect } from 'react';
import { ArrowRight, Flame, MapPin, X } from 'lucide-react';
import { FLAVOR_SWAPS } from '../data/delicacies';
import { Restaurant } from '../types/restaurant';

interface BeyondClassicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  onPickRestaurant: (restaurant: Restaurant) => void;
}

export const BeyondClassicsModal: React.FC<BeyondClassicsModalProps> = ({
  isOpen,
  onClose,
  restaurants,
  onPickRestaurant,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13, 15, 18, 0.62)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="beyond-classics-title"
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
              style={{ background: 'var(--accent-crimson-soft)', color: 'var(--accent-crimson)' }}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Culinary Exploration Guide</span>
            </div>
            <h2 id="beyond-classics-title" className="font-display text-2xl font-bold leading-tight">
              Beyond Butter Chicken, Garlic Naan &amp; Mango Lassi
            </h2>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Whether you’re local to Bavaria, an international guest, or an Indian expat craving home—swap the default order for regional Indian masterpieces.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close flavor swap guide"
            className="p-2 rounded-full cursor-pointer shrink-0"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4">
          {FLAVOR_SWAPS.map((swap) => {
            const matchingSpots = restaurants.filter((r) => swap.restaurantIds.includes(r.id));
            return (
              <article
                key={swap.id}
                className="p-4 rounded-2xl border space-y-3"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg line-through opacity-75 w-fit"
                    style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-muted)' }}
                  >
                    Instead of: {swap.usualOrder}
                  </span>
                  <ArrowRight className="w-4 h-4 hidden sm:block shrink-0" style={{ color: 'var(--accent-saffron)' }} />
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-lg w-fit"
                    style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-amber-gold)' }}
                  >
                    Order: {swap.tryInstead}
                  </span>
                  <span className="text-[11px] font-mono-data sm:ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {swap.region}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why upgrade:</strong> {swap.whyItsBetter}
                </p>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Fly to try it:
                  </span>
                  {matchingSpots.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => {
                        onPickRestaurant(spot);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-transform hover:scale-[1.03]"
                      style={{
                        background: 'var(--bg-surface-solid)',
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <MapPin className="w-3 h-3" style={{ color: 'var(--accent-saffron)' }} />
                      <span>{spot.name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        ({spot.city})
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
