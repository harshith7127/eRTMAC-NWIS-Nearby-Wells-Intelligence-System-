# NWIS Final System Limitations & Boundaries (Phase 8I)

## 1. Foundational Operational Limitations

The National Well Intelligence System (NWIS) is engineered to provide transparent, explainable decision support for drilling operations. To maintain strict scientific and operational integrity, the following limitations are explicitly documented and acknowledged:

### 1. Volve is a North Sea Public Dataset
- The underlying operational corpus is derived entirely from the Equinor Volve Field (Block 15/9, Norwegian Central Graben).
- Geological facies (chalks, Jurassic sandstones, Tertiary shales) and drilling environments (harsh offshore marine environment, Jack-up rig drilling) are specific to the North Sea.

### 2. Volve Statistics Do Not Establish Oil India Performance
- Event frequencies, penetration rates, and operational thresholds recorded in the Volve dataset cannot be assumed to represent typical drilling risks in Oil India Limited operational basins (e.g., Upper Assam shelf, thrust belts, or Rajasthan onshore desert basins).

### 3. eRTMAC Integration is Not Connected
- The current software includes an interface contract stub for eRTMAC protocol compliance.
- No live network connection, VPN, or credentials to Oil India's eRTMAC monitoring center exist in this prototype.

### 4. Prototype Not Validated on Oil India Operational Data
- The algorithms and software have been verified against Norwegian open data and synthetic testing suites.
- Formal operational validation requires blind backtesting on historical Oil India Daily Drilling Reports and field logs.

### 5. Machine Learning is NOT SHIPPED
- In rigorous Leave-One-Well-Out Cross-Validation (LOWOCV) on 662 depth intervals, ML classifiers achieved a PR-AUC of `0.0514`, matching the random baseline prevalence and failing to exceed the deterministic baseline by the required `+0.05` margin.
- In accordance with governance criteria, `model_status = NOT_SHIPPED`.
- Phase 4 Deterministic Rule Engine is the sole active look-ahead engine.

### 6. Historical Evidence Depends on Available Source Documents
- Historical hazard alerts can only be generated if offset wells have recorded and digitized Daily Drilling Reports (DDRs) or incident registers.
- Unrecorded events or gaps in historical records mean zero alerts will be triggered for those horizons.

### 7. Missing Channels Remain Missing
- NWIS does not interpolate, synthesize, or hallucinate missing sensor channels.
- If an offset well or telemetry feed lacks Hookload, Flow In, or ECD, the system marks the channel as `Not Recorded` rather than fabricating values.

### 8. Formation Alignment Depends on Tops and Trajectories
- Stratigraphic relative-depth calculations require accurate formation tops and directional surveys.
- In wells lacking high-resolution MWD surveys, distances fall back to wellhead coordinates with explicit provenance disclosure.

### 9. K-of-N Depends on Offset Coverage
- The K-of-N lookahead ratio is directly constrained by the number of offset wells penetrating a given stratigraphic interval.
- In frontier exploration or wildcat wells with zero offsets ($N = 0$), the lookahead engine transparently indicates `No Offset Evidence`.

### 10. Historical Practice is Not an Automatic Drilling Recommendation
- Information surfaced from historical Daily Drilling Reports (e.g., pumping LCM pills, increasing mud weight) represents historical operational practice from past wells.
- It is NOT an autonomous drilling autopilot recommendation. Final operational actions must always be evaluated and approved by qualified drilling personnel.

### 11. Prototype Replay is Not a Live Rig Feed
- Telemetry playback in NWIS is a deterministic replay of recorded Volve historical WITSML log bundles.
- It is designed for operator training, system evaluation, and retrospective analysis, and must not be portrayed as a live real-time rig feed.
