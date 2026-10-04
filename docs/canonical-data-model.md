# NWIS Canonical Data Model Specification

## 1. Domain Model Overview

The **Nearby Wells Intelligence System (NWIS)** domain model represents drilling operations, well trajectories, subsurface stratigraphy, daily drilling logs (DDRs), and historical drilling events.

```
       +--------------------+
       |        WELL        |
       +---------+----------+
                 | 1
                 |
                 | has many (1..N)
                 ▼
       +--------------------+
       |      WELLBORE      |
       +---------+----------+
                 │
       ┌─────────┼───────────────────┬───────────────────┐
       │ 1..N    │ 1..N              │ 1..N              │ 1..N
       ▼         ▼                   ▼                   ▼
+------------+ +----------------+ +---------------+ +---------------+
|   SURVEY   | | FORMATION_TOP  | |    CASING     | |  MUD_PROGRAM  |
+------------+ +----------------+ +---------------+ +---------------+
                       │
                       │ observed within (optional)
                       ▼
                 +------------+
                 |   REPORT   |  (DDR, WCR, Mud Log)
                 +-----+------+
                       │ 1..N
                       ▼
                 +------------+
                 |   EVENT    |  (Loss, Kick, Stuck Pipe, Torque)
                 +------------+
```

---

## 2. Canonical Entities & Attributes

### 2.1 `Well`
Represents an individual surface well pad or surface drilling location.
- **`well_id`** (`TEXT`, PK): Unique well identifier (e.g. `15/9-F-12`, `15/9-F-15`).
- **`well_name`** (`TEXT`): Human-readable well title (e.g. `15/9-F-12 (Volve Active)`).
- **`field`** (`TEXT`): Hydrocarbon field name (e.g. `VOLVE`).
- **`operator`** (`TEXT`): Operating company (e.g. `Statoil Petroleum AS (Equinor)`).
- **`dataset`** (`TEXT`): Originating dataset identity (`VOLVE_PUBLIC`, `SYNTHETIC_DEMO`, `OIL_INDIA`).
- **`provenance`** (`TEXT`): Provenance level (`REAL`, `DERIVED`, `SYNTHETIC`, `ILLUSTRATIVE`).
- **`latitude`** (`REAL`): Surface latitude in WGS84 decimal degrees.
- **`longitude`** (`REAL`): Surface longitude in WGS84 decimal degrees.
- **`spud_date`** (`TEXT`, optional): ISO-8601 date when drilling commenced.
- **`completion_date`** (`TEXT`, optional): ISO-8601 completion date.
- **`status`** (`TEXT`, optional): Operational state (`Plugged & Abandoned`, `Active`, `Shut-in`).

### 2.2 `Wellbore`
A unique physical hole drilled from a well surface location (supports sidetracks, lateral branches, and pilot holes).
- **`wellbore_id`** (`TEXT`, PK): Unique wellbore identifier (e.g. `15/9-F-12-WB1`).
- **`well_id`** (`TEXT`, FK -> `wells.well_id` ON DELETE CASCADE): Parent well reference.
- **`name`** (`TEXT`): Wellbore title (e.g. `15/9-F-12 Main Wellbore`).
- **`purpose`** (`TEXT`): Purpose category (`PRODUCTION`, `OBSERVATION`, `EXPLORATION`).
- **`status`** (`TEXT`): Wellbore status (`P&A`, `Drilling`, `Suspended`).
- **`md_start`** (`REAL`): Measured depth at wellbore kickoff / surface (m).
- **`md_end`** (`REAL`): Total measured depth reached (m).
- **`tvd_start`** (`REAL`): True vertical depth at start (m).
- **`tvd_end`** (`REAL`): Final true vertical depth (m).
- **`trajectory_source`** (`TEXT`): Authority source for trajectory data.
- **`provenance`** (`TEXT`): `REAL` / `SYNTHETIC`.

### 2.3 `Survey`
Directional survey stations recording spatial borehole orientation.
- **`survey_id`** (`TEXT`, PK): Unique survey station identifier (e.g. `SURV-F9-001`).
- **`wellbore_id`** (`TEXT`, FK -> `wellbores.wellbore_id` ON DELETE CASCADE).
- **`md`** (`REAL`): Measured depth along hole (m).
- **`inclination`** (`REAL`): Deviation angle from vertical in decimal degrees.
- **`azimuth`** (`REAL`): Compass heading in degrees relative to True North.
- **`tvd`** (`REAL`, optional): Calculated true vertical depth (m).
- **`tvdss`** (`REAL`, optional): True vertical depth subsea (m).
- **`northing`** (`REAL`, optional): Displacement North (m).
- **`easting`** (`REAL`, optional): Displacement East (m).
- **`timestamp`** (`TEXT`, optional): Measurement timestamp.
- **`source`** (`TEXT`): Tool / service provider (e.g. `Baker Hughes MWD`).
- **`provenance`** (`TEXT`): `REAL`.

### 2.4 `FormationTop`
Subsurface geological and lithological boundaries mapped per wellbore.
- **`formation_top_id`** (`TEXT`, PK): e.g. `TOP-15/9-F-12-WB1-3`.
- **`wellbore_id`** (`TEXT`, FK -> `wellbores.wellbore_id` ON DELETE CASCADE).
- **`formation_name`** (`TEXT`): Original raw stratigraphic unit (e.g. `Hugin Fm.`, `Upper Hordaland Shale`).
- **`formation_name_canonical`** (`TEXT`): Standardized canonical name (e.g. `Hugin`, `Upper Hordaland Shale`).
- **`md`** (`REAL`): Measured depth at top boundary (m).
- **`tvd`** (`REAL`, optional): True vertical depth at top boundary (m).
- **`tvdss`** (`REAL`, optional): Subsea TVD (m).
- **`source`** (`TEXT`): Geological authority (e.g. `Norwegian Offshore Directorate (NOD)`).
- **`provenance`** (`TEXT`): `REAL`.
- **`reviewed`** (`INTEGER`, boolean): Verification flag.

### 2.4b `FormationAlias`
Controlled vocabulary mapping raw formation name variants to standardized canonical names.
- **`alias`** (`TEXT`, PK): Raw string variant (e.g. `Hugin Fm.`, `Hugin Formation`).
- **`canonical_name`** (`TEXT`): Standardized canonical target (e.g. `Hugin`).
- **`source`** (`TEXT`): Nomenclature source authority.
- **`provenance`** (`TEXT`): `REAL`.

### 2.5 `Report`
Daily Drilling Reports (DDRs), Well Completion Reports (WCRs), and operational logs.
- **`report_id`** (`TEXT`, PK): e.g. `DDR-15_9-F-12-2007-06-15`.
- **`wellbore_id`** (`TEXT`, FK -> `wellbores.wellbore_id` ON DELETE SET NULL).
- **`report_type`** (`TEXT`): `DDR`, `WCR`, `Mud Log`, `Well Report`.
- **`title`** (`TEXT`): Report heading.
- **`report_date`** (`TEXT`): ISO-8601 recording date.
- **`source_file`** (`TEXT`): Original file artifact.
- **`source_uri`** (`TEXT`, optional): Upstream repository URI.
- **`text`** (`TEXT`): Verbatim unstructured morning report text.
- **`provenance`** (`TEXT`): `REAL`.
- **`extraction_status`** (`TEXT`): Processing status (`COMPLETED`, `PENDING`).
- **`reviewed`** (`INTEGER`, boolean): Human audit flag.

### 2.6 `Event`
Extracted drilling incidents, non-productive time (NPT) anomalies, and hazards with full textual evidence linkage.
- **`event_id`** (`TEXT`, PK): e.g. `INC-15_9-19 A-001`.
- **`wellbore_id`** (`TEXT`, FK -> `wellbores.wellbore_id` ON DELETE SET NULL).
- **`report_id`** (`TEXT`, FK -> `reports.report_id` ON DELETE SET NULL).
- **`event_type`** (`TEXT`): Standard taxonomy (`LOSS`, `KICK`, `STICKY_HOLE`, `PACK_OFF`, `WELL_CONTROL`, `TORQUE`, `PRESSURE`, `CIRCULATION`, `OTHER`).
- **`severity`** (`TEXT`): `Low`, `Medium`, `High`, `Critical`.
- **`md`** (`REAL`, optional): Measured depth of incident (m).
- **`md_start`** / **`md_end`** (`REAL`, optional): Interval span.
- **`tvd`** (`REAL`, optional): True vertical depth.
- **`formation_name`** (`TEXT`, optional): Surrounding geological formation.
- **`depth_basis`** (`TEXT`): Explicit coordinate basis (`MD`, `TVD`).
- **`description`** (`TEXT`): Summary of what occurred.
- **`cause`** (`TEXT`, optional): Mechanical/geological root cause.
- **`action`** (`TEXT`, optional): Mitigating engineering action taken.
- **`outcome`** (`TEXT`, optional): Operational outcome.
- **`reviewed`** (`INTEGER`, boolean): Verification flag (**defaults to 0 / false**).
- **`excluded`** (`INTEGER`, boolean): Calculation filter flag.
- **`provenance`** (`TEXT`): `REAL`.
- **`source_text`** (`TEXT`, optional): Exact excerpt from DDR.
- **`evidence_start`** / **`evidence_end`** (`INTEGER`, optional): Character slice offset inside parent DDR text.

### 2.7 `Casing`
Casing program and casing shoe setting depths.
- **`casing_id`** (`TEXT`, PK): e.g. `CAS-15/9-F-12-WB1-1`.
- **`wellbore_id`** (`TEXT`, FK -> `wellbores.wellbore_id` ON DELETE CASCADE).
- **`hole_section`** (`TEXT`): e.g. `30" Conductor`, `13-3/8" Surface`.
- **`casing_size`** (`TEXT`): Outer diameter specification.
- **`setting_depth_md`** (`REAL`): Measured depth at shoe (m).
- **`setting_depth_tvd`** (`REAL`): TVD at shoe (m).
- **`cement_top`** (`REAL`, optional): Top of cement (TOC).
- **`provenance`** (`TEXT`): `REAL`.

### 2.8 `MudProgram`
Drilling fluid chemistry and density schedule.
- **`mud_program_id`** (`TEXT`, PK): e.g. `MUD-15/9-F-12-WB1-1`.
- **`wellbore_id`** (`TEXT`, FK -> `wellbores.wellbore_id` ON DELETE CASCADE).
- **`md_start`** / **`md_end`** (`REAL`): Application depth interval.
- **`mud_weight`** (`REAL`): Specific gravity (SG).
- **`mud_type`** (`TEXT`): Fluid formulation (e.g. `Invert Emulsion Oil-Based Mud`).
- **`viscosity`** (`REAL`, optional): Funnel viscosity.
- **`provenance`** (`TEXT`): `REAL`.
