# NWIS Telemetry Layer & Volve Replay Architecture (Phase 5)

## 1. Executive Summary & Core Principles

The **NWIS Telemetry Layer** provides a normalized, server-authoritative, real-time context stream for live drilling monitoring, WITSML file ingestion, and look-ahead rule evaluation. 

### Critical Architecture Boundaries:
1. **Telemetry as Current-State Context Only**: Telemetry delivers real-time sensor measurements (MD, ROP, Torque, SPP, Hook Load, WOB, RPM, Flow In/Out, Mud Density, Gas). It is **NOT** a predictive machine learning model.
2. **Deterministic Baseline vs Offset Evidence**: NWIS strictly separates:
   - **`CURRENT TELEMETRY`**: Current sensor readings and rolling baseline deviations ($\Delta\%$ against a 20-sample rolling mean).
   - **`HISTORICAL OFFSET EVIDENCE`**: Deterministic K-of-N look-ahead hazard rules derived from verified offset Daily Drilling Reports (DDRs).
3. **No Fake ML / No Artificial Confidence Scores**: Strictly no logistic regression, XGBoost, neural nets, or fabricated hazard probability percentages.
4. **Transparent Stubbing**: eRTMAC is exposed as a transparent adapter interface that explicitly returns `status: NOT_CONNECTED` with `ILLUSTRATIVE` provenance until authenticated Oil India rig credentials and protocols are configured.

```
+-----------------------------------------------------------------------------------+
|                              TELEMETRY SOURCES                                    |
|   A. Volve Replay (600 Records)   B. WITSML XML Files   C. eRTMAC Connector Stub  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         TELEMETRY ADAPTER INTERFACE                               |
|       (connect, disconnect, get_status, get_channel_inventory, stream_samples)     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         CANONICAL TELEMETRY SAMPLE                                |
| (timestamp, well_id, wellbore_id, md, depth_basis, rop, torque, spp, wob, gas...) |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         RUNTIME ACTIVE-WELL STATE                                 |
|            (currentDepth, depthBasis, latestTelemetry, formationAtDepth)          |
+-----------------------------------------------------------------------------------+
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
+----------------------------------+          +-------------------------------------+
|   PHASE 3 STRATIGRAPHIC ENGINE   |          |      PHASE 4 LOOK-AHEAD ENGINE      |
| (Formation Top & Relative Depth) |          | (Refreshed on Delta MD >= 5.0m)     |
+----------------------------------+          +-------------------------------------+
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
+-----------------------------------------------------------------------------------+
|                 EXPLAINABLE HISTORICAL OFFSET EVIDENCE & ALERTS                   |
|               (K of N Covered Offset Wellbores & Source DDR Citations)            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Canonical Telemetry Sample Schema

Every telemetry source normalizes its readings into the canonical schema. Missing or unrecorded sensor channels remain `null`; they are never fabricated.

```json
{
  "timestamp": "2007-06-15T04:00:00Z",
  "well_id": "15/9-F-12",
  "wellbore_id": "15/9-F-12-WB1",
  "md": 1842.58,
  "depth_basis": "MD",
  "tvd": null,
  "rop": 14.8,
  "torque": 12.8,
  "hook_load": 206.4,
  "spp": 1315.0,
  "wob": 11.9,
  "rpm": 145.0,
  "flow_in": 3515.0,
  "flow_out": 98.0,
  "mud_weight": 1.28,
  "gas": 0.05,
  "ecd": null,
  "provenance": "REAL",
  "source_label": "PUBLIC VOLVE REPLAY"
}
```

### Channel Definitions & Units:
| Channel Key | Canonical Name | Physical Unit | Description |
| :--- | :--- | :--- | :--- |
| `md` | Measured Depth | `m` | Cumulative measured drillstring depth |
| `tvd` | True Vertical Depth | `m` | Geometric vertical depth (null if uncomputed) |
| `rop` | Rate of Penetration | `m/h` | Drilling penetration rate |
| `torque` | Surface Torque | `kN.m` | Rotary table / top-drive mechanical torque |
| `hook_load` | Hook Load | `klbs` | Total hook load weight |
| `spp` | Standpipe Pressure | `psi` | Mud circulation pump pressure |
| `wob` | Weight on Bit | `klbs` | Weight applied to drill bit |
| `rpm` | Rotary Speed | `RPM` | Drillstring rotation speed |
| `flow_in` | Mud Flow In | `L/min` | Mud pump volumetric flow rate |
| `flow_out` | Mud Flow Out | `%` | Return mud flow paddle percentage |
| `mud_weight` | Mud Density | `SG` | Active drilling fluid specific gravity |
| `gas` | Total Hydrocarbon Gas | `%` | Total mud gas percentage |
| `ecd` | Equivalent Circulating Density | `SG` | Unrecorded in Volve dataset (`null`) |

---

## 3. Telemetry Adapters Architecture

All telemetry ingestion classes inherit from the abstract base class `TelemetryAdapter`:

```python
class TelemetryAdapter(ABC):
    @abstractmethod
    def connect(self) -> bool: ...
    @abstractmethod
    def disconnect(self) -> bool: ...
    @abstractmethod
    def get_status(self) -> TelemetryStatusResponse: ...
    @abstractmethod
    def get_channel_inventory(self) -> List[ChannelInfo]: ...
    @abstractmethod
    def get_latest_sample(self) -> Optional[CanonicalTelemetrySample]: ...
    @abstractmethod
    def get_sample_at_index(self, index: int) -> Optional[CanonicalTelemetrySample]: ...
```

### 3.1 Volve Replay Adapter (`VolveReplayAdapter`)
- **Dataset**: Authentic Equinor Volve Field dataset (`public/volve-data.json`), comprising **600 sequential records** from `2007-06-15T04:00:00Z` to `2007-06-15T04:24:57Z`.
- **Depth Span**: MD `1842.58 m` to `1878.50 m` (drilled interval: 35.92 m).
- **Supported Speeds**: `0.25x`, `0.5x`, `1.0x`, `2.0x`, `5.0x`, `10.0x`.
- **Replay State Machine**:
  - `STOPPED`: Reset to index 0.
  - `RUNNING`: Emits samples sequentially at the selected speed interval.
  - `PAUSED`: Maintains current index; stops timer.
  - `COMPLETED`: Triggered automatically at index 599. Does **not** loop automatically.
- **Deterministic**: Replaying from index $i$ always produces the identical sample sequence.

### 3.2 WITSML File Adapter (`WITSMLFileAdapter`)
- **Supported Standards**: Energistics WITSML 1.3.1.1 and 1.4.1.1 XML.
- **Log Files**: Ingests multi-curve `<log>` nodes (e.g. `data/volve/witsml/log_00001.xml` with 79 curves).
- **Trajectory Files**: Ingests `<trajectory>` nodes (e.g. `data/volve/witsml/trajectory_1.xml` with 52 survey stations).
- **Mnemonic Normalization**: Maps raw vendor mnemonics (`ROP_AVG`, `TORQUE_AVG`, `PUMP`, `HKLD_AVG`, `WOB_AVG`, `MWIN`) to canonical channel names with unit conversions.
- **Validation Reporting**: Explicitly reports sample count, depth range, timestamp range, unsupported curve mnemonics, and parser warnings.

### 3.3 eRTMAC Stub Adapter (`ERTMACStubAdapter`)
- **Operational Status**: Always returns `status: NOT_CONNECTED`.
- **Provenance**: `ILLUSTRATIVE`.
- **Reason**: `"eRTMAC integration requires Oil India system access/configuration."`
- **Future Integration Requirements**:
  - Protocol: WITSML 1.4.1.1 SOAP / WITS0 Serial / OPC UA.
  - Security: TLS mutual authentication + Service Principal tokens.
  - Network: Encrypted site-to-cloud VPN tunnel to Oil India rig demarcation gateway.

---

## 4. Real-Time Streaming Protocols

NWIS supports two streaming mechanisms:

### 4.1 Primary Protocol: WebSocket (`/api/telemetry/ws`)
- Provides bidirectional low-latency delivery.
- Clients can send control frames (`{"action": "pause"}`, `{"action": "speed", "speed": 2.0}`) directly over the socket.
- Emits canonical sample frames:
```json
{
  "type": "telemetry",
  "source": "VOLVE_REPLAY",
  "index": 142,
  "total_samples": 600,
  "status": "RUNNING",
  "speed": 1.0,
  "sample": { ... }
}
```

### 4.2 Fallback Protocol: Server-Sent Events (`/api/telemetry/stream`)
- Lightweight unidirectional HTTP stream for environments where WebSockets are blocked by corporate proxies.
- Emits identical JSON payload over `text/event-stream`.

### 4.3 Offline Local Fallback
- If the FastAPI backend is completely unreachable, the frontend automatically falls back to client-side deterministic replay fixtures without crashing, displaying `LOCAL OFFLINE REPLAY`.

---

## 5. Active-Well State & Look-Ahead Trigger Pipeline

```
Real-Time Telemetry Sample (MD = 1860.0 m)
             │
             ▼
Update Runtime Active-Well State
  - currentDepth: 1860.0 m MD
  - depthBasis: 'MD'
  - latestTelemetry: {...}
             │
             ▼
Phase 3 Stratigraphic Alignment (get_formation_at_depth)
  - Resolved Formation: "Upper Hordaland Shale"
  - Formation Top MD: 1800.0 m
  - Relative Depth: +60.0 m below top
             │
             ▼
Check Refresh Trigger:
  - Is |MD - lastLookaheadMD| >= 5.0 m? (YES) OR Formation Changed?
             │
             ▼
Phase 4 Look-Ahead Query (get_lookahead_evidence)
  - Evaluates K-of-N offset wellbores in upcoming 300 m window
  - Generates explainable alerts with verified DDR citations
```

---

## 6. Telemetry REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/telemetry/status` | Current telemetry source, run state, depth, and provenance |
| `GET` | `/api/telemetry/channels` | Channel inventory with physical units and availability |
| `GET` | `/api/telemetry/latest` | Most recent canonical telemetry sample |
| `POST` | `/api/telemetry/replay/start` | Start or restart replay at specified speed |
| `POST` | `/api/telemetry/replay/pause` | Pause active replay stream |
| `POST` | `/api/telemetry/replay/resume` | Resume paused replay stream |
| `POST` | `/api/telemetry/replay/reset` | Reset replay index to 0 |
| `POST` | `/api/telemetry/replay/seek` | Seek to specific record index or measured depth |
| `POST` | `/api/telemetry/replay/speed` | Adjust replay speed multiplier (0.25x – 10x) |
| `POST` | `/api/telemetry/replay/step` | Advance replay exactly 1 sample forward |
| `POST` | `/api/telemetry/witsml/inspect` | Inspect and validate local WITSML XML file |
| `GET` | `/api/telemetry/ertmac/status` | Explicit eRTMAC connection status |
| `GET` | `/api/telemetry/stream` | Server-Sent Events (SSE) telemetry stream |
| `WS` | `/api/telemetry/ws` | Interactive bidirectional WebSocket stream |

---

## 7. Known Limitations & Phase 6 Transition

1. **Replay Persistence**: Telemetry replay state is stored in memory as runtime state. It does not bloat `data/nwis.db`.
2. **Sensor Deviation Baselines**: Sensor deviations are calculated exclusively against the wellbore's rolling window baseline (20-sample window). Statistics are never transferred across different oilfields.
3. **Phase 6 Scope**: Live rig streaming integration with authenticated Oil India eRTMAC infrastructure, rig-floor edge agent deployment, and real-time WITS0/WITSML ingestion pipelines.
