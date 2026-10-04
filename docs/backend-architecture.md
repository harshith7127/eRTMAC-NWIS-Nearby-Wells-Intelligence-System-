# NWIS Backend Architecture Specification

## 1. Architectural Overview

The **Nearby Wells Intelligence System (NWIS)** architecture separates client-side visualization, business and service logic, canonical data storage, and spatial indexing into distinct, decoupled tiers.

```
+-------------------------------------------------------------------------+
|                              FRONTEND SPA                               |
|   (Vanilla JS: Overview, Live Operations, Risk Intel, Well Explorer)    |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                        API CLIENT (api-client.js)                       |
|   (REST consumer with automatic offline fallback & health monitoring)   |
+-------------------------------------------------------------------------+
                                     │ HTTP / REST (JSON)
                                     ▼
+-------------------------------------------------------------------------+
|                          FASTAPI APPLICATION                            |
|             (Pydantic validation, OpenAPI /docs, CORS guards)          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                             SERVICE LAYER                               |
|        - well_service.py (Haversine spatial queries, wellbores)         |
|        - place_service.py (geospatial + subsurface trajectory engine)   |
|        - trajectory_service.py (minimum-curvature interpolation)        |
|        - formation_service.py (formation-at-depth, relative MD/TVD)     |
|        - lookahead_service.py (Phase 4 K-of-N look-ahead rule engine)   |
|        - telemetry_service.py (Phase 5 Volve replay, WITSML, eRTMAC)    |
|        - event_service.py (multi-attribute filtering, review workflow)  |
|        - report_service.py (DDR retrieval & evidence spans)             |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                           SQLITE DATA LAYER                             |
|          (WAL mode, Foreign Keys ON, Indexed drilling entities)         |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                          CANONICAL DATA STORE                           |
|      (data/nwis.db: Wells, Wellbores, Surveys, Formations, Events)      |
+-------------------------------------------------------------------------+
```

### Telemetry to Lookahead Pipeline:
```
Telemetry Source (Volve Replay / WITSML / eRTMAC Stub)
                    ↓
          Telemetry Adapter
                    ↓
      Canonical Telemetry Sample
                    ↓
         Runtime Active Well
                    ↓
    Phase 3 Formation / Relative Depth
                    ↓ (Delta MD >= 5.0m threshold)
          Phase 4 Look-Ahead
                    ↓
     Historical Offset Evidence (K-of-N)
```

---

## 2. Tier Responsibilities

### 2.1 Frontend Tier (`public/`)
- Purely presentation, interaction, 3D Canvas rendering, telemetry replay controls, and local state management.
- Communicates exclusively with the backend via `public/api-client.js`.
- Never executes direct raw database queries or holds duplicate database replicas.
- Features graceful offline fallback: if FastAPI is offline, UI renders fallback fixtures with a clear visual warning indicator (`API: OFFLINE FALLBACK`).

### 2.2 API Client (`public/api-client.js`)
- Standardized typed Promise-based interface (`getWells`, `getNearbyWells`, `searchEvents`, `getReport`, `reviewEvent`).
- Monitors connection health via `/api/health`.

### 2.3 FastAPI Backend (`backend/app/`)
- High-performance asynchronous Python API framework.
- Enforces strict Pydantic request/response validation schemas.
- Generates automatic interactive OpenAPI documentation at `/docs`.
- Restricts CORS access strictly to local development origins.

### 2.4 Service Layer (`backend/app/services/`)
- Encapsulates domain logic for spatial distance computations (Haversine in km), multi-parameter incident filtering (depth interval, formation, type, review status), and report evidence span mapping.

### 2.5 SQLite Data Layer (`data/nwis.db`)
- Embedded ACID database configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and enforced Foreign Keys (`PRAGMA foreign_keys = ON;`).
- Stores data outside frontend public distribution directories to prevent unintended file exposure.

---

## 3. Storage Strategy: SQLite (Phase 1) vs PostgreSQL / PostGIS (Later Phases)

| Characteristic | Phase 1: SQLite Implementation | Future Phases: PostgreSQL / PostGIS |
| :--- | :--- | :--- |
| **Deployment** | Zero-configuration single-file embedded database (`data/nwis.db`). | Client-server relational database cluster. |
| **Spatial Indexing** | Deterministic Python Haversine calculation over surface coordinates. | R-tree spatial index (`ST_DWithin`, `ST_DistanceSphere`, 3D trajectory voxels). |
| **Concurrency** | Single-writer / multi-reader with WAL journaling. | High-concurrency multi-worker connection pooling. |
| **Migration Path** | Schema and Pydantic DTOs match PostgreSQL column structures 1:1, allowing direct migration without modifying frontend API contracts. |

---

## 4. Provenance and Data Lineage Preservation

All database records strictly enforce the 4-tier NWIS Provenance Taxonomy:
- **`REAL`**: Authentic Equinor Volve Field data (`dataset = 'VOLVE_PUBLIC'`).
- **`DERIVED`**: Deterministic calculations (e.g. Haversine distance, rolling statistics).
- **`SYNTHETIC`**: Programmatic demo fixtures (`dataset = 'SYNTHETIC_DEMO'`).
- **`ILLUSTRATIVE`**: Simulated training scenarios and what-if controls.

---

## 5. Developer Startup Workflow

### Terminal 1: Start FastAPI Backend
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```

### Terminal 2: Run Application / Frontend Dev Server
```bash
python -m http.server 4174 --directory dist
```
Or:
```bash
npm run dev
```

### Run Tests:
```bash
# Run Python backend tests (schema, services, API endpoints, integrity, idempotency)
python -m pytest backend/tests

# Run JavaScript engine, command, and consistency tests
npm test
```
