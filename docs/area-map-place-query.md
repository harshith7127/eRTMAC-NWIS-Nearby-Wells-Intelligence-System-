# Phase 2 — Area Map & Place Query Subsystem

## 1. Overview & Objective

The **Area Map + Place Query Subsystem** implements the fundamental NWIS capability: **"Pick a place and tell me what is known around it."**

Rather than serving as a purely decorative map, the subsystem provides a geospatial and subsurface drilling intelligence tool for drilling engineers. It answers two primary operational questions:
1. *"What is known around this geographic coordinate and radius?"*
2. *"What specific drilling events, casing programs, mud weights, and geological formations were encountered in nearby wellbores at relevant depths?"*

```
   +-------------------------------------------------------------------+
   |                     NWIS Place Query Engine                       |
   +-------------------------------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
   [Geographic Spatial Search]                 [Subsurface Trajectory Search]
   - Great-Circle Haversine                    - 3D Survey Stations (MWD)
   - Radius Filtering (0.5 km - 10 km)         - Closest Approach at Depth
   - Wellhead Coordinate Fallback              - Trajectory Basis Classification
            |                                               |
            +-----------------------+-----------------------+
                                    |
   +-------------------------------------------------------------------+
   |                   Drilling Intelligence Retrieval                 |
   +-------------------------------------------------------------------+
   - Formation Tops (observed vs interpolated)
   - Drilling Events in Depth Window (losses, kicks, sticky hole)
   - Verbatim Source Text & DDR Report Evidence Tracing
   - Casing Specifications & Mud Weights
   - Explicit Data Gaps (missing surveys, missing logs, unreviewed events)
   - Centralized 4-Tier Provenance Breakdown (REAL, DERIVED, SYNTHETIC, ILLUSTRATIVE)
```

---

## 2. Coordinate System & Spatial Calculation

### 2.1 Coordinate Reference Systems
- **Surface Coordinates:** WGS84 decimal degrees (`latitude`, `longitude`) used in API requests and web UI.
- **Volve Field Canonical Coordinates:** European Datum 1950 (ED50) / UTM Zone 31N coordinates (`utm_n`, `utm_e`), converted and verified against official NPD (Norwegian Offshore Directorate) factpages.
- **Subsurface Surveys:** Relative northings (`disp_ns_m`) and eastings (`disp_ew_m`) referenced to wellhead locations.

### 2.2 Great-Circle Distance (Haversine Formula)
Surface distances between the query point $(lat_1, lon_1)$ and wellheads $(lat_2, lon_2)$ are calculated using the Haversine equation:
$$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
$$d = R \cdot \Delta\sigma \quad \text{where } R = 6,371.0\text{ km}$$

---

## 3. Subsurface Trajectory & Closest Approach

When searching around a coordinate at a specific depth $D_{\text{target}}$:
1. **MWD Survey Stations (`SUBSURFACE_SURVEY`):**
   - For wellbores with directional survey records (e.g. wellbore `15/9-F-9` Baker Hughes MWD logs), the system scans trajectory stations within a depth window $[D_{\text{target}} - 250\text{m}, D_{\text{target}} + 250\text{m}]$.
   - It computes the 3D displacement vector $(\Delta x, \Delta y, \Delta z)$ from the query point to each station and finds the minimum Euclidean distance.
   - Sets `trajectory_basis = "SUBSURFACE_SURVEY"`.
2. **Wellhead Fallback (`WELLHEAD_FALLBACK`):**
   - For vertical wellbores or wellbores without digitized trajectory stations, the system calculates distance directly from the surface wellhead.
   - Sets `trajectory_basis = "WELLHEAD_FALLBACK"`.

---

## 4. Drilling Events, Evidence Tracing, & Verification

### 4.1 Depth-Window Event Retrieval
- Events within $\pm 250\text{m}$ (or custom window) of the target depth are surfaced.
- Event types supported: `LOSS` (mud loss/circulation loss), `KICK` (formation fluid influx), `STICKY_HOLE` (overpull/tight hole/drag), `CASING_FAILURE`, `EQUIPMENT_FAIL`.

### 4.2 Verbatim Source Evidence
Each event maintains a direct link to the Daily Drilling Report (DDR) and source text:
- `event_id` $\to$ `wellbore_id` $\to$ `well_id` $\to$ `report_id` $\to$ `verbatim_source_text`.
- The user can click **"Inspect Evidence →"** to view the original report header, timestamp, and unedited morning operations summary.

### 4.3 Explicit Verification Status
- All newly ingested and automated event detections are marked `reviewed: false` until explicitly confirmed by an engineer.
- No synthetic certainty scores or ungrounded percentages are displayed.

---

## 5. Explicit Data Gaps Architecture

Rather than computing deceptive "data quality scores" or "confidence percentages," NWIS explicitly enumerates concrete operational data gaps:
- **Missing Directional Survey:** Wellbore has no MWD stations; subsurface trajectory is inferred from surface wellhead.
- **No Daily Drilling Reports:** Well has no parsed DDR files in the canonical database.
- **Unverified Event Records:** Drilling events detected via rules have not been reviewed by an engineer (`reviewed: false`).
- **Missing Lithology / Tops:** Formation boundary depths are unobserved in the wellbore.

---

## 6. Centralized 4-Tier Provenance Breakdown

All query results aggregate provenance counts across the 4 canonical tiers:
1. **`REAL` (PUBLIC VOLVE DATA):** Ingested directly from Equinor/NPD open dataset (DDRs, MWD surveys, lithology logs).
2. **`DERIVED` (DERIVED DATA):** Geometrically computed values (Haversine surface distances, closest approach 3D vectors).
3. **`SYNTHETIC` (SYNTHETIC DEMO):** Synthetic demonstration scenarios clearly identified.
4. **`ILLUSTRATIVE` (ILLUSTRATIVE / SIMULATED):** Hypothetical drilling trajectories or placeholder visual aids.

---

## 7. API Specification: `GET /api/place`

### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `latitude` | `float` | `58.441636` | Target latitude in decimal degrees (WGS84, range: -90 to 90) |
| `longitude` | `float` | `1.887483` | Target longitude in decimal degrees (WGS84, range: -180 to 180) |
| `radius_km` | `float` | `5.0` | Search radius in kilometers (range: 0.1 to 50.0 km) |
| `depth_m` | `float` | `None` | Optional target measured depth in meters (e.g. 3200 m) |
| `dataset` | `str` | `"ALL"` | Dataset filter (`ALL`, `REAL`, `SYNTHETIC`) |
| `event_type` | `str` | `None` | Optional event filter (`LOSS`, `KICK`, `STICKY_HOLE`) |
| `formation_name` | `str` | `None` | Optional formation filter (`Horda`, `Skade`, `Ty`, `Heimdal`) |

### Example Response
```json
{
  "query": {
    "latitude": 58.441636,
    "longitude": 1.887483,
    "radius_km": 5.0,
    "depth_m": 3200.0,
    "dataset": "ALL",
    "event_type": null,
    "formation_name": null
  },
  "nearby_wells": [
    {
      "well_id": "WELL-15-9-F-9",
      "well_name": "15/9-F-9",
      "field": "VOLVE",
      "operator": "StatoilHydro",
      "latitude": 58.441636,
      "longitude": 1.887483,
      "distance_km": 0.0,
      "closest_approach_m": 0.0,
      "trajectory_basis": "SUBSURFACE_SURVEY",
      "status": "CLOSED",
      "spud_date": "2008-04-12",
      "provenance": "REAL"
    }
  ],
  "drilling_events": [
    {
      "event_id": "EVT-F9-LOSS-01",
      "event_type": "LOSS",
      "severity": "HIGH",
      "depth_md": 3180.0,
      "formation": "Hugin Fm.",
      "description": "Total loss of returns (50 m3/hr) while drilling through fractured sandstone.",
      "reviewed": false,
      "well_name": "15/9-F-9",
      "wellbore_name": "15/9-F-9 A",
      "report_id": "DDR-F9-2008-06-14",
      "source_text": "Experienced total loss of circulation at 3180m MD in Hugin formation. Pumped LCM pill."
    }
  ],
  "formation_tops": [
    {
      "well_name": "15/9-F-9",
      "formation_name": "Hugin",
      "top_depth_md": 3150.0,
      "top_depth_tvd": 2980.0,
      "lithology": "Sandstone"
    }
  ],
  "casings": [
    {
      "well_name": "15/9-F-9",
      "casing_size_in": "9 5/8\"",
      "shoe_depth_md": 3050.0,
      "grade": "L-80"
    }
  ],
  "mud_programs": [
    {
      "well_name": "15/9-F-9",
      "mud_type": "Oil Based (OBM)",
      "density_sg": 1.45,
      "from_depth_md": 2500.0,
      "to_depth_md": 3400.0
    }
  ],
  "data_gaps": [
    {
      "well_name": "15/9-F-1",
      "gap_type": "MISSING_SURVEY",
      "description": "No directional survey stations in database; using surface wellhead."
    }
  ],
  "provenance_breakdown": {
    "REAL": 18,
    "DERIVED": 4,
    "SYNTHETIC": 0,
    "ILLUSTRATIVE": 0
  }
}
```

---

## 8. Test Coverage

- **Backend Pytest (`backend/tests/test_place_query.py`):**
  - Default Volve location returns active wells and wellbores within 5 km.
  - Custom coordinates and radius boundaries (0.1 km vs 10 km).
  - Closest approach calculation distinguishing `SUBSURFACE_SURVEY` from `WELLHEAD_FALLBACK`.
  - Depth-window event filtering (±250m).
  - Explicit data gaps list validation.
  - Coordinate validation rejecting invalid latitude (>90) and radius (>50km).
  - 35/35 backend tests passed.
- **Frontend / Client Tests (`tests/place-query.test.cjs`):**
  - Offline fallback `_executeLocalPlaceQuery` with radius filtering.
  - Verification that event `reviewed` status is boolean `false`.
  - Provenance breakdown aggregation.
  - All test suites passing.
