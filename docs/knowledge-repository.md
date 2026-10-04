# NWIS Knowledge Repository, Evidence Search & Source Traceability (Phase 7)

## Overview & Mission

The **NWIS Knowledge Repository and Engineer-Facing Knowledge Dashboard** provides rigorous, evidence-traceable retrieval answering the primary operational question:

> *"What happened in nearby wells at this depth and formation, and is the current well approaching a similar situation?"*

The system enables drilling engineers to navigate a transparent, verified decision-support chain:
```
CURRENT WELL
    ↓
CURRENT DEPTH / FORMATION (MD / TVD / Relative Depth Below Top)
    ↓
NEARBY / OFFSET WELLS (Proximity & Stratigraphic Alignment)
    ↓
HISTORICAL EVENTS (Loss, Kick, Stuck Pipe, Tight Hole)
    ↓
SOURCE EVIDENCE (Verbatim DDR & WCR Text Spans)
    ↓
HISTORICAL PRACTICE / ACTION (Offset Well Response)
    ↓
LOOK-AHEAD CONTEXT (Phase 4 Deterministic K-of-N Horizon)
```

---

## Non-Negotiable Operational Principles

1. **Strict Provenance on Every Statement**: Every data point and document record is explicitly labeled as `REAL` (Equinor Volve open data), `DERIVED` (stratigraphic alignment / distance calculations), `SYNTHETIC` (Jaisalmer demo fixtures), or `ILLUSTRATIVE` (simulated telemetry / uncalibrated sensors).
2. **Deterministic Historical Reporting**: Historical actions are preserved verbatim and formatted strictly as:
   ```
   "Historical offset practice: Offset well {well} recorded action: {action}"
   ```
   The system **NEVER** issues autonomous recommendations or commands (e.g., never says *"Recommended: reduce flow rate"*).
3. **Evidence Traceability & Anti-Fabrication**: Every event is tied to an authentic source document (DDR/WCR). If exact source text or depth is unrecorded, the system explicitly states:
   ```
   "Source evidence not recorded."
   ```
   Missing fields are never synthesized or converted into speculative predictions.
4. **Authoritative Baseline Architecture**:
   - **Phase 4 K-of-N Rule Engine**: Remains the authoritative operational decision-support baseline.
   - **Phase 6 Machine Learning**: Evaluated offline; status remains **`NOT_SHIPPED`** (did not exceed the +0.05 PR-AUC gate over Phase 4 baseline).
   - **Zero Fake AI Probabilities**: No unsupported risk percentages or speculative AI confidence metrics are presented to the engineer.
5. **Volve Prototype Dataset Identity**: Equinor Volve Field (Norwegian North Sea Block 15/9) is an open research dataset. Measured metrics do not transfer directly to Oil India operational formations. The live rig connector (eRTMAC) is explicitly **`NOT_CONNECTED`**.

---

## Canonical Knowledge Repository Entities

The repository models canonical drilling and subsurface entities in SQLite (`data/nwis.db`) and memory:

| Entity | Description | Primary Key / Identifier | Provenance |
| :--- | :--- | :--- | :--- |
| **Well** | Physical well identifier, location (ED50 / UTM 31N & WGS84), field, operator | `well_id` (e.g., `15/9-F-12`) | `REAL` |
| **Wellbore** | Specific drilled trajectory path | `wellbore_id` (e.g., `15/9-F-12-WB1`) | `REAL` |
| **Formation** | Geological formation definition | `formation_name` (e.g., `Hugin`) | `REAL` |
| **Formation Top** | Stratigraphic boundary depth marker in a wellbore | `top_id` / `(wellbore_id, formation_name)` | `REAL` |
| **Report / Document** | Daily Drilling Report (DDR) or Well Completion Report (WCR) | `report_id` (e.g., `DDR-F12-01`) | `REAL` |
| **Event** | Historical drilling hazard (Loss, Kick, Stuck Pipe, Pack-off) | `event_id` (e.g., `EVT-F9-LOSS-01`) | `REAL` |
| **Evidence Span** | Verbatim excerpt tied to report and event | `evidence_id` (e.g., `EV-EVT-F9-LOSS-01`) | `REAL` |
| **Casing** | Installed casing string and shoe depth | `casing_id` (e.g., `CSG-13-3/8`) | `REAL` |
| **Mud Program** | Operating mud type, density, and interval | `mud_id` (e.g., `MUD-01`) | `REAL` |
| **Historical Practice** | Logged corrective or preventive action from DDR | `action` attribute on Event | `REAL` |

---

## REST API Endpoints

All endpoints are hosted under `/api/knowledge`:

### 1. Unified Knowledge Search
```http
GET /api/knowledge/search
```
**Parameters**:
- `query` (string, optional): Full-text search across events, formations, well names, DDR text, and summaries.
- `well_id` (string, optional): Filter by well name.
- `wellbore_id` (string, optional): Filter by specific wellbore.
- `formation` (string, optional): Filter by canonical formation name.
- `event_type` (string, optional): `LOSS`, `KICK`, `STUCK_PIPE`, `TIGHT_HOLE`, `PRESSURE_ANOMALY`.
- `document_type` (string, optional): `DDR`, `WCR`, `WITSML`.
- `depth_min` / `depth_max` (float, optional): Measured depth window in metres.
- `date_from` / `date_to` (string, optional): ISO date filter.
- `reviewed_only` (bool, default `false`): Restrict results to engineer-reviewed records.
- `provenance` (string, default `ALL`): `REAL`, `DERIVED`, `SYNTHETIC`, `ILLUSTRATIVE`.
- `limit` (int, default `50`): Result count limit.
- `offset` (int, default `0`): Pagination offset.

**Sample Response**:
```json
{
  "total_count": 24,
  "offset": 0,
  "limit": 50,
  "results": [
    {
      "result_type": "EVENT",
      "item_id": "EVT-F9-LOSS-01",
      "event_id": "EVT-F9-LOSS-01",
      "well_id": "15/9-F-9",
      "well_name": "15/9-F-9",
      "wellbore_id": "15/9-F-9-WB1",
      "formation": "Hugin",
      "event_type": "LOSS",
      "depth": 3180.0,
      "depth_basis": "MD",
      "summary": "Total loss of returns (50 m3/hr) while drilling through fractured sandstone.",
      "historical_practice": "Historical offset practice: Offset well 15/9-F-9 recorded action: Pumped 20 m3 high-vis LCM pill and reduced flow rate",
      "report_id": "DDR-F9-01",
      "evidence_id": "EV-EVT-F9-LOSS-01",
      "evidence_text": "Experienced total loss of circulation at 3180m MD in Hugin formation. Pumped LCM pill.",
      "provenance": "REAL",
      "reviewed": true,
      "date": "2007-06-15"
    }
  ],
  "provenance_summary": {
    "REAL": 24,
    "DERIVED": 0,
    "SYNTHETIC": 0,
    "ILLUSTRATIVE": 0
  },
  "data_gaps": []
}
```

### 2. Event Lineage & Evidence Detail
```http
GET /api/knowledge/events/{event_id}
```
Returns comprehensive event metadata, stratigraphic location, source DDR report, verbatim evidence excerpt, and historical offset practice.

### 3. Report Metadata & Evidence Spans
```http
GET /api/knowledge/reports/{report_id}
```
Returns full document metadata, full report text, associated historical events, and all extracted evidence spans.

### 4. Active-Well Integrated Knowledge Context
```http
GET /api/knowledge/context?active_well=15/9-F-12&current_md=1842.5&formation=Upper%20Hordaland%20Shale&radius_km=25.0&lookahead_m=300.0
```
Combines Phase 2 proximity, Phase 3 stratigraphic alignment, Phase 4 K-of-N lookahead, casings, mud programs, historical practices, and explicit data gaps into a unified active-well context response.

### 5. CSV Export
```http
GET /api/knowledge/export/csv
```
Returns a downloadable, standard CSV stream containing filtered event and evidence records with provenance and review metadata.

---

## Frontend Components & Engineer Workflow

1. **Active Well Position Card**: Displays active wellbore, MD, TVD, canonical formation, relative depth below formation top, and data provenance.
2. **Interactive Search & Filter Bar**: Instant multi-dimensional filtering by keyword, hazard type, formation, well, depth range, review status, and provenance.
3. **Historical Event Cards**: Renders verified historical incidents with hazard badge, location, verbatim text snippet, historical offset practice box, and source report link.
4. **Unified Evidence Drawer (`openKnowledgeEventDrawer`)**: Modal accessible from Knowledge Cards, Search Results, and the Area Map displaying full evidence lineage, verbatim text, historical practice, and review controls.
5. **Look-Ahead Context Card**: Integrated Phase 4 K-of-N look-ahead prediction (300m MD window) without unsupported AI guesswork.
6. **Data Gap Cards**: Explicitly enumerates unrecorded sensor channels, missing casing records, and prototype boundary limitations.
7. **CSV Export Button**: One-click download of filtered knowledge tables for audit and reporting.

---

## Verification & Test Coverage

- **Backend Pytest Suite**: 148/148 tests passing (including 20 comprehensive tests in `backend/tests/test_knowledge_repository.py`).
- **Frontend JavaScript Suite**: 9/9 test suites passing (including 20 comprehensive assertions in `tests/knowledge-repository.test.cjs`).
- **Build & Syntax Verification**: `npm run build` cleanly validates all distribution assets.
- **Model Status Preservation**: Phase 6 evaluation status remains **`NOT_SHIPPED`** and Phase 4 K-of-N deterministic rule engine remains the operational baseline.
