# NWIS 5-Minute Demonstration Script & Workflow (Phase 8F & 8G)

## 1. Overview & Demonstration Guidelines

This script provides an exact, step-by-step narrative for presenting the **National Well Intelligence System (NWIS)** to technical stakeholders, drilling superintendents, and evaluation committees.

- **Target Presentation Time**: Exactly 5 minutes.
- **Operating Environment**: Localhost (`http://localhost:4174` or `http://localhost:8000`).
- **Data Source**: Real Equinor Volve Open Data (Block 15/9, Norwegian North Sea).
- **Core Principle**: Highlight deterministic evidence lineage, clear provenance separation, and transparent operational decision support. Do not claim fake live Oil India feeds or black-box AI miracles.

---

## 2. Chronological 5-Minute Demo Flow

### ⏱ 0:00 – 0:30: Opening & Active Well Context
- **Action**:
  1. Open browser to `http://localhost:4174`.
  2. Observe the Command Center Header:
     - Active Well: `15/9-19 A (Discovery Well)`
     - Current Bit Depth: `2,000.0 m MD` (`2,000.0 m TVD`)
     - Stratigraphic Formation: `Lower Hordaland Reactive Shale` (Top: `1,975.0 m MD`)
     - Relative Formation Depth: `+25.0 m` below formation top.
  3. Point out the **Centralized Provenance Badge**: `[REAL: VOLVE_PUBLIC]`.
- **Narrative**:
  > "Welcome to the National Well Intelligence System (NWIS). We are currently monitoring active well 15/9-19 A at 2,000 meters measured depth within the Lower Hordaland Reactive Shale. Notice the green provenance badge indicating authentic field data from the Volve dataset. Every data point and alert in NWIS traces back to verified source records."

---

### ⏱ 0:30 – 1:15: Spatial Area Map & Offset Coverage
- **Action**:
  1. Click on the **Area Map** tab (or inspect the geographic overview panel).
  2. Identify the active well `15/9-19 A` and the surrounding offset cluster:
     - `15/9-F-12`, `15/9-F-15`, `15/9-F-14`, `15/9-F-11`, and `15/9-F-9` located at `~2.54 km` radius.
  3. Highlight the stratigraphic coverage indicator:
     - All 5 offset wells penetrate the `Lower Hordaland Reactive Shale` interval, establishing a complete offset denominator `N = 5`.
- **Narrative**:
  > "Before penetrating deeper, NWIS evaluates spatial and stratigraphic offset coverage. Within a 5-kilometer radius, we identify 5 offset wells drilled from the Volve platform. Crucially, all 5 wells penetrate this exact formation, giving our look-ahead engine full offset coverage."

---

### ⏱ 1:15 – 2:00: Historical Offset Event & Evidence Drawer
- **Action**:
  1. Locate the nearby incident list in the Offset panel.
  2. Click on Event **`INC-15_9-19 A-023`** (`LOSS` at `2,050.0 m MD`).
  3. The **Evidence Drawer** slides in from the right:
     - **Event Details**: Mud loss of 6 m³ during casing run at 2,050 m.
     - **Source Report**: Daily Drilling Report `DDR-15_9-19 A-1997-09-01`.
     - **Exact Cited Text**: *"Total mud losses running casing 6 m3"*.
     - **Historical Offset Practice**: *"Reduced flow rate, pumped 25 m3 LCM pill (coarse nut plug & calcium carbonate blend)..."*.
  4. Note the operational label: **`HISTORICAL OFFSET PRACTICE (ENGINEERING RECORD)`** and the disclaimer stating it is not an automated autopilot command.
- **Narrative**:
  > "Here is an incident 50 meters ahead of our bit depth. Opening the Evidence Drawer reveals the exact daily drilling report from 1997. We see the primary source text and the historical practice applied by the offshore engineer: a 25 m³ LCM pill. Notice our strict terminology: this is labeled as an engineering historical record, not an automated recommendation. The drilling team retains complete operational control."

---

### ⏱ 2:00 – 2:45: Deterministic Look-Ahead Rule Engine
- **Action**:
  1. Navigate to the **Look-Ahead** section.
  2. Observe the look-ahead horizon preset (`300 m` window, from `2,000 m` to `2,300 m MD`).
  3. Review the K-of-N calculation:
     - Hazard: `LOSS` & `STICKY_HOLE`
     - Evaluated Offsets: `N = 5` wells
     - Incidents Detected: `K = 1` well reporting severe loss, `K = 1` reporting sticky hole at 2,212 m.
  4. Emphasize the clear visual separation between:
     - Left column: **HISTORICAL OFFSET EVIDENCE** (past analogue events)
     - Right column: **CURRENT TELEMETRY CONTEXT** (current rig sensors).
- **Narrative**:
  > "Our Phase 4 Look-Ahead engine evaluates the upcoming 300-meter drilling interval. Rather than using black-box guessing, it calculates deterministic K-of-N evidence ratios across our 5 offset wells. It alerts the driller that differential loss was encountered 50 meters ahead, and severe drag was encountered at 2,212 meters. We maintain strict visual separation between historical offset facts and current real-time telemetry."

---

### ⏱ 2:45 – 3:30: Telemetry Replay & Synchronization
- **Action**:
  1. Click **Start Replay** in the Telemetry Replay controller.
  2. Observe the streaming channels:
     - Depth MD advancing
     - Live sensor trends: ROP, WOB, RPM, Torque, Standpipe Pressure
     - Formation synchronization dynamically tracking depth.
  3. Point out the Telemetry Source banner:
     - `Volve Historical Replay — WITSML Log Bundle`.
     - Explicit label: `Research Dataset — Not a Live Oil India Rig Feed`.
- **Narrative**:
  > "Now we engage the telemetry replay engine. It streams 10 authentic WITSML channels from the Volve dataset. As the bit advances, torque and pressure trends update alongside formation boundaries. We explicitly label this as historical replay to prevent any ambiguity with live operational feeds."

---

### ⏱ 3:30 – 4:15: Knowledge Repository & CSV Export
- **Action**:
  1. Click on the **Knowledge** tab.
  2. In the Search input, type `Lower Hordaland` and press Enter.
  3. View the structured incident cards, complete with formation tags, severity badges, and review status (`reviewed = 0`).
  4. Click the **Export CSV** button:
     - A structured CSV file is downloaded containing complete metadata and provenance lineage.
- **Narrative**:
  > "In the Knowledge Repository, engineers can search the historical corpus across wells, formations, and hazard types. Every entry includes full provenance metadata, and all filtered results can be exported as standard CSV reports for morning drilling meetings and well planning workflows."

---

### ⏱ 4:15 – 5:00: Final Backtesting, ML Decision & Pilot Readiness
- **Action**:
  1. Click on the **ML Evaluation / Model Card** modal or sub-view.
  2. Review the final evaluation summary:
     - Evaluation Method: `Leave-One-Well-Out Cross-Validation (LOWOCV)`
     - Evaluated Wells: 6 Volve wells across 662 depth intervals
     - Baseline: Phase 4 Deterministic Rule Engine (PR-AUC: `0.0514`, 5.74 alerts/1000m)
     - Machine Learning Models: Logistic Regression & Gradient Boosting (PR-AUC: `0.0514`)
     - Model Status: **`NOT_SHIPPED`**.
  3. Conclude with the Pilot Readiness summary:
     - "eRTMAC integration is not connected in the prototype."
     - Documented 17-point operational readiness checklist for future Oil India pilot deployment.
- **Narrative**:
  > "Finally, we believe in scientific honesty. When evaluated using rigorous Leave-One-Well-Out Cross-Validation, machine learning models failed to outperform our deterministic rule baseline due to severe class imbalance. Consequently, our ML status is strictly marked NOT_SHIPPED. Phase 4 remains our operational standard. We have fully documented the 17 integration requirements for an eventual Oil India pilot. NWIS is reproducible, verified, and ready for domain evaluation."
