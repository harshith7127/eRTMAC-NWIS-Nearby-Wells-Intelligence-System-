# NWIS Data Lineage and Provenance Specification

## 1. Overview and Architecture

The **Nearby Wells Intelligence System (NWIS)** ingests, harmonizes, analyzes, and visualizes drilling operations and offset well data. To ensure engineering trust and regulatory clarity, all datasets, computations, and visual layers adhere to a strict 4-tier Provenance Standard.

### Provenance Classification Taxonomy
1. **`REAL`**: Authentic historical or measured field records from verified public / operator repositories (specifically Equinor Volve Open Data). Never falsely attributed to other operators or basins.
2. **`DERIVED`**: Deterministic physical, geometric, statistical, or rule-based calculations computed directly from REAL or SYNTHETIC inputs (e.g., Euclidean/Haversine distance, rolling variance, deterministic stratigraphy alignment).
3. **`SYNTHETIC`**: Programmatically generated demo fixtures with realistic engineering parameters (e.g., Jaisalmer Basin demo coordinates and offset profiles) used for UI validation and offline sandboxing.
4. **`ILLUSTRATIVE`**: Simulated scenarios and what-if training models (e.g., synthetic kick/loss profiles, mitigation dampening sliders). Must always be isolated from historical observations.

---

## 2. Data Source Inventory and Lineage Matrix

| Dataset / Stream | Primary Source | Provenance Type | Consumers / Screens | Generation Pipeline | Technical Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Volve Drilling Telemetry** | Equinor Volve Field 15/9-F-12 (North Sea open data) | `REAL` | Live Operations, Volve Replay, Real-time Charts, 3D Well Path | Extracted from high-resolution CSV (`Norway-StatoilHydro-15_9-F-4_depth.csv` / WITSML logs) via `scripts/build_volve_dataset.py`. | Telemetry is historical playback. Sampled at discrete depth intervals; no live WITS0/WITSML streaming socket attached. |
| **Volve Daily Drilling Reports (DDRs)** | Equinor Volve 15/9-F-12 & 15/9-F-15 Drilling Morning Reports | `REAL` | DDR Intelligence, Reports Explorer, Evidence Drawer | Pre-extracted text chunks and operational summaries parsed from daily operational PDFs/records. | Unstructured natural language logs with variable terminology and recording fidelity. |
| **Volve Historical Incidents** | Volve DDR operational anomaly logs | `REAL` (Unreviewed by default) | Risk Intelligence, Offset Incidents Table, Explainable Rule Triggers | Regex and keyword heuristic extraction (`engine.js`). Every extracted incident defaults to `reviewed: false`. | Heuristic extraction may encounter false positives; requires human rig engineer verification (`reviewed: true`). |
| **Volve Stratigraphy & Formations** | Official Volve geological tops (Hordaland, Rogaland, Heimdal, Chalk, Shetland, etc.) | `REAL` | Formation Correlation, Lithology Column, 3D Geomodels | Lithostratigraphic tops table mapped directly from Equinor Volve composite logs. | Top boundaries are fixed per wellbore without dynamic 3D seismic surface interpolation. |
| **Synthetic Jaisalmer Fixtures** | Programmatic sandbox fixtures (`nwis-data.js`) | `SYNTHETIC` | Well Explorer, Demo Offset Grid, Offline Sandboxing | Deterministic coordinate seeds (`27.5000 N, 71.5000 E`) and engineering lithology models (Jodhpur Sandstone, Reactive Shale). | Purely illustrative demonstration fixtures; not representative of actual subsurface logs. |
| **Rolling Telemetry Statistics** | Real-time / Replay Telemetry Engine | `DERIVED` | Anomaly Banner, Risk Radar, Command Center | In-memory sliding window computation (mean, standard deviation, d-exponent, torque gradient). | Window size depends on replay buffer; sensitivity is heuristic. |
| **Offset Spatial Distance** | Well coordinate geometry (`engine.js`) | `DERIVED` | Proximity Matrix, Spatial Search, Radar Map | Great-circle Haversine / Euclidean coordinate distance computation in km. | Uses surface / top-hole coordinate offsets; 3D dogleg survey interpolation to be upgraded in Phase 3. |
| **Stratigraphy Formation Matching** | Jaccard / Token Similarity (`engine.js`) | `DERIVED` | Formation Alignment, Offset Comparison | Deterministic n-gram token overlap scoring (e.g. `Jodhpur Formation` vs `Jodhpur Sandstone`). | Textual string similarity; does not yet ingest gamma-ray log curve cross-correlation. |
| **Analogue Similarity Matching** | Multi-factor weighted matrix (`command-engine.js`) | `DERIVED` | Analogue Ranker, Offset Well Cards | Deterministic composite index combining Formation Match, Proximity, Depth Delta, and Mud Program availability. | Clearly labeled as Deterministic Analogue Match; NOT a black-box AI/ML probability. Missing fields are explicitly marked 'Not available'. |
| **Scenario Simulations** | Synthetic event generator (`command-engine.js`) | `ILLUSTRATIVE` | Training Simulation Sandbox | Synthetic parameter perturbation curves (stuck pipe, kick influx, circulation loss) and mitigation dampening sliders. | Isolated exclusively to the `TRAINING / SIMULATION` environment; strictly forbidden from modifying real historical records. |

---

## 3. Incident Review and Trust Governance

To prevent unverified automatic extractions from corrupting operational evidence:
1. **Default Status**: Every incident parsed from text has `reviewed: false`.
2. **Review Action**: Drilling engineers can verify an incident (`reviewed: true`) via the Verification Workflow in the Incident Library and Evidence Drawer.
3. **Exclusion vs Review**:
   - `reviewed`: Indicates whether an engineer has audited the extraction accuracy.
   - `excluded`: Indicates whether an engineer has deliberately chosen to omit the incident from active risk calculations.

---

## 4. Single Source of Truth for Active Well

All user interface views bind to a single reactive state object:
```javascript
activeWellState = {
  wellId: '15/9-F-12',
  wellName: '15/9-F-12 (Volve Active)',
  wellboreId: '15/9-F-12 Main',
  currentDepth: 1842.49,
  depthBasis: 'MD',
  formation: 'Upper Hordaland Shale',
  dataset: 'VOLVE_PUBLIC',
  provenance: 'REAL'
};
```
Whenever `window.setActiveWell(wellId)` is invoked, all dependent headers, 3D viewers, lithology charts, and telemetry monitors update synchronously to guarantee zero stale visible state.

---

## 5. Legacy Screen Ingestion vs. New Platform Architecture

| Screen / Feature | Legacy Ingestion Source | Flaws / Fake Data Identified | New Architecture Source (`web/`) | New Endpoint | Provenance Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Map View** | Canvas 2D (`app.js`) rendering static Cartesian projection | Flattened UTM coords, no terrain, no bathymetry, co-located wells stacked | MapLibre GL JS vector tiles + Terrain-RGB bathymetry | `GET /api/wells?bbox=&workspace=` | `REAL` (with `DERIVED` trajectories) |
| **Well Inspector** | Hardcoded JSON (`public/volve-data.json`) | Stuck pipe at 2052m, synthetic wells A-17/B-04 leaking in | Dynamic FastAPI well profile with actual DDRs & picks | `GET /api/wells/{id}` | `REAL` |
| **Subsurface 3D** | Pseudo-3D canvas projection in `app.js` | Disconnected from real depths, no clipping plane, no formation surfaces | Three.js / R3F with local metric frame & Float32 binary grids | `GET /api/surfaces/{id}` | `DERIVED` (kriging from $\ge 3$ control tops) |
| **Look-Ahead Tab** | Hardcoded similarity scores (34/51/39) in `volve-replay.js` | Claimed "no hazard observed" when 5 offset wells lacked DDRs | Deterministic 300m look-ahead engine with covered denominator ($k$ of $N$) | `GET /api/offset/lookahead` | `DERIVED` from verified reports |
| **Well Logs & Mud Log** | Static mock canvas lines | Arbitrary gamma-ray & ROP curves without downsampling | Canvas vertical tracks with LTTB downsampling (<100ms linked cursor) | `GET /api/wells/{id}/logs` & `GET /api/wells/{id}/mud-log` | `REAL` |
| **Site Analysis** | Arbitrary percentage score (e.g. "82% suitability") | Made-up composite probability violating R4 | Explainable checklist: factor, value, status (OK/UNKNOWN/CONCERN), rule text | `GET /api/locations/analyze` | `DERIVED` |
| **Copilot / Chat** | Browser `localStorage` Groq API key | Sent unencrypted well parameters to external third-party | Optional, disabled-by-default server-side proxy with user consent notice | `POST /api/copilot/chat` | `DERIVED` (governed) |

