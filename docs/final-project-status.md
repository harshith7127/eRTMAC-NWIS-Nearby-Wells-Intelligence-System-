# NWIS Final Project Status Report (Phase 8N)

## 1. Project Objective

The **National Well Intelligence System (NWIS)** was conceived and developed to solve a critical operational challenge in modern drilling engineering: enabling drilling teams to anticipate ahead-of-bit subsurface hazards by dynamically retrieving, stratigraphically aligning, and contextualizing historical offset well experiences with real-time operational telemetry.

---

## 2. Core Question

> *"How can a drilling team on an active rig anticipate upcoming geological and mechanical hazards within the next 100 to 500 meters, using verified offset well evidence and real-time telemetry, without relying on ungrounded black-box predictions?"*

NWIS answers this question through:
1. Deterministic Stratigraphic Alignment across 3D trajectories.
2. Deterministic K-of-N Offset Evidence Ratio Calculation.
3. Direct Evidence Lineage to primary Daily Drilling Reports (DDRs).
4. Full Provenance Transparency across all data layers.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NWIS DUAL-TIER ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────┤
│ FRONTEND (Standalone / Hybrid SPA):                                    │
│   index.html | app.js | api-client.js | nwis-data.js                   │
│   command-engine.js | volve-replay.js | witsml-parser.js               │
│   workbench.js (Three.js 3D spatial view)                              │
│   - Robust offline fallback executing all algorithms locally in JS     │
├────────────────────────────────────────────────────────────────────────┤
│ BACKEND (FastAPI / SQLite):                                            │
│   main.py | db.py (SQLite: data/nwis.db)                               │
│   Routers: wells, events, reports, place, offset, telemetry,           │
│            lookahead, ml_evaluation, knowledge                         │
│   Services: well_service, formation_service, trajectory_service,       │
│             lookahead_service, telemetry_service, ml_pipeline,         │
│             knowledge_service                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implemented Phases Summary

- **Phase 0**: Architecture Stabilization, Canonical Provenance Badging, Single Source of Truth.
- **Phase 1**: Canonical Data Model, SQLite Schema, FastAPI Endpoints, Volve Corpus Import.
- **Phase 2**: Spatial Place Query, Haversine Radius Filtering, Offset Well Retrieval.
- **Phase 3**: Formation Alignment, Controlled Vocabulary, Minimum-Curvature 3D Trajectories.
- **Phase 4**: Deterministic K-of-N Look-Ahead Rule Engine, Historical Practice Evidence Drawer.
- **Phase 5**: Canonical Telemetry Replay Controller, WITSML Log Parser, eRTMAC Protocol Stub.
- **Phase 6**: LOWOCV Machine Learning Pipeline, Leakage Prevention, Governance Model Card.
- **Phase 7**: Knowledge Repository, Multi-Field Search, Active Context, CSV Report Export.
- **Phase 8**: Full System Audit, End-to-End Evaluation, Pilot Readiness, Backtesting, Demo Script.

---

## 5. Data Sources

| Source | Description | Provenance |
|---|---|---|
| **Equinor Volve Open Data** | Well completion reports, 60 formation tops, 80 DDRs | `REAL` |
| **Norwegian Petroleum Directorate (Sodir)** | Official wellhead coordinates, NPD IDs, field boundaries | `REAL` |
| **Volve WITSML Logs** | 10-channel drilling sensor logs for 15/9-F-12 | `REAL` |
| **Spatial & Stratigraphic Engines** | Minimum curvature trajectories, TVD, relative depths, K/N | `DERIVED` |
| **Jaisalmer Demo Top Fixtures** | Isolated sandbox fixture for demo testing | `SYNTHETIC` |

---

## 6. Current Functionality

- **Active Well Monitoring**: Dynamic tracking of measured depth, true vertical depth, and current geological formation.
- **Stratigraphic Look-Ahead**: Configurable look-ahead windows (100m, 200m, 300m, 500m, 1000m) evaluating upcoming offset hazards.
- **Explainable Evidence Drawer**: Instant inspection of primary source documents, original incident text, and historical engineering actions.
- **WITSML Telemetry Replay**: Real-time playback of authentic drilling telemetry with manual playback controls (Play, Pause, Step, Seek).
- **Interactive 3D Workbench**: Three.js spatial trajectory visualization showing active and offset wellbores.
- **Knowledge Search & Export**: Filtered search by well, formation, hazard type, severity, and review status, with one-click CSV export.

---

## 7. Evaluation Results

- **Dataset**: 6 Volve wells, 662 depth intervals (30m intervals), 34 positive hazard intervals.
- **Phase 4 Baseline**:
  - PR-AUC: `0.0514`
  - Alert frequency: `5.74 alerts / 1000m`
  - Total alerts: `114`
- **Machine Learning (Logistic Regression & Gradient Boosting)**:
  - PR-AUC: `0.0514` (Delta over baseline: `0.0000`, failing the required `+0.05` margin)
  - Data leakage violations: `0`

---

## 8. Machine Learning Decision

- **Verdict**: **`model_status = NOT_SHIPPED`**
- **Rationale**: Supervised learning models failed to outperform the deterministic rule baseline due to severe class imbalance (18.5:1) and incident concentration in discovery well `15/9-19 A`.
- **Operational Policy**: Phase 4 Deterministic Rule Engine is retained as the sole operational look-ahead mechanism.

---

## 9. Provenance Model

All elements in NWIS are strictly classified into 4 tiers:
1. `REAL`: Direct empirical data from official archives.
2. `DERIVED`: Mathematically computed from real inputs.
3. `SYNTHETIC`: Benchmark test fixtures isolated from operational metrics.
4. `ILLUSTRATIVE`: UI explanatory aids or offline state simulations.

---

## 10. Known Limitations

1. Corpus is based on the Norwegian North Sea Volve field.
2. Volve statistics do not establish Oil India performance.
3. eRTMAC integration is not connected in the prototype.
4. Prototype has not been validated on Oil India operational data.
5. ML is not shipped.
6. Look-ahead alerts depend entirely on available offset documentation.
7. Missing telemetry channels remain missing.
8. Directional survey resolution varies across wells.
9. Historical practice is an engineering record, not an automated recommendation.
10. Prototype replay is not a live rig feed.

---

## 11. Oil India Pilot Requirements

Documented 17-point integration specification covering well master data, trajectory surveys, formation prognoses, DDR document ingestion, real-time WITSML streaming, enterprise SSO, and cybersecurity guidelines.

---

## 12. Demo Instructions

Documented in `docs/demo-script.md`: A 5-minute timed presentation workflow covering Active Well Context (0:00), Area Map (0:30), Evidence Drawer (1:15), Look-Ahead Engine (2:00), Telemetry Replay (2:45), Knowledge Search (3:30), and Final Evaluation / Pilot Readiness (4:15).

---

## 13. Test Status

- **Backend (Pytest)**: 148 passed, 0 failed.
- **Frontend (Node/CommonJS)**: 9 test suites passed, 0 failed.
- **Total Test Count**: 157 passing test cases.

---

## 14. Build Status

- **Build Tool**: Node.js build pipeline (`scripts/build.cjs`).
- **Result**: Clean build, 18 files synchronized to `dist/`, 10 distribution JS files verified for strict syntax validity.

---

## 15. Browser Status

- **Browser Console**: Zero console errors.
- **UI Responsiveness**: Instantaneous view transitions with full local caching and offline fallback capability.

---

## 16. Future Work

1. Integration of historical Oil India Daily Drilling Reports (DDRs) and Well Completion Reports (WCRs).
2. Direct connector into Oil India's eRTMAC (electronic Real-Time Monitoring and Analytics Center).
3. Adaptation of Stratigraphic Controlled Vocabulary for Upper Assam and Rajasthan basins.
4. Rig-floor edge deployment for low-bandwidth offshore or remote desert operations.
5. Supervised and self-supervised model re-evaluation once an expanded multi-basin training corpus is digitized.
