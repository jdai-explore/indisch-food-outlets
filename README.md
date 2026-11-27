# SpiceAtlas · Bayern

Interactive 3D map and multi-source directory of **568 open Indian kitchens across Bavaria, Germany** (`539` multi-source expansion entries across all 96 *Landkreise* and *kreisfreie Städte* + `29` curated flagship spots).

> **Project Status:** Frozen & archived at **`v1.0.0`** as a completed portfolio showcase.
> **Live Demo (GitHub Pages):** [https://jdai-explore.github.io/indisch-food-outlets/](https://jdai-explore.github.io/indisch-food-outlets/) *(enable Settings → Pages → Source: **GitHub Actions** in repository settings if not yet activated)*

---

## Highlights

- **3D Interactive Map (`MapLibre GL`):** Smooth pitch/bearing navigation across 7 *Regierungsbezirke*, crisp `2×` Retina WebGL pill sprites displaying venue ratings, single-surface glass hover cards, responsive Light/Dark palettes (Light Mode default), and a keyboard-accessible directory list view.
- **Multi-Source Data Pipeline (`scripts/build_bavaria_data.py`):**
  - **QLever OSM Planet SPARQL:** Queries Bavaria's `admin_level` boundary (`osmrel:2145268`) for tagged `cuisine~indian` nodes/ways/relations plus untagged Indian-named venues, computing building polygon centroids rather than dropping area outlines.
  - **Wolt Live API:** Polls both `/v1/pages/restaurants` and `/v1/pages/venue-list/category-indian` across 22 Munich & Bavarian city hubs.
  - **Multi-Branch & 96-District Enrichment:** Extracts Schema.org JSON-LD branch addresses (`thespiceroute.de`, `swaadgermany.com`, `tattvarestaurant.de`, `bindaas.de`, `madamchutney.com`) and fills rural district blind spots via cached Nominatim geocoding.
  - **Strict Quality & Closure Filtering:** Separates genuine Indian-first kitchens from pizza/kebab/Nepalese/Tibetan multi-cuisine spots, filters permanently closed locations via [`scripts/closed_registry.json`](scripts/closed_registry.json) plus concurrent homepage closure-banner audits, and applies tightened `25 m` / `250 m` spatial deduplication so neighboring restaurants and second branches stay intact.
- **Bundle Architecture:** Dynamic code-splitting separates `bavariaOsmRestaurants.json` (`446 kB` raw / `48 kB` gzipped) and `maplibre-gl` into dedicated lazy chunks.

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, MapLibre GL JS v5, Lucide icons
- **Data Engineering:** Python 3, QLever SPARQL endpoint, Wolt Consumer API, Nominatim OpenStreetMap geocoder

---

## Local Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # TypeScript check + production bundle in ./dist
```

To rebuild [`src/data/bavariaOsmRestaurants.json`](src/data/bavariaOsmRestaurants.json) from live sources:

```bash
python -u scripts/build_bavaria_data.py
```

---

## Product Retrospective (Why `v1.0.0` Is Final)

Building **SpiceAtlas · Bayern** to `v1.0.0` solved the engineering and data-completeness challenges across Bavaria's 96 districts, including uncovering subtle pitfalls around OSM polygon centroids, delivery-radius limits, virtual ghost kitchens, and over-aggressive spatial deduplication.

On the product side, we chose **not** to pursue commercialization and froze the project cleanly here:

1. **Distribution & Habit Moat:** Generic restaurant discovery (live hours, busyness, photos, navigation, crowdsourced closures) is overwhelmingly owned by Google Maps, while online ordering with live prices/menus belongs to Wolt and Lieferando.
2. **Small Single-State TAM:** Bavaria has roughly ~570 Indian restaurants total — too narrow for recurring subscription or ad revenue without diluting editorial trust.
3. **What a commercial v2 would have required:** Moving beyond map lookup into a verified *dish-level menu index*, live weekend/festival specials, tiffin/home-chef listings, or B2B corporate catering matchmaking. Keeping the code frozen at `v1.0.0` avoids ongoing scraping maintenance while preserving a crisp engineering artifact.
