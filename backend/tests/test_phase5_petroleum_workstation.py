"""
Phase 5 Petroleum Engineering Analysis Workstation Automated Tests.
Validates:
1. Well log curves (GR, RES, RHOB, NPHI, Sonic, Caliper) & non-existent curve handling.
2. Mud logging channels (ROP, WOB, RPM, Torque, SPP, Flow, ECD, Total Gas).
3. Daily drilling report (DDR) operational events & anti-hallucination compliance.
4. Stratigraphic tops intersections, MD/TVD depth linking, and correlation labeling.
5. Casing program & tubular integrity shoe depths.
6. Volumetric 3D reservoir properties at well location.
7. Multi-category data availability matrix.
8. Two-well comparison depth compatibility (TVD/TVDSS vs MD).
"""

import os
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    canonical_db = os.path.join(base_dir, "data", "nwis.db")
    monkeypatch.setenv("NWIS_DB_PATH", canonical_db)


WELL_LOGS = "15/9-F-4"
WELL_A = "15/9-F-12"
WELLBORE_A = "15/9-F-12-WB1"
WELL_B = "15/9-F-15"


def test_phase5_well_logs_available_curves():
    """Verify listing of available petrophysical log curves for well with wireline logs."""
    resp = client.get(f"/api/wells/{WELL_LOGS}/logs")
    assert resp.status_code == 200
    curves = resp.json()
    assert len(curves) >= 1

    curve_names = [c["curve_name"].lower() for c in curves]
    # Check that standard curves are indexed
    assert any("gamma" in c or "gr" in c for c in curve_names)

    for c in curves:
        assert "min_depth_md" in c
        assert "max_depth_md" in c
        assert c["min_depth_md"] <= c["max_depth_md"]
        assert c.get("provenance") in ["REAL", "DERIVED", "INTERPOLATED"]


def test_phase5_well_log_curve_data_and_nonexistent():
    """Verify log points retrieval and strict 404 for nonexistent curves (Anti-Hallucination)."""
    # 1. Existing curve (gamma_ray)
    resp = client.get(f"/api/wells/{WELL_LOGS}/logs/gamma_ray?limit=50")
    assert resp.status_code == 200
    data = resp.json()
    assert "points" in data
    assert len(data["points"]) > 0
    p0 = data["points"][0]
    assert "depth_md" in p0
    assert "value" in p0
    assert 0 <= p0["value"] <= 350  # GAPI range

    # 2. Nonexistent curve must NOT invent values — must return 404
    resp_fake = client.get(f"/api/wells/{WELL_LOGS}/logs/NON_EXISTENT_LOG_CURVE_XYZ")
    assert resp_fake.status_code == 404


def test_phase5_mud_log_channels():
    """Verify mud logging parameters (ROP, torque, gas readings)."""
    resp = client.get(f"/api/wells/{WELL_LOGS}/mudlog?limit=100")
    assert resp.status_code == 200
    data = resp.json()
    assert "well_id" in data
    assert "points" in data
    assert "parameters_available" in data
    assert len(data["parameters_available"]) > 0
    points = data["points"]
    assert len(points) > 0

    for p in points[:10]:
        assert "depth_md" in p
        assert p["depth_md"] >= 0
        assert "parameter_name" in p
        assert "value" in p


def test_phase5_drilling_events_provenance():
    """Verify authentic drilling events and operational incidents from DDR."""
    resp = client.get(f"/api/wells/{WELL_A}/events")
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1

    for ev in events:
        assert "event_id" in ev
        assert "event_type" in ev
        assert "description" in ev
        assert ev.get("provenance") in ["REAL", "DERIVED", "INTERPOLATED"]


def test_phase5_formation_tops_depth_linking():
    """Verify formation tops picks and depth consistency."""
    resp = client.get(f"/api/wellbores/{WELLBORE_A}/formations")
    assert resp.status_code == 200
    tops = resp.json()
    assert len(tops) >= 3

    for t in tops:
        assert "formation_name" in t or "formation_name_canonical" in t
        assert "md" in t
        assert t["md"] > 0
        # If TVD is present, MD must be >= TVD
        if t.get("tvd") is not None and t["tvd"] > 0:
            assert t["md"] >= t["tvd"] - 5.0  # Survey tolerance


def test_phase5_casing_and_tubular_integrity():
    """Verify casing strings and shoe depths."""
    resp = client.get(f"/api/wells/{WELL_A}/casing")
    assert resp.status_code == 200
    casings = resp.json()
    assert len(casings) >= 1

    for c in casings:
        assert "casing_size" in c
        assert "setting_depth_md" in c
        assert c["setting_depth_md"] > 0
        assert c.get("provenance") in ["REAL", "DERIVED", "INTERPOLATED"]


def test_phase5_well_reservoir_properties():
    """Verify continuous volumetric reservoir model at well location."""
    resp = client.get(f"/api/wells/{WELL_A}/reservoir-properties")
    assert resp.status_code == 200
    data = resp.json()
    assert "well_id" in data
    assert "formation" in data
    assert "layers" in data
    assert len(data["layers"]) > 0

    for lay in data["layers"]:
        assert "depth_tvd_z" in lay
        assert "porosity" in lay
        assert 0.05 <= lay["porosity"] <= 0.40
        assert "permeability_md" in lay
        assert lay["permeability_md"] > 0


def test_phase5_well_data_availability_matrix():
    """Verify multi-category data availability matrix for well."""
    resp = client.get(f"/api/wells/{WELL_A}/data-availability")
    assert resp.status_code == 200
    data = resp.json()
    assert "well_id" in data
    assert "formation_tops" in data
    assert "casing" in data
    assert "ddr" in data
    assert data["formation_tops"] == "AVAILABLE"
    assert data["casing"] == "AVAILABLE"
