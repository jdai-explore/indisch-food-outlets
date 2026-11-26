import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CITY_PRESETS } from './data/cities';
import { CURATED_RESTAURANTS, loadExpansionRestaurants } from './data/restaurants';
import { CityPreset, IndianRegionCategory, Restaurant } from './types/restaurant';
import { TopBar } from './components/TopBar';
import { Map3D } from './components/Map3D';
import { QuickFilter, SidebarRail } from './components/SidebarRail';
import { InspectorDrawer } from './components/InspectorDrawer';
import { MapControls } from './components/MapControls';
import { ChevronUp } from 'lucide-react';

const BeyondClassicsModal = lazy(() =>
  import('./components/BeyondClassicsModal').then((m) => ({ default: m.BeyondClassicsModal }))
);
const SeasonalModal = lazy(() =>
  import('./components/SeasonalModal').then((m) => ({ default: m.SeasonalModal }))
);
const AccessibleGridView = lazy(() =>
  import('./components/AccessibleGridView').then((m) => ({ default: m.AccessibleGridView }))
);

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('spiceatlas-theme');
  if (saved === 'dark') return 'dark';
  return 'light';
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>(CURATED_RESTAURANTS);
  const [activePreset, setActivePreset] = useState<CityPreset>(CITY_PRESETS[0]); // Munich default
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<IndianRegionCategory | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [pitchMode, setPitchMode] = useState<'3d' | '2d'>('3d');
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showBeyondClassics, setShowBeyondClassics] = useState(false);
  const [showSeasonal, setShowSeasonal] = useState(false);

  const mapControlRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    flyToPreset: (preset: CityPreset) => void;
  } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spiceatlas-theme', theme);
  }, [theme]);

  // Progressive dataset hydration: render flagship 29 instantly, stream remaining 495 asynchronously
  useEffect(() => {
    let active = true;
    loadExpansionRestaurants().then((expansion) => {
      if (active) {
        setAllRestaurants([...CURATED_RESTAURANTS, ...expansion]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allRestaurants
      .filter((r) => {
        // City preset filter (Munich preset also includes immediate north-east S8 neighbors Unterföhring & Ismaning)
        if (!q && activePreset.cityFilter !== 'All') {
          if (activePreset.cityFilter === 'Munich') {
            if (r.city !== 'Munich' && r.city !== 'Unterföhring' && r.city !== 'Ismaning') return false;
          } else if (r.city !== activePreset.cityFilter) {
            return false;
          }
        }

        if (selectedRegion !== 'all' && r.regionCategory !== selectedRegion) {
          return false;
        }

        if (quickFilter === 'new' && !r.isNewSpot) return false;
        if (quickFilter === 'seasonal' && !r.isSeasonalWinterPick) return false;
        if (quickFilter === 'street-food' && !r.isStreetFood) return false;
        if (quickFilter === 'fine-dining' && !r.isFineDining) return false;
        if (quickFilter === 'pure-veg' && !r.isPureVeg) return false;

        if (!q) return true;

        const haystack = [
          r.name,
          r.city,
          r.district ?? '',
          r.indianState,
          r.cuisineStyle,
          r.address,
          ...r.signatureDishes.map((d) => `${d.name} ${d.regionalOrigin} ${d.description}`),
        ]
          .join(' ')
          .toLowerCase();

        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.every((tok) => haystack.includes(tok));
      })
      .sort((a, b) => {
        const ra = a.googleRating ?? -1;
        const rb = b.googleRating ?? -1;
        if (rb !== ra) return rb - ra;
        return a.name.localeCompare(b.name);
      });
  }, [allRestaurants, searchQuery, activePreset.cityFilter, selectedRegion, quickFilter]);

  const handleSelectPreset = (preset: CityPreset) => {
    setActivePreset(preset);
    setSelectedRestaurant(null);
    setIsOrbiting(false);
    mapControlRef.current?.flyToPreset(preset);
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    const cityPreset = CITY_PRESETS.find((p) => p.cityFilter === restaurant.city);
    if (cityPreset && activePreset.cityFilter !== 'All' && activePreset.cityFilter !== restaurant.city) {
      setActivePreset(cityPreset);
    }
    setIsOrbiting(false);
    setSelectedRestaurant(restaurant);
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-x-hidden">
      <a href="#main-content" className="skip-link">
        Skip to restaurant listings
      </a>

      {/* Polite screen-reader live announcement for filter & dataset updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing {filteredRestaurants.length} verified open Indian kitchens in {activePreset.label}.
      </div>

      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        presets={CITY_PRESETS}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onOpenBeyondClassics={() => setShowBeyondClassics(true)}
        onOpenSeasonal={() => setShowSeasonal(true)}
      />

      {viewMode === 'map' ? (
        <main id="main-content" className="relative w-full h-[100dvh] overflow-hidden">
          <Map3D
            restaurants={filteredRestaurants}
            selectedRestaurant={selectedRestaurant}
            activePreset={activePreset}
            theme={theme}
            pitchMode={pitchMode}
            isOrbiting={isOrbiting}
            onSelectRestaurant={handleSelectRestaurant}
            mapControlRef={mapControlRef}
          />

          <SidebarRail
            restaurants={filteredRestaurants}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={handleSelectRestaurant}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            quickFilter={quickFilter}
            onSelectQuickFilter={setQuickFilter}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
            cityLabel={activePreset.label}
            hasInspectorOpen={Boolean(selectedRestaurant)}
          />

          <MapControls
            pitchMode={pitchMode}
            onTogglePitch={() => setPitchMode((m) => (m === '3d' ? '2d' : '3d'))}
            isOrbiting={isOrbiting}
            onToggleOrbit={() => setIsOrbiting((o) => !o)}
            onZoomIn={() => mapControlRef.current?.zoomIn()}
            onZoomOut={() => mapControlRef.current?.zoomOut()}
            onResetMunich={() => handleSelectPreset(CITY_PRESETS[0])}
            hasInspectorOpen={Boolean(selectedRestaurant)}
          />

          {/* Mobile quick-drawer trigger */}
          {!selectedRestaurant && (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="touch-target md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ChevronUp className="w-4 h-4" />
              <span>Browse {filteredRestaurants.length} Verified Kitchens</span>
            </button>
          )}
        </main>
      ) : (
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center text-sm font-medium">
              Loading accessible directory…
            </div>
          }
        >
          <AccessibleGridView
            restaurants={filteredRestaurants}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={handleSelectRestaurant}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            quickFilter={quickFilter}
            onSelectQuickFilter={setQuickFilter}
            cityLabel={activePreset.label}
          />
        </Suspense>
      )}

      <InspectorDrawer
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />

      <Suspense fallback={null}>
        {showBeyondClassics && (
          <BeyondClassicsModal
            isOpen={showBeyondClassics}
            onClose={() => setShowBeyondClassics(false)}
            restaurants={allRestaurants}
            onPickRestaurant={(spot) => {
              setViewMode('map');
              handleSelectRestaurant(spot);
            }}
          />
        )}
        {showSeasonal && (
          <SeasonalModal
            isOpen={showSeasonal}
            onClose={() => setShowSeasonal(false)}
            restaurants={allRestaurants}
            onPickRestaurant={(spot) => {
              setViewMode('map');
              handleSelectRestaurant(spot);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
