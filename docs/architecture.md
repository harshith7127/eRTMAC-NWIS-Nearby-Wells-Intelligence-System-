# SIH-121 Exploration Intelligence Platform — Architecture & Technical Decisions

## 1. Overview and Problem Definition

The **SIH-121 Exploration Intelligence Platform** is an interactive, map-first, 3D oil-well exploration and geological decision-support platform built for drilling engineers and geologists (Oil India Limited / SIH-121).

The interaction model combines **Google Maps** (click, inspect, zoom, rotate, go deeper, get context) with a **3D Subsurface Geological Viewer**, an **Active Well Information System**, and an **Offset Decision-Support Dashboard**.

### Core Operational Question
> **"What happened in nearby wells at this depth and formation, and is the current well approaching a similar risk?"**

---

## 2. Technology Comparison Matrix

| Technology | 3D | GIS | Terrain | Wells | Geology | Performance | Ease | SIH Impact | Assessment / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CesiumJS** | High | High | High (requires Ion token or self-hosted terrain) | Med-High | Medium (custom primitives, complex slicing/volumes) | High | Low-Med | High | Continuous globe-to-underground flight is impressive, but token/offline risk, heavy bundle size (~3.8MB), and awkward geology mesh slicing make it fragile for offline defense. Runner-up. |
| **Three.js** | High | Low (no CRS or tiles) | Medium (manual meshes) | High | High (clipping planes, custom shaders, volumetric controls) | High (with instancing) | Medium | High for subsurface | **Selected for Subsurface & Near-Well 3D.** Full low-level control over clipping planes, depth buffers, and geometries. |
| **React Three Fiber (R3F)** | High | Low | Medium | High | High | High | Med-High | High | **Selected as React binding for Three.js.** Declarative state integration, on-demand frameloop (`frameloop="demand"`), and seamless component lifecycle disposal. |
| **MapLibre GL JS** | Medium (terrain, extrusions) | High | Med-High (free open terrain-RGB) | High (symbol layers, clustering) | Low (2.5D surface only) | High | High | Med-High | **Selected for Geographic Visualization.** Vector tiles, terrain-RGB elevation, supercluster clustering, zero token dependency, and smooth Google Maps UX. |
| **deck.gl** | Med-High | High | Medium | High (3D paths, large data) | Medium | Very high for large data | Medium | Med-High | High-performance overlay for massive trajectory catalogs; can be layered on MapLibre if well counts exceed thousands. |
| **VTK.js** | High (volumes) | Low | Low | Medium | High (seismic volumes) | Medium | Low | Medium | Geared towards heavy 3D seismic volume rendering; out of scope for v1 trajectory/stratigraphy viewer. |
| **Babylon.js** | High | Low | Low-Med | Medium | Medium | High | Medium | Medium | Capable 3D engine, but no GIS advantage over Three.js and larger community friction with custom geoscientific shaders. |

---

## 3. Architecture Decisions (A – G) & Spike Evidence

### Decision A: Geographic Visualisation — MapLibre GL JS
- **Choice**: MapLibre GL JS with open terrain-RGB tiles, vector tiles, and client-side clustering.
- **Rationale**: 60 fps smooth pan/tilt/zoom with zero API keys or external token dependencies. Supports offline vector tiles and local terrain-RGB elevation queries.
- **Spike Evidence (`scripts/spikes/maplibre_clustering_spike.cjs`)**:
  - Tested 5 co-located platform wells (F-9, F-11, F-12, F-14, F-15) on the Mærsk Inspirer platform.
  - Surface wellhead separation is only 8.97 meters, properly clustered into a single platform icon at zoom < 16.
  - Subsurface TD targets diverge across 910m to 2488m, cleanly visualized without overlap in 3D.

### Decision B: Subsurface & Near-Well 3D — Three.js / React Three Fiber in Local Metric Frame
- **Choice**: Three.js wrapped with `@react-three/fiber` and `@react-three/drei`.
- **Coordinate System**: Local metric Cartesian frame $(x, y, z)$ centred at the field platform origin $(E_0, N_0, 0)$ where $x = \text{Easting} - E_0$, $y = \text{Northing} - N_0$, and $z = -\text{Depth}_{\text{TVD}}$.
- **Rationale**: Eliminates 32-bit floating point precision jitter. Raw UTM values (~6.48 million) consume 23 bits of mantissa, causing 0.09m–0.5m vertex snapping/shivering. Local metric offsets keep coordinates $< 10,000$, ensuring sub-millimeter precision ($< 0.0001\text{ mm}$).
- **Spike Evidence (`scripts/spikes/r3f_frame_spike.cjs`)**:
  - Raw UTM Northing $6,478,566.09$ in Float32 produced **0.0900m quantization jitter**.
  - Local frame offset ($6.09\text{m}$) in Float32 produced **$0.00000015\text{m}$ ($< 0.0002\text{ mm}$) error**.
  - Slicing plane math tested with North/South plane at $y=500\text{m}$; points accurately clipped/rendered deterministically.

### Decision C: UI Architecture — React + TypeScript + Vite (`web/`)
- **Choice**: Modern SPA built in `web/` using Vite 8, React 19, TypeScript 5.9, Zustand 5 for single selection state, and TanStack Query 5 for caching.
- **Styling**: Vanilla CSS design tokens (`tokens.css`) strictly following UX4G principles and WCAG 2.1 AA (min 12px font, 4.5:1 contrast, Noto Sans typography).
- **Type Generation**: Automated TypeScript types from FastAPI OpenAPI specification via `openapi-typescript`.
- **Legacy Retention**: Legacy vanilla JS app safely moved to `/legacy` behind an informative archive banner.

### Decision D: Data Formats & Transmission
- **Surface**: GeoJSON for wellheads, exploration blocks, and cultural features.
- **Gridded Surfaces**: Binary `Float32Array` regular grids (origin $E_0, N_0$, spacing $\Delta x, \Delta y$, dimensions $n_x, n_y$) served with `Content-Type: application/octet-stream`.
- **Log Curves**: Binary arrays or downsampled JSON using the Largest-Triangle-Three-Buckets (LTTB) algorithm (server-side reduction from 50,000 points to 1,500 points for smooth 60 fps canvas rendering).
- **Elevation**: Open standard Terrain-RGB PNG tiles.

### Decision E: Database Architecture — SQLite + R-Tree (PostGIS Ready)
- **Choice**: Keep SQLite at `data/nwis.db` with R-Tree spatial index for the demo. Maintain clean repository patterns in `backend/app/db/repositories/`.
- **Phase 7 Roadmap**: Provide optional Docker Compose configuration for PostgreSQL 16 + PostGIS 3.4 with an automated migration script (`scripts/migrate_to_postgis.py`).

### Decision F: Frontend-Backend Link — REST + WebSocket
- **REST (FastAPI)**: Bounding-box filtered GeoJSON, ETag caching (`If-None-Match`), gzip/brotli compression.
- **WebSocket (`/api/telemetry/ws`)**: High-frequency real-time telemetry playback with automatic, transparent fallback to 500ms REST polling upon disconnect.
- **No GraphQL**: Minimizes overhead and complexity.

### Decision G: Demo Data & Workspace Strategy
- **Workspace A ("Volve — Real Public Data")**:
  - Authentic Equinor Volve dataset.
  - Formation surfaces generated only when $\ge 3$ control wells exist with valid tops.
  - Unreviewed incident status preserved.
  - No synthetic wells (A-17, B-04) or fake formations (Jodhpur Sandstone).
- **Workspace B ("Demo Onshore Block — Synthetic Subsurface")**:
  - Deterministically seeded generator (`scripts/generate_demo_block.py`) with fixed seed.
  - Real public surface DEM/satellite imagery overlaid on 6–8 synthetic geological surfaces with realistic dip, fault throws, and synthetic mud logs.
  - Strict visible isolation: chips and persistent banner on every screen.

---

## 4. Geodetic Validation & CRS Transformation Proof

A critical finding from our Phase 0 investigation verified the datum of the Volve field coordinates:
- **Source Coordinate Reference System**: ED50 / UTM Zone 31N (EPSG:23031).
- **Target Web CRS**: WGS84 Geographic (EPSG:4326).
- **Spike Evidence (`scripts/spikes/test_crs_spike.py` & `scripts/spikes/crs_converter.py`)**:
  - Well `15/9-F-12` published UTM: Easting = $435,050.25\text{m}$, Northing = $6,478,566.09\text{m}$.
  - Prior legacy code directly treated the ED50 geographic coordinates $(58.441636^\circ\text{N}, 1.887483^\circ\text{E})$ as WGS84.
  - Rigorous transformation using standard North Sea 7-parameter Bursa-Wolf shift (EPSG:1612: $dX=-87\text{m}, dY=-98\text{m}, dZ=-121\text{m}$) and PROJ reveals true WGS84 coordinates:
    $$\text{Lat} = 58.441021^\circ\text{N}, \quad \text{Lon} = 1.885889^\circ\text{E}$$
  - **Datum Discrepancy**: $115.8\text{ meters}$ offset ($68.4\text{m}$ North, $92.9\text{m}$ East).
  - The new platform will apply explicit CRS conversion on ingestion to guarantee meter-accurate spatial alignment with satellite and bathymetry layers.

---

## 5. WebGL Context Lifecycle & Memory Safety

To ensure mid-range laptops do not crash or stutter when switching between MapLibre (Surface) and Three.js (Subsurface / Near-Well):
1. **Single Active Canvas Engine**: Only one WebGL context is rendered at full cost.
2. **Deterministic Disposal Hook**: Upon unmounting Three.js:
   - Geometries `.dispose()`
   - Materials and shader programs `.dispose()`
   - Textures and render targets `.dispose()`
   - WebGL context gracefully released via `.loseContext()`.
3. **Spike Verification (`scripts/spikes/webgl_disposal_spike.cjs`)**:
   - 20 complete mode switches executed.
   - Resource counters returned to exactly 0 active geometries, 0 materials, 0 textures, and 0 active WebGL contexts across all 20 iterations.
