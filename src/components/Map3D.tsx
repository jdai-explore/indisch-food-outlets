import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { CityPreset, Restaurant } from '../types/restaurant';
import { getRegionStyle } from '../utils/regions';
import { generateMapSprite } from '../utils/mapSprites';

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
const CLUSTER_LAYER_ID = 'spiceatlas-clusters';
const OPEN_PIN_LAYER_ID = 'spiceatlas-open-pins';
const RATED_PIN_LAYER_ID = 'spiceatlas-rated-pins';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildGeoJson(list: Restaurant[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: list.map((r) => {
      const color = getRegionStyle(r.regionCategory).color;
      const hasRating = typeof r.googleRating === 'number';
      const iconId = hasRating
        ? `pin-rated|${color}|${r.googleRating!.toFixed(1)}`
        : `pin-open|${color}`;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: r.coordinates,
        },
        properties: {
          id: r.id,
          name: r.name,
          stateLabel: r.indianState,
          color,
          iconId,
          hasRating: hasRating ? 1 : 0,
          rating: hasRating ? r.googleRating! : 0,
        },
      };
    }),
  };
}

function buildHoverCard(name: string, stateLabel: string, rating: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'glass-panel-solid';
  card.style.cssText =
    'padding:7px 11px;border-radius:12px;display:flex;flex-direction:column;gap:2px;max-width:240px;pointer-events:none;';

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

  const titleEl = document.createElement('span');
  titleEl.style.cssText =
    'font-size:12px;font-weight:700;color:var(--text-primary);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  titleEl.textContent = name;
  topRow.appendChild(titleEl);

  if (rating > 0) {
    const scoreEl = document.createElement('span');
    scoreEl.className = 'font-mono-data';
    scoreEl.style.cssText =
      'font-size:11px;font-weight:700;color:var(--accent-amber-gold);flex-shrink:0;';
    scoreEl.textContent = `★ ${rating.toFixed(1)}`;
    topRow.appendChild(scoreEl);
  }

  const subEl = document.createElement('span');
  subEl.style.cssText =
    'font-size:10.5px;font-weight:500;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  subEl.textContent = stateLabel;

  card.appendChild(topRow);
  card.appendChild(subEl);
  return card;
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
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
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
        cluster: true,
        clusterMaxZoom: 10.5,
        clusterRadius: 44,
      });

      // 1. Numbered Cluster Medallions
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': ['concat', 'cluster|', ['to-string', ['get', 'point_count']]],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      // 2. Sculpted Teardrop Pins (OSM/Directory Verified spots)
      map.addLayer({
        id: OPEN_PIN_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasRating'], 0]],
        layout: {
          'icon-image': ['get', 'iconId'],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.72, 12, 0.95, 15, 1.08],
        },
      });

      // 3. Sculpted Rating Pill-Pins (drawn on top with visible ★ score)
      map.addLayer({
        id: RATED_PIN_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasRating'], 1]],
        layout: {
          'icon-image': ['get', 'iconId'],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['get', 'rating'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.78, 12, 0.98, 15, 1.1],
        },
      });
    } catch {
      // Style still mid-swap; styledata/style.load will attach cleanly
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

    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -34],
      className: 'spiceatlas-hover-popup',
    });
    hoverPopupRef.current = hoverPopup;

    // Generate Retina 2x canvas sprites dynamically (persists across Light/Dark style switches)
    map.on('styleimagemissing', (e) => {
      if (map.hasImage(e.id)) return;
      const sprite = generateMapSprite(e.id);
      if (sprite) {
        map.addImage(
          e.id,
          { width: sprite.width, height: sprite.height, data: sprite.data },
          { pixelRatio: sprite.pixelRatio }
        );
      }
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

    // Click cluster to zoom in
    map.on('click', CLUSTER_LAYER_ID, async (e) => {
      const feat = e.features?.[0];
      const clusterId = feat?.properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source || clusterId === undefined || feat?.geometry.type !== 'Point') return;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: feat.geometry.coordinates as [number, number],
          zoom,
          duration: prefersReducedMotion() ? 0 : 450,
        });
      } catch {
        // Ignore stale cluster click
      }
    });

    map.on('mouseenter', CLUSTER_LAYER_ID, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features?.[0];
      if (feat?.geometry.type === 'Point') {
        const count = Number(feat.properties?.point_count || 0);
        const card = buildHoverCard(`${count} Indian Kitchens`, 'Click cluster to zoom in', 0);
        hoverPopup.setLngLat(feat.geometry.coordinates as [number, number]).setDOMContent(card).addTo(map);
      }
    });

    map.on('mouseleave', CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
      hoverPopup.remove();
    });

    const handlePinClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      const id = feat?.properties?.id;
      if (!id) return;
      const found = restaurantsRef.current.find((r) => r.id === id);
      if (found) onSelectRef.current(found);
    };

    const handlePinEnter = (e: maplibregl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features?.[0];
      if (feat?.geometry.type === 'Point') {
        const name = String(feat.properties?.name || '');
        const stateLabel = String(feat.properties?.stateLabel || '');
        const rating = Number(feat.properties?.rating || 0);
        const card = buildHoverCard(name, stateLabel, rating);
        hoverPopup.setLngLat(feat.geometry.coordinates as [number, number]).setDOMContent(card).addTo(map);
      }
    };

    const handlePinLeave = () => {
      map.getCanvas().style.cursor = '';
      hoverPopup.remove();
    };

    [RATED_PIN_LAYER_ID, OPEN_PIN_LAYER_ID].forEach((layerId) => {
      map.on('click', layerId, handlePinClick);
      map.on('mouseenter', layerId, handlePinEnter);
      map.on('mouseleave', layerId, handlePinLeave);
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
      hoverPopupRef.current?.remove();
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

  // Fly to selected restaurant & render crisp active halo pin via textContent
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

    const root = document.createElement('div');
    root.className = 'flex flex-col items-center pointer-events-none';
    root.style.zIndex = '15';

    const ringWrap = document.createElement('div');
    ringWrap.className = 'relative flex items-center justify-center';

    const pulse = document.createElement('span');
    pulse.className = 'pin-pulse absolute inset-0 rounded-full';
    pulse.style.background = style.color;
    pulse.style.opacity = '0.48';

    const badge = document.createElement('span');
    badge.className =
      'relative flex items-center justify-center rounded-full border-2 border-white font-mono-data text-xs font-bold text-white px-2.5';
    badge.style.height = '32px';
    badge.style.minWidth = '32px';
    badge.style.background = style.color;
    badge.style.boxShadow = `0 0 0 4px var(--bg-canvas), 0 0 0 7px ${style.color}, 0 10px 24px rgba(0,0,0,0.4)`;
    badge.textContent = hasRating ? `★ ${selectedRestaurant.googleRating!.toFixed(1)}` : '★';

    ringWrap.appendChild(pulse);
    ringWrap.appendChild(badge);

    const label = document.createElement('span');
    label.className = 'mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap';
    label.style.background = 'var(--bg-surface-elevated)';
    label.style.color = 'var(--text-primary)';
    label.style.border = '1px solid var(--border-subtle)';
    label.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    label.textContent = selectedRestaurant.name;

    root.appendChild(ringWrap);
    root.appendChild(label);

    selectedMarkerRef.current = new maplibregl.Marker({ element: root, anchor: 'center' })
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
    <div className="relative w-full h-full z-0 isolate">
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
          Map tiles are loading slowly—switch to <strong>List</strong> anytime for instant browsing.
        </div>
      )}
    </div>
  );
};
