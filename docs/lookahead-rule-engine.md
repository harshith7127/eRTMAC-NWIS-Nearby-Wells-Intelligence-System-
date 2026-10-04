
# Phase 4 — Look-Ahead Rule Engine & Offset Evidence Decision Support Subsystem

## 1. Executive Summary & Core Engineering Principle

During drilling operations, drill crews and drilling engineers repeatedly confront a mission-critical operational question:

> **"Based on nearby offset wells that penetrated this exact formation and relative stratigraphic depth, what drilling hazards historically occurred ahead of our current bit depth?"**

In high-stakes drilling environments, unexplainable "black-box" machine learning predictions and fabricated probability percentages (e.g. *"78% stuck pipe probability"*) are dangerous, unverified, and operationally untrustworthy. 

Phase 4 introduces a **deterministic, explainable, and source-grounded Look-Ahead Rule Engine & Offset Evidence Decision Support Subsystem**. The system strictly replaces speculative ML predictions with rigorous **K-of-N historical offset evidence analysis**, cross-well stratigraphic interval coverage, multi-attribute analogue comparisons, and verbatim Daily Drilling Report (DDR) provenance.

```
                     ACTIVE WELLBORE (e.g. 15/9-F-12)
                     Current Bit Depth: 2,750.0 m MD
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     1. STRATIGRAPHIC BOUNDARY & RELATIVE DEPTH         │
       │     - Resolves canonical formation: Hugin Sandstone    │
       │     - Formation Top: 2,700.0 m MD                      │
       │     - Current Relative Depth: +50.0 m below top        │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     2. LOOKAHEAD WINDOW CALCULATION                    │
       │     - Horizon Window: 300.0 m (Configurable)           │
       │     - Target Stratigraphic Interval:                   │
       │       +50.0 m to +350.0 m below Hugin Top              │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     3. OFFSET COVERAGE & DENOMINATOR (N)               │
       │     - Filters offset wells within Geographic Radius    │
       │     - Verifies actual penetration of target interval   │
       │     - Verified Covered Offset Wellbores: N = 3         │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     4. K-OF-N HISTORICAL HAZARD MATCHING (K)           │
       │     - Matches reviewed historical events in interval   │
       │     - Unique offset wells with Loss events: K = 2      │
       │     - Rule Result: "2 of 3 reviewed offset wellbores   │
       │       encountered repeated LOSS in Hugin (+50 to +350m)│
       │       (15/9-F-14, 15/9-F-15)"                          │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     5. MULTI-ATTRIBUTE ANALOGUE BREAKDOWN              │
       │     - Formation match, interval coverage, survey basis │
       │     - Historical mitigation practice preservation      │
       │     - Provenance tracking (REAL vs DERIVED)            │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Look-Ahead Window Arithmetic & Stratigraphic Alignment

Raw measured depth (MD) varies across offset wells due to geological dip and wellbore trajectory. The Look-Ahead Rule Engine normalizes all offset comparisons to **stratigraphic depth below formation top**:

### Window Arithmetic Formulation:
$$\text{Relative Depth}_{\text{current}} = \text{MD}_{\text{current}} - \text{MD}_{\text{formation\_top}}$$
$$\text{Lookahead Start} = \text{Relative Depth}_{\text{current}}$$
$$\text{Lookahead End} = \text{Relative Depth}_{\text{current}} + \text{Lookahead Window (m)}$$

### Window Presets:
- **100 m**: Immediate hazard horizon (next drilling stand / connection cycle).
- **200 m**: Intermediate section horizon.
- **300 m (Standard Default)**: Standard engineering lookahead horizon.
- **500 m**: Full formation interval lookahead.
- **1000 m**: Deep section / regional formation sequence overview.

---

## 3. Deterministic K-of-N Formulation & Severity Mapping

### Denominator Coverage ($N$):
$N$ is **NOT** simply the count of all wells in the field. $N$ represents the exact count of **reviewed candidate offset wellbores within the specified geographic radius that actually penetrated and logged the queried stratigraphic interval** ($[\text{Lookahead Start}, \text{Lookahead End}]$ below the canonical formation top).

### Evidence Numerator ($K$):
$K$ represents the count of **distinct offset wellbores** that historically recorded a qualifying drilling hazard (e.g. `LOSS`, `KICK`, `TIGHT_HOLE`, `PACK_OFF`, `STUCK_PIPE`) within that exact stratigraphic interval.

### 4-Tier Severity & Status Classification:

| Condition | Severity | Status | Trigger Reason Explanation |
|---|---|---|---|
| $N < 2$ | `INSUFFICIENT_COVERAGE` | `INSUFFICIENT_DATA` | *"Insufficient offset coverage ($N < 2$) to evaluate historical hazard incidence in [Formation] formation within [Radius] km."* |
| $N \ge 2, K = 0$ | `NO_EVIDENCE` | `NO_HAZARD_OBSERVED` | *"0 of $N$ reviewed offset wellbores encountered [Hazard] within [Window] m ahead in [Formation] formation."* |
| $N \ge 2, K = 1$ | `OBSERVED` | `HAZARD_RECORDED` | *"1 of $N$ reviewed offset wellbores encountered [Hazard] within [Window] m ahead in [Formation] formation ([Well A])."* |
| $N \ge 2, K \ge 2$ | `REPEATED` | `REPEATED_HAZARD_CLUSTER` | *"$K$ of $N$ reviewed offset wellbores encountered repeated [Hazard] within [Window] m ahead in [Formation] formation ([Well A, Well B, ...])."* |

> [!IMPORTANT]
> **No Fake Probabilities:** The system never outputs invented probabilities like "83% Risk". It outputs the exact factual ratio: e.g., **"2 of 3 reviewed offset wells"**.

---

## 4. Multi-Attribute Analogue Match Breakdown

Instead of collapsing complex geological and mechanical parameters into a single opaque similarity number, the Look-Ahead Rule Engine decomposes each candidate offset wellbore into explicit, verifiable attribute comparisons:

```
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                CANDIDATE OFFSET WELLBORE COMPARISONS                             |
+──────────────────────────┬──────────────────┬──────────────┬─────────────┬──────────────┬────────+
| Wellbore ID              | Formation Match  | Depth Cover  | Trajectory  | Casing Prog  | Basis  |
+──────────────────────────┼──────────────────┼──────────────┼─────────────┼──────────────┼────────+
| 15/9-F-14 (Offset)       | YES (Hugin)      | YES (+50-350)| YES (MWD)   | YES (9-5/8") | SURVEY |
| 15/9-F-15 (Offset)       | YES (Hugin)      | YES (+50-350)| YES (MWD)   | YES (9-5/8") | SURVEY |
| 15/9-F-11 (Offset)       | YES (Hugin)      | YES (+50-350)| NO (Surface)| YES (13-3/8")| TOPHOLE|
| 15/9-F-1 (Deep Test)     | NO  (Deep Skade) | NO           | YES (MWD)   | YES (7" Lnr) | SURVEY |
+──────────────────────────┴──────────────────┴──────────────┴─────────────┴──────────────┴────────+
```

### Evaluated Attributes:
1. **`formation_match` (boolean)**: Whether the offset well penetrates the target canonical formation.
2. **`relative_depth_coverage` (boolean)**: Whether the offset wellbore trajectory extends through the relative depth interval.
3. **`trajectory_available` (boolean)**: Whether normalized Minimum Curvature directional surveys exist.
4. **`casing_available` (boolean)**: Whether casing string and shoe depth records are available.
5. **`mud_program_available` (boolean)**: Whether mud weight and rheology programs are recorded.
6. **`distance_basis` (enum)**: `SUBSURFACE_SURVEY` (3D interpolated closest approach) or `WELLHEAD_FALLBACK` (surface coordinate distance).
7. **`explanation` (string)**: Complete deterministic explanation string.

---

## 5. Historical Mitigation Action Preservation

When offset wells encountered drilling incidents, Daily Drilling Reports document the actual engineering actions taken by the drill crew and the resulting operational outcome.

The Look-Ahead Rule Engine preserves these historical actions with an unambiguous prefix to prevent confusing historical field records with automated system directives:

- **Format:** `"Historical offset practice: Offset well [Well ID] [verbatim action and outcome recorded in DDR]"`
- **Example:** `"Historical offset practice: Offset well 15/9-F-14 pumped 25 m3 high-viscosity LCM pill (40 ppb Mica/Nutplug) at 2,810 m MD; full returns regained after 1.5 hours."`

> [!NOTE]
> **Engineering Decision Support Only:** All alert payloads and UI views include the explicit operational notice:
> *"Historical offset practice provided for engineering reference only. All drilling operational decisions remain strictly with qualified rig personnel."*

---

## 6. Review & Exclusion Filtering Pipeline

Operational trust requires that unverified or corrupted data does not generate false alarms:

```
                            RAW OFFSET DRILLING EVENTS
                                        │
                                        ▼
                         [ Is excluded == True ? ]
                                   │         │
                           YES ────┘         └─── NO
                            │                     │
                            ▼                     ▼
                       DISCARDED         [ include_unreviewed == True ? ]
                     (Never Used)                 │         │
                                          NO ─────┘         └─── YES
                                           │                     │
                                           ▼                     ▼
                                  [ Is reviewed == True ? ]  INCLUDED
                                           │         │       (Flagged as
                                    NO ────┘         │        Unreviewed)
                                     │               │
                                     ▼               ▼
                                 DISCARDED       INCLUDED
                            (Excluded by default) (Verified)
```

1. **Excluded Events (`excluded=True`)**: If a drilling engineer flags an event as miscorrelated or erroneous, it is immediately and permanently suppressed from lookahead rule evaluations.
2. **Review Status (`reviewed=True/False`)**: By default (`include_unreviewed=False`), only human-verified events trigger operational alerts. Drillers can toggle `include_unreviewed=True` to inspect preliminary unverified reports.

---

## 7. Provenance Preservation & Data Lineage

Every element in the Look-Ahead Rule Engine response maintains strict 4-tier provenance:

| Component | Provenance Tier | Description |
|---|---|---|
| Source DDR Remarks & Depth Logs | `REAL` | Original Equinor Volve Field open data / NPD records |
| Aligned Stratigraphic Intervals & Relative Depths | `DERIVED` | Calculated via Minimum Curvature & formation top offsets |
| Look-Ahead K-of-N Rules & Alert Triggers | `DERIVED` | Evaluated deterministically from verified historical offsets |
| Simulation Injector Scenarios | `SYNTHETIC` | Clearly isolated training drill fixtures |

---

## 8. API Specifications

### `GET /api/offset/lookahead`

Evaluates historical offset evidence and generates deterministic rule-based alerts ahead of the active wellbore.

#### Query Parameters:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `wellbore_id` | string | Yes | — | Canonical active wellbore ID (e.g. `15/9-F-12-WB1`) |
| `current_md` | float | Yes | — | Current measured bit depth in meters |
| `lookahead_m` | float | No | `300.0` | Lookahead window ahead in meters (10 to 2000 m) |
| `radius_km` | float | No | `2.0` | Search radius in kilometers (0.1 to 50.0 km) |
| `event_type` | string | No | `null` | Optional hazard filter (`LOSS`, `KICK`, `TIGHT_HOLE`, etc.) |
| `include_unreviewed`| bool | No | `false` | Whether to include unreviewed DDR events |
| `dataset` | string | No | `VOLVE_PUBLIC` | Dataset filter (`VOLVE_PUBLIC`, `SYNTHETIC_DEMO`, `ALL`) |
| `formation` | string | No | `null` | Optional formation override |

#### Response Structure:

```json
{
  "active_well": {
    "well_id": "15/9-F-12",
    "well_name": "15/9-F-12",
    "wellbore_id": "15/9-F-12-WB1",
    "current_md": 2750.0,
    "canonical_formation_name": "Hugin",
    "current_relative_depth": 50.0,
    "alignment_basis": "FORMATION_TOP_MD"
  },
  "query": {
    "formation": "Hugin",
    "current_relative_depth": 50.0,
    "lookahead_m": 300.0,
    "lookahead_start": 50.0,
    "lookahead_end": 350.0,
    "radius_km": 2.0,
    "include_unreviewed": false
  },
  "coverage": {
    "candidate_offset_wellbores": 4,
    "covered_offset_wellbores": 3,
    "candidate_wellbore_details": [
      {
        "wellbore_id": "15/9-F-14-WB1",
        "well_name": "15/9-F-14",
        "distance_km": 0.42,
        "distance_basis": "SUBSURFACE_SURVEY",
        "formation_match": true,
        "relative_depth_coverage": true,
        "trajectory_available": true,
        "casing_available": true,
        "mud_program_available": true,
        "explanation": "Canonical formation match (Hugin), interval covered (+50m to +350m below top), MWD survey available, casing program recorded."
      }
    ]
  },
  "alerts": [
    {
      "alert_id": "alert_15_9_F_12_WB1_LOSS_Hugin_50_350",
      "event_type": "LOSS",
      "severity": "REPEATED",
      "status": "REPEATED_HAZARD_CLUSTER",
      "k": 2,
      "n": 3,
      "trigger_reason": "2 of 3 reviewed offset wellbores encountered repeated LOSS within 300.0 m ahead in Hugin formation (15/9-F-14, 15/9-F-15).",
      "offset_wells": ["15/9-F-14", "15/9-F-15"],
      "lookahead_start": 50.0,
      "lookahead_end": 350.0,
      "telemetry_context": "Evaluated against 3 covered offset wellbores in Hugin formation. Historical offset evidence only.",
      "provenance": "DERIVED"
    }
  ],
  "evidence": [
    {
      "event_id": "ev_f14_loss_2810",
      "well_name": "15/9-F-14",
      "event_type": "LOSS",
      "relative_depth": 110.0,
      "raw_md": 2810.0,
      "historical_action": "Historical offset practice: Offset well 15/9-F-14 pumped 25 m3 high-viscosity LCM pill (40 ppb Mica/Nutplug) at 2,810 m MD; full returns regained after 1.5 hours.",
      "reviewed": true,
      "excluded": false,
      "provenance": "REAL"
    }
  ],
  "data_gaps": [],
  "provenance_breakdown": {
    "REAL": 14,
    "DERIVED": 3,
    "SYNTHETIC": 0,
    "ILLUSTRATIVE": 0
  }
}
```

---

## 9. Verification & Validation

The Phase 4 Subsystem is verified by exhaustive backend and browser test suites:

1. **Pytest Backend Suite (`backend/tests/test_lookahead_rule_engine.py`)**:
   - Active well stratigraphic context resolution.
   - Lookahead window arithmetic & configurable presets (100m, 200m, 500m, 1000m).
   - Geographic radius and interval coverage filtering.
   - Denominator $N$ calculation and K-of-N rules.
   - Severity states: `INSUFFICIENT_COVERAGE`, `NO_EVIDENCE`, `OBSERVED`, `REPEATED`.
   - Review and exclusion filtering.
   - Deterministic alert explanation and idempotency / deduplication.
   - Multi-attribute analogue comparison breakdown.
   - Provenance preservation and data gap handling.

2. **Node.js Automated Test Suite (`tests/lookahead-rule-engine.test.cjs`)**:
   - Client-side offline fallback lookahead engine.
   - Multi-attribute analogue breakdown validation.
   - K-of-N denominator and numerator invariants ($K \le N$).
   - Historical mitigation action prefix verification.
   - Provenance breakdown integrity.
