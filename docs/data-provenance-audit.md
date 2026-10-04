# NWIS Data Provenance Audit (Phase 8E)

## 1. Provenance Taxonomy & Strict Classification

In industrial drilling software, confusing simulated scenarios with real-world sensor telemetry or engineering records poses substantial operational hazards. NWIS enforces a strict, four-tier provenance classification model across all API endpoints, frontend views, and evaluation metrics:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PROVENANCE TIERS                           │
├────────────────────────────────────────────────────────────────────────┤
│  REAL          Empirical, unmanipulated field data (Volve / Sodir)      │
│  DERIVED       Mathematically computed from REAL inputs (curvature, K/N)│
│  SYNTHETIC     Generated benchmark / test fixtures (Jaisalmer sandbox)  │
│  ILLUSTRATIVE  Explanatory UI aids & mock telemetry offline states     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Inventory of System Elements & Data Assets

| Component / Asset | Provenance Classification | Primary Source / Algorithm | Verification Status |
|---|---|---|---|
| **Well Coordinates & Headers** | `REAL` | Equinor Volve Open Data / Norwegian Petroleum Directorate (NPD / Sodir) | Verified against public registers |
| **Wellbore Depths & TD** | `REAL` | Volve well completion master files | Verified |
| **Formation Tops** | `REAL` | Well completion reports (60 tops across 6 wells) | Verified |
| **Daily Drilling Reports (DDRs)** | `REAL` | 80 historical DDR logs for 15/9-19 A | Exact source text & dates verified |
| **Drilling Incident Records** | `REAL` | 24 extracted incidents from Volve DDRs | Exact line numbers & context verified |
| **WITSML Telemetry Stream** | `REAL` | 15/9-F-12 real-time sensor logs (10 channels) | Real sensor log replay verified |
| **Haversine Surface Distance** | `DERIVED` | Great-circle distance between wellhead lat/long coordinates | Verified mathematical calculation |
| **3D Minimum Curvature Trajectory** | `DERIVED` | Standard directional survey interpolation algorithm | Verified against 25 survey stations |
| **Stratigraphic Relative Depth** | `DERIVED` | Current depth minus formation top boundary depth | Verified across all formation queries |
| **K-of-N Offset Ratio** | `DERIVED` | Count of incident offsets (K) over penetrated offsets (N) | Deterministic rule output |
| **ML Evaluation Metrics** | `DERIVED` | Leave-One-Well-Out Cross-Validation on REAL Volve intervals | Zero synthetic contamination |
| **Jaisalmer Basin Demo Tops** | `SYNTHETIC` | Rajasthan test fixture for demo environment | Completely isolated from Volve calculations |
| **eRTMAC Protocol Stub** | `ILLUSTRATIVE` | Interface placeholder for future Oil India gateway | Explicitly tagged NOT CONNECTED |
| **Pre-Formation Brief Thresholds** | `ILLUSTRATIVE` | Historical offset parameter envelopes | Clarified as engineering records |

---

## 3. Synthetic Data Isolation Audit

A critical mandate of Phase 8 is ensuring that **synthetic or illustrative data is never mixed into operational metrics or scientific evaluations**.

### Verification Checks:
1. **ML Training & Evaluation Corpus**:
   - Evaluated intervals: 662.
   - Sourced exclusively from the 6 authentic Volve wells (`15/9-19 A`, `15/9-F-11`, `15/9-F-12`, `15/9-F-14`, `15/9-F-15`, `15/9-F-9`).
   - Zero Jaisalmer or synthetic records exist in `data/nwis.db` or `ml_evaluation_result.json`.
2. **K-of-N Look-Ahead Calculation**:
   - Denominator `N` and numerator `K` query only authentic Volve offset wellbores and verified DDR events.
3. **Database Integrity**:
   - `SELECT DISTINCT provenance FROM wells;` → returns `REAL`.
   - `SELECT DISTINCT provenance FROM formation_tops;` → returns `REAL`.
   - `SELECT DISTINCT provenance FROM reports;` → returns `REAL`.
   - `SELECT DISTINCT provenance FROM events;` → returns `REAL`.
4. **UI Provenance Badges**:
   - Every card, chart, and drawer in the user interface clearly renders the respective badge: `REAL` (green), `DERIVED` (cyan), `SYNTHETIC` (amber), or `ILLUSTRATIVE` (purple).

---

## 4. Conclusion & Audit Sign-Off

The audit confirms that the NWIS data pipeline maintains rigorous provenance boundaries. All real-world claims, offset alerts, and performance metrics are strictly grounded in empirical, reproducible Volve field records.
