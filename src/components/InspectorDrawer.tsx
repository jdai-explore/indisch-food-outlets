import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Info,
  MapPin,
  Navigation,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  X,
} from 'lucide-react';
import { Restaurant } from '../types/restaurant';
import { getRegionStyle } from '../utils/regions';
import { safeHttpUrl, safeTelHref } from '../utils/sanitize';

interface InspectorDrawerProps {
  restaurant: Restaurant | null;
  onClose: () => void;
}

function SpiceDots({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Spice level ${level} out of 5`}
      title={`Spice level: ${level}/5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Flame
          key={n}
          className="w-3 h-3"
          style={{
            color: n <= level ? 'var(--accent-crimson)' : 'var(--border-strong)',
            fill: n <= level ? 'var(--accent-crimson)' : 'transparent',
          }}
        />
      ))}
    </span>
  );
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({ restaurant, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [detent, setDetent] = useState<'peek' | 'expanded'>('peek');
  const dragStartY = useRef<number | null>(null);

  // Reset to peek detent when switching restaurants on mobile
  useEffect(() => {
    if (restaurant) setDetent('peek');
  }, [restaurant?.id]);

  // Escape key parity on desktop & keyboard
  useEffect(() => {
    if (!restaurant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [restaurant, onClose]);

  if (!restaurant) return null;

  const region = getRegionStyle(restaurant.regionCategory);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurant.name}, ${restaurant.address}`
  )}`;
  const googleReviewsUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${restaurant.name} ${restaurant.city} Google reviews`
  )}`;

  const safeWebsite = safeHttpUrl(restaurant.website);
  const safeTel = safeTelHref(restaurant.phone);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(restaurant.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored gracefully
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    dragStartY.current = null;
    if (deltaY < -36) {
      setDetent('expanded');
    } else if (deltaY > 48) {
      if (detent === 'expanded') {
        setDetent('peek');
      } else {
        onClose();
      }
    }
  };

  return (
    <>
      {/* Subtle mobile backdrop scrim (only darkened when expanded) */}
      <div
        className={`md:hidden fixed inset-0 z-20 transition-opacity ${
          detent === 'expanded' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(13, 15, 18, 0.35)' }}
        onClick={() => setDetent('peek')}
        aria-hidden="true"
      />

      <aside
        aria-label={`Details for ${restaurant.name}`}
        data-detent={detent}
        className="inspector-sheet safe-bottom-pad fixed inset-x-2 bottom-0 md:inset-x-auto md:right-3 md:bottom-14 w-auto md:w-[380px] lg:w-[400px] z-30 glass-panel-solid rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden"
      >
        {/* Interactive Mobile Grabber Handle */}
        <button
          type="button"
          onClick={() => setDetent((d) => (d === 'peek' ? 'expanded' : 'peek'))}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label={detent === 'peek' ? 'Expand restaurant details sheet' : 'Collapse restaurant details sheet'}
          className="md:hidden w-full flex flex-col items-center pt-2.5 pb-1.5 shrink-0 bg-transparent border-0 cursor-pointer"
        >
          <span
            className="w-10 h-1 rounded-full"
            style={{ background: 'var(--border-strong)' }}
          />
        </button>

        {/* Header */}
        <div
          className="px-4 sm:px-5 pt-1 pb-3.5 md:py-4 border-b relative shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close restaurant details"
            className="touch-target absolute top-1 md:top-3.5 right-3.5 p-2 rounded-full cursor-pointer transition-colors flex items-center justify-center"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 flex-wrap pr-11">
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: region.bgSoft, color: region.color }}
            >
              {restaurant.indianState}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald)' }}
            >
              <ShieldCheck className="w-3 h-3" />
              Verified Open
            </span>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold mt-2 leading-tight pr-8">
            {restaurant.name}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {restaurant.cuisineStyle}
          </p>

          {/* Rating Strip */}
          <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
            {typeof restaurant.googleRating === 'number' ? (
              <>
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono-data text-xs sm:text-sm font-bold"
                  style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-amber-gold)' }}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{restaurant.googleRating.toFixed(1)} / 5.0</span>
                </div>
                {restaurant.reviewCountLabel && (
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {restaurant.reviewCountLabel}
                  </span>
                )}
              </>
            ) : (
              <a
                href={googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold no-underline transition-opacity hover:opacity-85"
                style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-amber-gold)' }}
              >
                <Star className="w-3.5 h-3.5" />
                <span>View Live Google Reviews</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Apple Maps-style 3-Button Primary Action Row (immediately visible in Peek detent!) */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-bold no-underline transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-saffron)', color: '#1C1917' }}
            >
              <Navigation className="w-4 h-4" />
              <span>Directions</span>
            </a>

            {safeTel ? (
              <a
                href={safeTel}
                className="touch-target flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-semibold border no-underline transition-opacity hover:opacity-85"
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Phone className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
                <span>Call</span>
              </a>
            ) : (
              <a
                href={safeWebsite || googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-semibold border no-underline transition-opacity hover:opacity-85"
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Phone className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
                <span>Contact</span>
              </a>
            )}

            <a
              href={safeWebsite || googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-semibold border no-underline transition-opacity hover:opacity-85"
              style={{
                background: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Globe className="w-4 h-4" style={{ color: 'var(--accent-saffron)' }} />
              <span>{safeWebsite ? 'Website' : 'Search'}</span>
            </a>
          </div>
        </div>

        {/* Scrollable Body with Hairline Section Dividers */}
        <div className="flex-1 overflow-y-auto custom-scroll px-4 sm:px-5 py-4 space-y-5">
          {/* Address, Phone & Hours */}
          <section aria-label="Address and hours" className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-saffron)' }} />
                <div>
                  <p className="font-semibold leading-snug">{restaurant.address}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {restaurant.establishedNote}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                aria-label="Copy street address"
                className="touch-target p-2 rounded-xl border shrink-0 cursor-pointer flex items-center justify-center"
                style={{
                  background: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
                title="Copy address"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {restaurant.phone && (
              <div className="flex items-center gap-2.5 text-xs font-mono-data" style={{ color: 'var(--text-secondary)' }}>
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{restaurant.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{restaurant.hoursNote}</span>
            </div>

            <p className="flex items-start gap-2 text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Direct discovery only — online table booking is planned for a future release.</span>
            </p>
          </section>

          {/* Ongoing Offer */}
          {restaurant.ongoingOffer && (
            <section
              aria-label="Ongoing offer"
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  background: 'var(--accent-emerald-soft)',
                  borderColor: 'rgba(15, 118, 110, 0.25)',
                }}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-emerald)' }}>
                  <Tag className="w-3.5 h-3.5" />
                  <span>{restaurant.ongoingOffer.title}</span>
                </div>
                <p className="text-xs mt-1 leading-relaxed">{restaurant.ongoingOffer.details}</p>
                <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {restaurant.ongoingOffer.validNote}
                </p>
              </div>
            </section>
          )}

          {/* Seasonal Highlight */}
          {restaurant.isSeasonalWinterPick && restaurant.seasonalReason && (
            <section
              aria-label="Seasonal winter recommendation"
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-indigo)' }}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bavarian Winter Recommendation</span>
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {restaurant.seasonalReason}
              </p>
            </section>
          )}

          {/* Skip the Usual — Delicacies to Try */}
          <section
            aria-label="Recommended delicacies beyond Butter Chicken"
            className="pt-4 border-t space-y-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h3 className="font-display text-base font-bold">Skip the Usual — Try These Here</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Regional specialties that showcase what this kitchen truly excels at
              </p>
            </div>

            <div className="space-y-3">
              {restaurant.signatureDishes.map((dish, idx) => (
                <div
                  key={dish.name}
                  className={idx > 0 ? 'pt-3 border-t space-y-1.5' : 'space-y-1.5'}
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold leading-snug">{dish.name}</h4>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--accent-saffron)' }}>
                        Origin: {dish.regionalOrigin}
                      </p>
                    </div>
                    <SpiceDots level={dish.spiceLevel} />
                  </div>

                  {dish.insteadOf && (
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--accent-crimson)' }}>
                      Try instead of: {dish.insteadOf}
                    </p>
                  )}

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {dish.description}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {dish.dietary.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Diner Highlights */}
          <section
            aria-label="Diner highlights"
            className="pt-4 border-t space-y-2.5 pb-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-display text-base font-bold">Diner Highlights</h3>
            <div className="space-y-2.5">
              {restaurant.positiveReviews.map((rev, idx) => (
                <blockquote
                  key={idx}
                  className="m-0 p-3 rounded-xl space-y-1"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--accent-emerald)' }}>
                    <Quote className="w-3.5 h-3.5" />
                    <span>{rev.reviewerType}</span>
                    {rev.highlightDish && <span>· Loved {rev.highlightDish}</span>}
                  </div>
                  <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>
                    “{rev.quote}”
                  </p>
                </blockquote>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
