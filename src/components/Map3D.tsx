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
const SOURCE_ID = 'spiceatlas-restaurants';
const CIRCLE_LAYER_ID = 'spiceatlas-circles';
const PULSE_LAYER_ID = 'spiceatlas-new-ring';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildGeoJson(list: Restaurant[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: list.map((r) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: r.coordinates,
      },
      properties: {
        id: r.id,
        name: r.name,
        color: getRegionStyle(r.regionCategory).color,
        hasRating: typeof r.googleRating === 'number' ? 1 : 0,
        isNew: r.isNewSpot ? 1 : 0,
      },
    })),
  };
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
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const orbitFrameRef = useRef<number | null>(null);
  const restaurantsRef = useRef<Restaurant[]>(restaurants);
  const onSelectRef = useRef(onSelectRestaurant);
  const prevThemeRef = useRef<'light' | 'dark'>(theme);

  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);

  restaurantsRef.current = restaurants;
  onSelectRef.current = onSelectRestaurant;

  const syncGeoJsonLayers = (map: maplibregl.Map, list: Restaurant[], forceWhenStyleLoading = false) => {
    if (!forceWhenStyleLoading && !map.isStyleLoaded()) return;

    const data = buildGeoJson(list);
    try {
      const existingSource = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(data);
        return;
      }

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data,
      });

      // Subtle outer ring for New & Rising spots
      map.addLayer({
        id: PULSE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'isNew'], 1],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 7, 12, 14, 15, 17],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.7,
        },
      });

      // Main GPU-accelerated region-colored restaurant markers
      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7,
            ['case', ['==', ['get', 'hasRating'], 1], 6, 4.2],
            12,
            ['case', ['==', ['get', 'hasRating'], 1], 10.5, 7],
            15,
            ['case', ['==', ['get', 'hasRating'], 1], 12.5, 8.5],
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.94,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 7, 1.2, 12, 2],
        },
      });
    } catch {
      // Style still mid-swap; styledata/idle handler will retry cleanly
    }
  };

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
      syncGeoJsonLayers(map, restaurantsRef.current, true);
    });

    map.on('style.load', () => {
      setTileError(false);
      syncGeoJsonLayers(map, restaurantsRef.current, true);
    });

    map.on('styledata', () => {
      if (!map.getSource(SOURCE_ID)) {
        syncGeoJsonLayers(map, restaurantsRef.current, true);
      }
    });

    map.on('click', CIRCLE_LAYER_ID, (e) => {
      const feat = e.features?.[0];
      const id = feat?.properties?.id;
      if (!id) return;
      const found = restaurantsRef.current.find((r) => r.id === id);
      if (found) onSelectRef.current(found);
    });

    map.on('mouseenter', CIRCLE_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', CIRCLE_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('error', () => {
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
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch light/dark map style seamlessly
  useEffect(() => {
    const map = mapRef.current;
    if (!map || prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    const targetStyle = theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
    map.setStyle(targetStyle);
  }, [theme]);

  // Update GeoJSON points whenever filtered restaurants change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncGeoJsonLayers(map, restaurants, true);
  }, [restaurants]);

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

  // Fly to selected restaurant & render crisp active halo pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    if (!selectedRestaurant) return;

    const opts = {
      center: selectedRestaurant.coordinates,
      zoom: Math.max(map.getZoom(), 14.6),
      pitch: pitchMode === '3d' ? 58 : 0,
      bearing: activePreset.bearing,
      essential: true,
    };
    if (prefersReducedMotion()) {
      map.jumpTo(opts);
    } else {
      map.flyTo({ ...opts, speed: 1.2, curve: 1.35 });
    }

    const style = getRegionStyle(selectedRestaurant.regionCategory);
    const hasRating = typeof selectedRestaurant.googleRating === 'number';
    const el = document.createElement('div');
    el.className = 'flex flex-col items-center pointer-events-none';
    el.style.zIndex = '40';
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <span class="pin-pulse absolute inset-0 rounded-full" style="background:${style.color}; opacity:0.5;"></span>
        <span
          class="relative flex items-center justify-center rounded-full border-2 border-white font-mono-data text-xs font-bold text-white"
          style="width:40px; height:40px; background:${style.color}; box-shadow: 0 0 0 4px var(--bg-canvas), 0 0 0 7px ${style.color}, 0 10px 24px rgba(0,0,0,0.4);"
        >
          ${hasRating ? selectedRestaurant.googleRating!.toFixed(1) : '★'}
        </span>
      </div>
      <span
        class="mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
        style="background:var(--bg-surface-elevated); color:var(--text-primary); border:1px solid var(--border-subtle); box-shadow:0 4px 12px rgba(0,0,0,0.2);"
      >
        ${selectedRestaurant.name}
      </span>
    `;

    selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(selectedRestaurant.coordinates)
      .addTo(map);
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
