# NWIS Final System Audit (Phase 8A)

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER (Static)                       │
│  index.html → app.js → api-client.js → nwis-data.js     │
│  engine.js / command-engine.js / volve-replay.js          │
│  witsml-parser.js / workbench.js / volve-data-bundle.js  │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (optional FastAPI)
┌──────────────────────▼───────────────────────────────────┐
│                  FastAPI Backend                          │
│  main.py → routers/ → services/ → db.py                 │
│  SQLite: data/nwis.db                                     │
└──────────────────────────────────────────────────────────┘
```

**Deployment model**: Static HTML/JS served from `dist/`. Backend is optional — all critical functionality has local JS fallback in `api-client.js`.

---

## 2. Frontend

| File | Size | Purpose |
|---|---|---|
| `index.html` | 14 KB | SPA shell, nav tabs, modals, meta |
| `app.js` | 247 KB | All views, rendering, state management |
| `api-client.js` | 86 KB | API + local fallback for all endpoints |
| `nwis-data.js` | 46 KB | Canonical well/event/formation data |
| `engine.js` | 6 KB | Distance, filtering, keyword extraction |
| `command-engine.js` | 9 KB | Pre-formation brief engine |
| `volve-data-bundle.js` | 622 KB | Volve telemetry replay data |
| `volve-replay.js` | 12 KB | Deterministic replay controller |
| `witsml-parser.js` | 8 KB | WITSML XML parser |
| `workbench.js` | 23 KB | 3D spatial workspace (Three.js) |
| `command.js` | 0.3 KB | Command module bootstrap |
| `command.css` | 26 KB | Main stylesheet |
| `workbench.css` | 6 KB | Workbench stylesheet |

---

## 3. Backend

### Services (13 files)
| Service | Phase | Purpose |
|---|---|---|
| `well_service.py` | 1 | Well/wellbore CRUD, haversine distance |
| `event_service.py` | 1 | Event search, review, exclusion |
| `report_service.py` | 1 | Report retrieval |
| `place_service.py` | 2 | Geographic place query |
| `offset_service.py` | 2 | Offset well/event retrieval |
| `formation_service.py` | 3 | Formation alignment, canonical names |
| `trajectory_service.py` | 3 | Minimum curvature, TVD/closestApproach |
| `lookahead_service.py` | 4 | K-of-N rule engine |
| `telemetry_service.py` | 5 | Replay, WITSML, eRTMAC stub |
| `ml_dataset_service.py` | 6 | LOWOCV dataset generation |
| `ml_evaluation_service.py` | 6 | ML pipeline, metrics, ship decision |
| `knowledge_service.py` | 7 | Knowledge search, context, CSV export |

### Routers (10 files)
| Router | Prefix | Endpoints |
|---|---|---|
| `health.py` | `/api/health` | Health check |
| `wells.py` | `/api/wells` | Wells, wellbores, formation tops |
| `events.py` | `/api/events` | Event CRUD, review |
| `reports.py` | `/api/reports` | Report retrieval |
| `place.py` | `/api/place` | Place query |
| `offset.py` | `/api/offset` | Offset wells/events |
| `lookahead.py` | `/api/offset/lookahead` | K-of-N look-ahead |
| `telemetry.py` | `/api/telemetry` | Replay, WITSML, eRTMAC |
| `ml_evaluation.py` | `/api/ml` | Evaluation, model card |
| `knowledge.py` | `/api/knowledge` | Search, detail, context, CSV |

---

## 4. Database (SQLite)

| Table | Rows | Purpose |
|---|---|---|
| `wells` | 6 | Volve wells |
| `wellbores` | 6 | One wellbore per well |
| `surveys` | 25 | Trajectory (15/9-F-9 only) |
| `formation_tops` | 60 | 10 tops per well |
| `reports` | 80 | DDRs (15/9-19 A only) |
| `events` | 24 | Drilling incidents (15/9-19 A only) |
| `casings` | 4 | Casing records |
| `mud_programs` | 6 | Mud weight/type |
| `formation_aliases` | 43 | Controlled vocabulary |

---

## 5. Data Sources

| Source | Type | Provenance |
|---|---|---|
| Equinor Volve Open Data | Well registers, DDRs, formation tops | REAL |
| NPD (Norwegian Petroleum Directorate) | Well coordinates, nomenclature | REAL |
| Volve WITSML logs | Telemetry replay | REAL |
| Minimum curvature calculations | TVD, closest approach, relative depth | DERIVED |
| K-of-N rule engine | Alert severity, coverage | DERIVED |
| Jaisalmer demo formations | Synthetic demo only | SYNTHETIC |

---

## 6. Known Limitations

1. **Events concentrated in 15/9-19 A** — other 5 wells have zero events in the database.
2. **Surveys only for 15/9-F-9** — other wells use wellhead fallback for distance.
3. **Reports only for 15/9-19 A** — 80 DDRs.
4. **All 24 events are unreviewed** (`reviewed=0`).
5. **eRTMAC is explicitly NOT CONNECTED** — stub only.
6. **ML is NOT_SHIPPED** — no PR-AUC improvement over Phase 4 baseline.
7. **Volve is a public research dataset** — not operational Oil India evidence.
8. **No live rig telemetry** — replay of Volve historical data only.

---

## 7. Terminology Audit

| Term | Status | Location |
|---|---|---|
| "Historical offset practice" | ✅ Consistent | Knowledge cards, evidence drawer |
| "REAL / DERIVED / SYNTHETIC / ILLUSTRATIVE" | ✅ Used | Provenance badges throughout |
| "NOT_SHIPPED" | ✅ Correct | ML evaluation, knowledge dashboard |
| "NOT CONNECTED" | ✅ Correct | eRTMAC status |
| "Historical Offset Monitoring Thresholds" | ✅ Fixed in Phase 8J | Pre-formation brief |
| "Prototype Dataset Notice" | ✅ Present | Knowledge dashboard |

---

## 8. Dead Code / Stale Labels

- **Guided demo steps**: Fixed "Recommended" → "Historical Offset Practice" (Phase 8J).
- **Fake percentage dampening**: Fixed "72%→31%" → evidence-based wording (Phase 8J).
- No other dead code requiring removal identified.

---

## 9. Unsupported Production Claims

None found. All pages clearly state:
- "Volve is a public North Sea prototype research dataset"
- "eRTMAC integration requires Oil India system access"
- "ML Status: NOT_SHIPPED"
