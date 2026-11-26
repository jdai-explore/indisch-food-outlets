import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { CityPreset, Restaurant } from '../types/restaurant';
import { getRegionStyle } from '../utils/regions';

interface Map3DProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  activePreset: CityPreset;
  theme: 'light' | 'dark';
  pitchMode: '3d' | '2d';
  isOrbiting: boolean;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  mapControlRef: React.MutableRefObject<{
    zoomIn: () => void;
    zoomOut: () => void;
    flyToPreset: (preset: CityPreset) => void;
  } | null>;
}

const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const Map3D: React.FC<Map3DProps> = ({
  restaurants,
  selectedRestaurant,
  activePreset,
  theme,
  pitchMode,
  isOrbiting,
  onSelectRestaurant,
  mapControlRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>>(new Map());
  const orbitFrameRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Initialize MapLibre GL 3D instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? DARK_STYLE : LIGHT_STYLE,
      center: [activePreset.lng, activePreset.lat],
      zoom: activePreset.zoom,
      pitch: pitchMode === '3d' ? activePreset.pitch : 0,
      bearing: activePreset.bearing,
      maxPitch: 70,
      attributionControl: { compact: true },
    });

    map.on('load', () => {
      setMapReady(true);
      setTileError(false);
    });

    map.on('error', () => {
      // Do not hard-crash on occasional tile hiccup; only flag if style fails to load
      if (!map.isStyleLoaded()) {
        setTileError(true);
      }
    });

    mapRef.current = map;

    mapControlRef.current = {
      zoomIn: () => map.zoomIn({ duration: prefersReducedMotion() ? 0 : 350 }),
      zoomOut: () => map.zoomOut({ duration: prefersReducedMotion() ? 0 : 350 }),
      flyToPreset: (preset: CityPreset) => {
        const opts = {
          center: [preset.lng, preset.lat] as [number, number],
          zoom: preset.zoom,
          pitch: pitchMode === '3d' ? preset.pitch : 0,
          bearing: preset.bearing,
          essential: true,
        };
        if (prefersReducedMotion()) {
          map.jumpTo(opts);
        } else {
          map.flyTo({ ...opts, speed: 1.35, curve: 1.4 });
        }
      },
    };

    return () => {
      if (orbitFrameRef.current) cancelAnimationFrame(orbitFrameRef.current);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch light/dark map style seamlessly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetStyle = theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
    map.setStyle(targetStyle);
    map.once('styledata', () => {
      setTileError(false);
    });
  }, [theme]);

  // Keep mapControlRef updated with latest pitchMode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    mapControlRef.current = {
      zoomIn: () => map.zoomIn({ duration: prefersReducedMotion() ? 0 : 350 }),
      zoomOut: () => map.zoomOut({ duration: prefersReducedMotion() ? 0 : 350 }),
      flyToPreset: (preset: CityPreset) => {
        const opts = {
          center: [preset.lng, preset.lat] as [number, number],
          zoom: preset.zoom,
          pitch: pitchMode === '3d' ? preset.pitch : 0,
          bearing: preset.bearing,
          essential: true,
        };
        if (prefersReducedMotion()) {
          map.jumpTo(opts);
        } else {
          map.flyTo({ ...opts, speed: 1.35, curve: 1.4 });
        }
      },
    };
  }, [pitchMode, mapControlRef]);

  // Smoothly transition 3D vs 2D pitch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetPitch = pitchMode === '3d' ? activePreset.pitch : 0;
    map.easeTo({
      pitch: targetPitch,
      duration: prefersReducedMotion() ? 0 : 600,
    });
  }, [pitchMode, activePreset.pitch]);

  // Fly to city preset when activePreset changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const opts = {
      center: [activePreset.lng, activePreset.lat] as [number, number],
      zoom: activePreset.zoom,
      pitch: pitchMode === '3d' ? activePreset.pitch : 0,
      bearing: activePreset.bearing,
      essential: true,
    };
    if (prefersReducedMotion()) {
      map.jumpTo(opts);
    } else {
      map.flyTo({ ...opts, speed: 1.3, curve: 1.4 });
    }
  }, [activePreset, pitchMode]);

  // Fly to selected restaurant when picked
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRestaurant) return;
    const opts = {
      center: selectedRestaurant.coordinates,
      zoom: Math.max(map.getZoom(), 14.8),
      pitch: pitchMode === '3d' ? 58 : 0,
      bearing: activePreset.bearing,
      essential: true,
    };
    if (prefersReducedMotion()) {
      map.jumpTo(opts);
    } else {
      map.flyTo({ ...opts, speed: 1.2, curve: 1.35 });
    }
  }, [selectedRestaurant, pitchMode, activePreset.bearing]);

  // Cinematic 360 aerial orbit
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isOrbiting || prefersReducedMotion()) {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const rotate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      map.setBearing((map.getBearing() + dt * 9) % 360);
      orbitFrameRef.current = requestAnimationFrame(rotate);
    };
    orbitFrameRef.current = requestAnimationFrame(rotate);

    return () => {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    };
  }, [isOrbiting]);

  // Render region-colored 3D map markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    restaurants.forEach((restaurant) => {
      const style = getRegionStyle(restaurant.regionCategory);
      const isSelected = selectedRestaurant?.id === restaurant.id;

      const hasRating = typeof restaurant.googleRating === 'number';
      const ratingLabel = hasRating ? `rated ${restaurant.googleRating!.toFixed(1)} stars` : 'verified open via OpenStreetMap';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'group relative flex flex-col items-center cursor-pointer border-0 bg-transparent p-0 focus:outline-none';
      btn.setAttribute(
        'aria-label',
        `${restaurant.name} in ${restaurant.city}, ${restaurant.indianState}, ${ratingLabel}`
      );
      btn.style.zIndex = isSelected ? '30' : hasRating ? '15' : '10';

      const pulseHtml = restaurant.isNewSpot
        ? `<span class="pin-pulse absolute inset-0 rounded-full" style="background:${style.color}; opacity:0.45;"></span>`
        : '';

      const pinSize = isSelected ? 40 : hasRating ? 34 : 26;
      const pinContent = hasRating ? restaurant.googleRating!.toFixed(1) : '●';

      const selectedRing = isSelected
        ? `box-shadow: 0 0 0 4px var(--bg-canvas), 0 0 0 7px ${style.color}, 0 10px 24px rgba(0,0,0,0.4); transform: scale(1.22);`
        : `box-shadow: 0 4px 12px rgba(0,0,0,0.28);`;

      btn.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${pulseHtml}
          <span
            class="relative flex items-center justify-center rounded-full border-2 border-white font-mono-data text-[11px] font-bold text-white transition-transform duration-200 group-hover:scale-115"
            style="width:${pinSize}px; height:${pinSize}px; background:${style.color}; ${selectedRing}"
          >
            ${pinContent}
          </span>
        </div>
        <span
          class="mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap pointer-events-none transition-all duration-150 ${
            isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 -translate-y-0.5'
          }"
          style="background:var(--bg-surface-elevated); color:var(--text-primary); border:1px solid var(--border-subtle); box-shadow:0 4px 12px rgba(0,0,0,0.18);"
        >
          ${restaurant.name}
        </span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRestaurant(restaurant);
      });

      const marker = new maplibregl.Marker({ element: btn, anchor: 'center' })
        .setLngLat(restaurant.coordinates)
        .addTo(map);

      markersRef.current.set(restaurant.id, { marker, el: btn });
    });
  }, [restaurants, selectedRestaurant, onSelectRestaurant]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        role="region"
        aria-label="Interactive 3D aerial map of authentic Indian restaurants in Bavaria"
      />
      {!mapReady && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: 'var(--bg-canvas)' }}
        >
          <div className="glass-panel px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-medium">
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: 'var(--accent-saffron)' }}
            />
            Loading 3D Bavarian aerial terrain…
          </div>
        </div>
      )}
      {tileError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-xl text-xs font-medium">
          Map tiles are loading slowly—switch to <strong>Accessible List</strong> anytime for instant browsing.
        </div>
      )}
    </div>
  );
};
