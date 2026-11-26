import React, { useState } from 'react';
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

  if (!restaurant) return null;

  const region = getRegionStyle(restaurant.regionCategory);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurant.name}, ${restaurant.address}`
  )}`;
  const googleReviewsUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${restaurant.name} ${restaurant.city} Google reviews`
  )}`;
  const websiteHref = restaurant.website || googleReviewsUrl;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(restaurant.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored gracefully
    }
  };

  return (
    <aside
      aria-label={`Details for ${restaurant.name}`}
      className="fixed right-3 bottom-14 w-[380px] lg:w-[400px] max-w-[calc(100vw-24px)] z-30 glass-panel-solid rounded-2xl flex flex-col overflow-hidden"
      style={{ top: 'var(--hud-top, 120px)' }}
    >
      {/* Top Banner */}
      <div
        className="px-5 py-4 border-b relative"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close restaurant details"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full cursor-pointer transition-colors"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 flex-wrap pr-8">
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
            Verified Open · Indian
          </span>
        </div>

        <h2 className="font-display text-2xl font-bold mt-2 leading-tight">
          {restaurant.name}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {restaurant.cuisineStyle}
        </p>

        {/* Google Rating Strip */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {typeof restaurant.googleRating === 'number' ? (
            <>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono-data text-sm font-bold"
                style={{ background: 'var(--accent-saffron-soft)', color: 'var(--accent-amber-gold)' }}
              >
                <Star className="w-4 h-4 fill-current" />
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
              <span>View Live Google Rating &amp; Reviews</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-5">
        {/* Address, Hours & Direct Contact */}
        <section aria-label="Location and contact" className="space-y-2.5">
          <div
            className="p-3.5 rounded-xl border space-y-2.5"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
          >
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
                className="p-1.5 rounded-lg border shrink-0 cursor-pointer"
                style={{
                  background: 'var(--bg-surface-solid)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
                title="Copy address"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{restaurant.hoursNote}</span>
            </div>

            {/* Action Links: Phone, Website, Directions */}
            <div className="pt-1 grid grid-cols-2 gap-2">
              {restaurant.phone ? (
                <a
                  href={`tel:${restaurant.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-opacity hover:opacity-85 no-underline"
                  style={{
                    background: 'var(--bg-surface-solid)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: 'var(--accent-emerald)' }} />
                  <span>{restaurant.phone}</span>
                </a>
              ) : (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-opacity hover:opacity-85 no-underline"
                  style={{
                    background: 'var(--bg-surface-solid)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: 'var(--accent-emerald)' }} />
                  <span>{restaurant.website ? 'Contact via Site' : 'Find Phone'}</span>
                </a>
              )}

              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-opacity hover:opacity-85 no-underline"
                style={{
                  background: 'var(--bg-surface-solid)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent-saffron)' }} />
                <span>{restaurant.website ? 'Official Website' : 'Search Website'}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 no-underline"
              style={{
                background: 'var(--accent-saffron)',
                color: '#1C1917',
              }}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open Route in Google Maps</span>
            </a>
          </div>

          {/* Transparent Future-Scope Notice (No booking offered) */}
          <p
            className="flex items-start gap-2 text-[11px] px-2.5 py-2 rounded-xl"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Direct discovery only — reach out via phone or official website above. Online table booking is planned for a future release.
            </span>
          </p>
        </section>

        {/* Ongoing Offer / Lunch Deal */}
        {restaurant.ongoingOffer && (
          <section
            aria-label="Ongoing offer"
            className="p-3.5 rounded-xl border"
            style={{
              background: 'var(--accent-emerald-soft)',
              borderColor: 'rgba(15, 118, 110, 0.3)',
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-emerald)' }}>
              <Tag className="w-3.5 h-3.5" />
              <span>Ongoing Offer · {restaurant.ongoingOffer.title}</span>
            </div>
            <p className="text-xs mt-1 leading-relaxed">{restaurant.ongoingOffer.details}</p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
              {restaurant.ongoingOffer.validNote}
            </p>
          </section>
        )}

        {/* Seasonal Highlight */}
        {restaurant.isSeasonalWinterPick && restaurant.seasonalReason && (
          <section
            aria-label="Seasonal winter recommendation"
            className="p-3.5 rounded-xl border"
            style={{
              background: 'var(--accent-indigo-soft)',
              borderColor: 'rgba(67, 56, 202, 0.25)',
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-indigo)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bavarian Winter Recommendation</span>
            </div>
            <p className="text-xs mt-1 leading-relaxed">{restaurant.seasonalReason}</p>
          </section>
        )}

        {/* Skip the Usual — Delicacies to Try */}
        <section aria-label="Recommended delicacies beyond Butter Chicken" className="space-y-2.5">
          <div>
            <h3 className="font-display text-base font-bold">Skip the Usual — Try These Here</h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Regional specialties that showcase what this kitchen truly excels at
            </p>
          </div>

          <div className="space-y-2.5">
            {restaurant.signatureDishes.map((dish) => (
              <div
                key={dish.name}
                className="p-3.5 rounded-xl border space-y-1.5"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
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
                        background: 'var(--bg-surface-solid)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
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
        <section aria-label="Diner highlights" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Diner Highlights</h3>
          </div>

          <div className="space-y-2.5">
            {restaurant.positiveReviews.map((rev, idx) => (
              <blockquote
                key={idx}
                className="m-0 p-3.5 rounded-xl border space-y-1.5"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
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
  );
};
