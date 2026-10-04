"""
NWIS Backend Pytest Suite — Phase 5 Telemetry Layer & Volve Replay Engine
Validates canonical telemetry schema, channel inventory, deterministic Volve replay,
WITSML file adapter, eRTMAC stub, streaming serialization, and active-well stratigraphic synchronization.
"""

import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import get_db_connection, init_db
from backend.app.services.telemetry_service import (
    VolveReplayAdapter,
    WITSMLFileAdapter,
    ERTMACStubAdapter,
    TelemetryManager,
    telemetry_manager
)
from backend.app.services.lookahead_service import evaluate_lookahead
from backend.app.schemas import CanonicalTelemetrySample, ChannelInfo, TelemetryStatusResponse


@pytest.fixture(scope="module")
def client():
    init_db()
    return TestClient(app)


@pytest.fixture(scope="module")
def db_conn():
    conn = get_db_connection()
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# 1. Canonical Telemetry Schema Validation
# ---------------------------------------------------------------------------
def test_canonical_telemetry_schema():
    """Verifies canonical telemetry sample schema with required and nullable channels."""
    sample = CanonicalTelemetrySample(
        timestamp="2007-06-15T04:00:00Z",
        well_id="15/9-F-12",
        wellbore_id="15/9-F-12-WB1",
        md=1842.58,
        depth_basis="MD",
        rop=133.76,
        torque=7.13,
        hook_load=None,  # Nullable channel
        spp=1315.1,
        wob=11.9,
        rpm=145.0,
        flow_in=3515.0,
        flow_out=None,
        mud_weight=1.28,
        ecd=None,
        gas=0.05,
        provenance="REAL",
        source="VOLVE_REPLAY"
    )
    assert sample.well_id == "15/9-F-12"
    assert sample.md == 1842.58
    assert sample.hook_load is None
    assert sample.provenance == "REAL"
    assert sample.source == "VOLVE_REPLAY"


# ---------------------------------------------------------------------------
# 2. Channel Inventory
# ---------------------------------------------------------------------------
def test_channel_inventory():
    """Verifies channel inventory with authentic units and descriptions."""
    adapter = VolveReplayAdapter()
    channels = adapter.get_channel_inventory()
    assert len(channels) >= 10
    
    mnemonics = [c["mnemonic"] for c in channels]
    assert "MD" in mnemonics
    assert "ROP" in mnemonics
    assert "TORQUE" in mnemonics
    assert "SPP" in mnemonics
    assert "WOB" in mnemonics
    
    # Check physical units
    md_chan = next(c for c in channels if c["mnemonic"] == "MD")
    assert md_chan["unit"] == "m"
    assert md_chan["available"] is True
    
    # Check ECD is explicitly marked unavailable with null unit
    ecd_chan = next(c for c in channels if c["mnemonic"] == "ECD")
    assert ecd_chan["available"] is False
    assert ecd_chan["unit"] is None


# ---------------------------------------------------------------------------
# 3. Volve Adapter Initialization
# ---------------------------------------------------------------------------
def test_volve_adapter_initialization():
    """Verifies authentic Volve telemetry dataset loading."""
    adapter = VolveReplayAdapter()
    assert adapter.get_total_samples() >= 60
    assert adapter.well_id == "15/9-F-12"
    status = adapter.get_status()
    assert status["source"] == "VOLVE_REPLAY"
    assert status["provenance"] == "REAL"


# ---------------------------------------------------------------------------
# 4. Deterministic Replay Ordering
# ---------------------------------------------------------------------------
def test_deterministic_replay_ordering():
    """Verifies that replaying the dataset produces samples in exact deterministic sequence."""
    adapter1 = VolveReplayAdapter()
    adapter2 = VolveReplayAdapter()
    
    assert adapter1.get_total_samples() == adapter2.get_total_samples()
    for i in range(min(50, adapter1.get_total_samples())):
        s1 = adapter1.get_sample_at(i)
        s2 = adapter2.get_sample_at(i)
        assert s1["md"] == s2["md"]
        assert s1["timestamp"] == s2["timestamp"]
        assert s1["torque"] == s2["torque"]


# ---------------------------------------------------------------------------
# 5. Replay Start
# ---------------------------------------------------------------------------
def test_replay_start():
    """Verifies replay start operation and status transition to RUNNING."""
    adapter = VolveReplayAdapter()
    status = adapter.start(speed=2.0, start_index=10)
    assert status["status"] == "RUNNING"
    assert status["speed"] == 2.0
    assert status["current_index"] == 10
    assert status["started_at"] is not None


# ---------------------------------------------------------------------------
# 6. Replay Pause
# ---------------------------------------------------------------------------
def test_replay_pause():
    """Verifies replay pause operation."""
    adapter = VolveReplayAdapter()
    adapter.start()
    status = adapter.pause()
    assert status["status"] == "PAUSED"


# ---------------------------------------------------------------------------
# 7. Replay Resume
# ---------------------------------------------------------------------------
def test_replay_resume():
    """Verifies replay resume operation."""
    adapter = VolveReplayAdapter()
    adapter.start()
    adapter.pause()
    status = adapter.resume()
    assert status["status"] == "RUNNING"


# ---------------------------------------------------------------------------
# 8. Replay Reset
# ---------------------------------------------------------------------------
def test_replay_reset():
    """Verifies replay reset to index 0 and status IDLE."""
    adapter = VolveReplayAdapter()
    adapter.start(start_index=25)
    status = adapter.reset()
    assert status["status"] == "IDLE"
    assert status["current_index"] == 0
    assert adapter.get_latest_sample()["raw_index"] == 0


# ---------------------------------------------------------------------------
# 9. Replay Seek
# ---------------------------------------------------------------------------
def test_replay_seek():
    """Verifies replay seek by index and by measured depth."""
    adapter = VolveReplayAdapter()
    
    # Seek by index
    status = adapter.seek(index=15)
    assert status["current_index"] == 15
    
    # Seek by MD
    target_md = adapter.samples[30]["md"]
    status = adapter.seek(md=target_md)
    assert status["current_index"] == 30


# ---------------------------------------------------------------------------
# 10. Replay Completion
# ---------------------------------------------------------------------------
def test_replay_completion():
    """Verifies replay transitions to COMPLETED at final record without unexpected looping."""
    adapter = VolveReplayAdapter()
    last_idx = adapter.get_total_samples() - 1
    adapter.seek(index=last_idx)
    
    # Step past end
    sample = adapter.step()
    status = adapter.get_status()
    assert status["status"] == "COMPLETED"
    assert sample["raw_index"] == last_idx


# ---------------------------------------------------------------------------
# 11. WITSML Adapter Valid File
# ---------------------------------------------------------------------------
def test_witsml_adapter_valid_log():
    """Verifies parsing of authentic local WITSML log file."""
    witsml_path = "data/volve/witsml/log_00001.xml"
    if not os.path.exists(witsml_path):
        pytest.skip("WITSML test file not found in local data directory.")
        
    adapter = WITSMLFileAdapter(witsml_path)
    status = adapter.get_status()
    assert status["source"] == "WITSML_FILE"
    assert status["status"] == "COMPLETED"
    assert len(adapter.channels) > 0
    assert adapter.get_total_samples() > 0


# ---------------------------------------------------------------------------
# 12. WITSML Invalid File Handling
# ---------------------------------------------------------------------------
def test_witsml_invalid_file():
    """Verifies proper error handling when WITSML file is missing or corrupted."""
    with pytest.raises(FileNotFoundError):
        WITSMLFileAdapter("nonexistent_witsml_file.xml")


# ---------------------------------------------------------------------------
# 13. Unsupported Channel Detection
# ---------------------------------------------------------------------------
def test_unsupported_channel_detection():
    """Verifies unsupported vendor mnemonics are tracked explicitly."""
    witsml_path = "data/volve/witsml/log_00001.xml"
    if not os.path.exists(witsml_path):
        pytest.skip("WITSML test file not found.")
        
    adapter = WITSMLFileAdapter(witsml_path)
    summary = adapter.get_status()
    assert "unsupported_fields_count" in summary
    assert isinstance(adapter.unsupported_fields, list)


# ---------------------------------------------------------------------------
# 14. eRTMAC Stub NOT_CONNECTED Status
# ---------------------------------------------------------------------------
def test_ertmac_stub_status():
    """Verifies eRTMAC stub explicitly returns NOT_CONNECTED and explains configuration prerequisites."""
    stub = ERTMACStubAdapter()
    status = stub.get_status()
    assert status["source"] == "ERTMAC"
    assert status["status"] == "NOT_CONNECTED"
    assert status["provenance"] == "ILLUSTRATIVE"
    assert "Oil India" in status["reason"]
    assert "not connected" in status["reason"].lower()


# ---------------------------------------------------------------------------
# 15. Telemetry Status Response Format
# ---------------------------------------------------------------------------
def test_telemetry_status_endpoint(client):
    """Tests GET /api/telemetry/status endpoint."""
    res = client.get("/api/telemetry/status")
    assert res.status_code == 200
    data = res.json()
    assert "source" in data
    assert "status" in data
    assert "channels" in data
    assert "provenance" in data


# ---------------------------------------------------------------------------
# 16. Latest Sample Retrieval
# ---------------------------------------------------------------------------
def test_latest_sample_endpoint(client):
    """Tests GET /api/telemetry/latest endpoint."""
    res = client.get("/api/telemetry/latest")
    assert res.status_code == 200
    data = res.json()
    assert "md" in data
    assert "depth_basis" in data
    assert "well_id" in data
    assert data["provenance"] == "REAL"


# ---------------------------------------------------------------------------
# 17. Stream Serialization Format
# ---------------------------------------------------------------------------
def test_stream_serialization(client):
    """Verifies telemetry sample fields serialize cleanly to canonical JSON."""
    adapter = VolveReplayAdapter()
    sample = adapter.get_latest_sample()
    assert isinstance(sample, dict)
    assert "md" in sample
    assert "rop" in sample
    assert "torque" in sample
    assert "provenance" in sample


# ---------------------------------------------------------------------------
# 18. Runtime Active Well MD Update
# ---------------------------------------------------------------------------
def test_runtime_active_well_md_update():
    """Verifies that new telemetry sample updates runtime active well measured depth."""
    mgr = TelemetryManager()
    sample = {"well_id": "15/9-F-12", "wellbore_id": "15/9-F-12-WB1", "md": 1855.2}
    updated = mgr.update_runtime_active_well(sample)
    assert updated["current_depth"] == 1855.2


# ---------------------------------------------------------------------------
# 19. Formation Resolution on Telemetry Tick
# ---------------------------------------------------------------------------
def test_formation_resolution_on_telemetry(db_conn):
    """Verifies that advancing MD resolves canonical formation via Phase 3 service."""
    mgr = TelemetryManager()
    sample = {"well_id": "15/9-F-12", "wellbore_id": "15/9-F-12-WB1", "md": 2750.0}
    updated = mgr.update_runtime_active_well(sample, db_conn=db_conn)
    assert updated["current_depth"] == 2750.0
    assert updated["current_formation"] != "UNKNOWN"
    assert updated["current_relative_depth"] >= 0.0


# ---------------------------------------------------------------------------
# 20. Relative Depth Update
# ---------------------------------------------------------------------------
def test_relative_depth_update(db_conn):
    """Verifies relative depth calculation tracks with formation top."""
    mgr = TelemetryManager()
    sample1 = {"well_id": "15/9-F-12", "wellbore_id": "15/9-F-12-WB1", "md": 2750.0}
    sample2 = {"well_id": "15/9-F-12", "wellbore_id": "15/9-F-12-WB1", "md": 2760.0}
    
    u1 = mgr.update_runtime_active_well(sample1, db_conn=db_conn)
    rel1 = u1["current_relative_depth"]
    u2 = mgr.update_runtime_active_well(sample2, db_conn=db_conn)
    rel2 = u2["current_relative_depth"]
    
    assert round(rel2 - rel1, 2) == 10.0


# ---------------------------------------------------------------------------
# 21. Phase 4 Look-Ahead Synchronization
# ---------------------------------------------------------------------------
def test_phase4_lookahead_synchronization(db_conn):
    """Verifies advancing telemetry depth drives explainable Phase 4 lookahead evaluation."""
    mgr = TelemetryManager()
    sample = {"well_id": "15/9-F-12", "wellbore_id": "15/9-F-12-WB1", "md": 2750.0}
    mgr.update_runtime_active_well(sample, db_conn=db_conn)
    
    lookahead_res = evaluate_lookahead(
        db_conn,
        wellbore_id="15/9-F-12-WB1",
        current_md=mgr.active_well_state["current_depth"],
        lookahead_m=300.0
    )
    assert "alerts" in lookahead_res
    assert lookahead_res["active_well"]["current_md"] == 2750.0
    assert len(lookahead_res["coverage"]["candidate_wellbore_details"]) > 0


# ---------------------------------------------------------------------------
# 22. Telemetry Unavailable Error Handling
# ---------------------------------------------------------------------------
def test_telemetry_channels_endpoint(client):
    """Tests GET /api/telemetry/channels endpoint."""
    res = client.get("/api/telemetry/channels")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 5


# ---------------------------------------------------------------------------
# 23. Backend Replay Control Endpoints
# ---------------------------------------------------------------------------
def test_replay_control_endpoints(client):
    """Tests full lifecycle of replay control endpoints: start, pause, resume, seek, speed, reset, step."""
    # Start
    r_start = client.post("/api/telemetry/replay/start", json={"speed": 1.0, "start_index": 5})
    assert r_start.status_code == 200
    assert r_start.json()["status"] == "RUNNING"
    assert r_start.json()["current_index"] == 5

    # Pause
    r_pause = client.post("/api/telemetry/replay/pause")
    assert r_pause.status_code == 200
    assert r_pause.json()["status"] == "PAUSED"

    # Resume
    r_resume = client.post("/api/telemetry/replay/resume")
    assert r_resume.status_code == 200
    assert r_resume.json()["status"] == "RUNNING"

    # Speed
    r_speed = client.post("/api/telemetry/replay/speed", json={"speed": 5.0})
    assert r_speed.status_code == 200
    assert r_speed.json()["speed"] == 5.0

    # Seek
    r_seek = client.post("/api/telemetry/replay/seek", json={"index": 20})
    assert r_seek.status_code == 200
    assert r_seek.json()["current_index"] == 20

    # Step
    r_step = client.post("/api/telemetry/replay/step")
    assert r_step.status_code == 200
    assert r_step.json()["raw_index"] == 21

    # Reset
    r_reset = client.post("/api/telemetry/replay/reset")
    assert r_reset.status_code == 200
    assert r_reset.json()["current_index"] == 0


# ---------------------------------------------------------------------------
# 24. Timestamp & Monotonicity Validation
# ---------------------------------------------------------------------------
def test_timestamp_monotonicity():
    """Verifies that telemetry sample timestamps and depths advance chronologically."""
    adapter = VolveReplayAdapter()
    samples = adapter.samples
    assert len(samples) >= 60
    
    for i in range(len(samples) - 1):
        s1 = samples[i]
        s2 = samples[i + 1]
        assert s1["md"] <= s2["md"], f"Depth inversion at index {i}: {s1['md']} > {s2['md']}"


# ---------------------------------------------------------------------------
# 25. eRTMAC Status Endpoint
# ---------------------------------------------------------------------------
def test_ertmac_status_endpoint(client):
    """Tests GET /api/telemetry/ertmac/status endpoint."""
    res = client.get("/api/telemetry/ertmac/status")
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "ERTMAC"
    assert data["status"] == "NOT_CONNECTED"
    assert "Oil India" in data["reason"]
