# Oil India Pilot Integration & Operational Readiness Guide (Phase 8H)

## 1. Prototype Scope vs. Operational Pilot Boundaries

The current National Well Intelligence System (NWIS) implementation represents a **fully validated software prototype** developed and evaluated against the public Equinor Volve North Sea benchmark corpus.

> [!IMPORTANT]
> **Explicit Prototype Limitation**:
> **eRTMAC integration is not connected in the prototype.** The prototype contains an explicit stub interface for testing protocol compliance, but has no live connection or authorization credentials to Oil India Limited (OIL) operational networks.

| Capability Dimension | Current Prototype Status | Required for Oil India Pilot Deployment |
|---|---|---|
| **Data Ingestion** | Local SQLite (`data/nwis.db`), static JSON/parquet files | Enterprise connector into OIL well databases & document management systems |
| **Telemetry Ingestion** | Deterministic WITSML replay bundle from Volve | Live WITSML 1.4.1.1 / WITS0 streaming ingestion from field rigs |
| **Geological Alignment** | North Sea Volve stratigraphic column | Assam-Arakan & Rajasthan basin stratigraphy and canonical aliases |
| **Drilling Hazards** | 24 extracted North Sea incidents | Ingested OIL historical incident corpus (stuck pipe, kicks, losses, tight hole) |
| **User Authentication** | Open local session | Enterprise Single Sign-On (SSO) / LDAP / Role-Based Access Control (RBAC) |
| **Hosting Infrastructure** | Local development / test server | OIL on-premise secure datacenter or authorized sovereign cloud |

---

## 2. 17-Point Pilot Data & Systems Integration Checklist

To deploy NWIS for an operational field pilot with Oil India Limited, the following 17 data assets and technical integrations must be provided:

### 1. Well Master Data
- Unique well identifiers (UWI / API numbering format).
- Operating block, asset / basin designation (e.g., Upper Assam Basin, Jaisalmer Basin).
- Spud date, rig assignment, target formation, planned total depth.

### 2. Wellbore Identifiers
- Parent well mapping, sidetrack designations (e.g., WB01, ST01).
- Operational status (active drilling, suspended, completed, P&A).

### 3. Wellhead Coordinates
- Geodetic datum (WGS84 or Everest 1956 UTM zones).
- Surface latitude, longitude, rotary table elevation (RKB / DF), ground level (GL).

### 4. Survey / Trajectory Data
- Directional survey stations: Measured Depth (MD), Inclination (deg), Azimuth (deg, grid/true/magnetic).
- Computed TVD, Northing, Easting, Dogleg Severity (DLS) via Minimum Curvature method.

### 5. Formation Tops & Prognosis
- Pre-spud geological prognosis tops (MD and TVD).
- Real-time mud-logging / biostratigraphic revised tops as drilling proceeds.

### 6. Daily Drilling Reports (DDR) & Well Completion Reports (WCR)
- Unstructured narrative reports (PDF/Excel/DOCX) from historical offset wells.
- Daily summaries, 24-hour activity breakdowns, bit records, BHA records.

### 7. Historical Drilling Event Records
- Structured or semi-structured incident registers:
  - Stuck pipe incidents, severe pack-offs, overpull events.
  - Lost circulation zones, mud losses, seepage rates.
  - Gas kicks, water influxes, shallow gas hazards.
  - Drillstring washouts, twist-offs, fish left in hole.

### 8. Casing & Liner Records
- Casing strings: Conductor, Surface, Intermediate, Production, Liners.
- Outer diameter (OD), weight (ppf), grade, shoe MD/TVD, top of liner.

### 9. Cement Records
- Slurry type, density (SG / ppg), volume pumped, top of cement (TOC).
- Leak-Off Test (LOT) / Formation Integrity Test (FIT) equivalent mud weight (EMW).

### 10. Mud Programs & Fluid Records
- Fluid type (WBM, OBM, SOBM, Polymer, Glycol).
- Planned and actual density, plastic viscosity, yield point, fluid loss, chlorides.

### 11. Real-Time Telemetry Streaming
- Real-time 1-second to 5-second sampling feeds for active drilling operations:
  - Bit depth (MD), hole depth (MD).
  - Rate of Penetration (ROP), Weight on Bit (WOB).
  - Rotary speed (RPM), surface torque.
  - Standpipe pressure (SPP), pump strokes (SPM), flow in / flow out.
  - Hookload, mud pit volumes, gas total / chromatograph.

### 12. WITSML / WITS0 / eRTMAC Access Protocols
- WITSML 1.3.1.1 / 1.4.1.1 SOAP or WebSocket endpoint credentials.
- eRTMAC (electronic Real-Time Monitoring and Analytics Center) data gateway connectivity.
- Rig-site gateway (RigBox/EDR) interface configuration.

### 13. Authentication & Network Requirements
- Enterprise directory integration (Active Directory / Kerberos / SAML 2.0).
- Network routing: Dedicated VPN or leased line between drilling rigs, eRTMAC center, and NWIS host.
- TLS 1.3 encryption for all transport channels.

### 14. Data Retention & Archival Policies
- High-frequency telemetry retention (raw vs. downsampled).
- Multi-year archival of analyzed offset sessions for post-well reviews.

### 15. Review & Validation Workflow
- Structured role for Lead Drilling Superintendent / Geologist to review and verify extracted historical incidents (`reviewed = 1`).
- Ability to annotate, correct, or exclude disputed historical records.

### 16. Operational Ownership & Decision Responsibility
- Explicit governance policy: NWIS is a **decision-support advisory system**.
- Final operational accountability for well control, tripping speeds, and mud adjustments remains exclusively with the certified Company Man (DSV) and Toolpusher on the rig floor.

### 17. Cybersecurity & Compliance
- Compliance with Indian National Data Security Standards and OIL IT security baselines.
- Air-gapped deployment capability if rig-floor or regional operations have restricted internet connectivity.
