"""
Automated Test Suite for SIH121 Phase 3 Exploration Map
Validates:
- Map search by Well ID, Name, Field, and NPDID
- Canonical well metadata enrichment: TD, water depth, UTM coordinates
- Geologic probe endpoint with coordinates, distance to nearest well, formation, and confidence
- Structural faults endpoint (/api/faults?workspace=volve)
- Hugin reservoir endpoint (/api/reservoirs?workspace=volve)
- Strict anti-hallucination compliance (never invent values or coordinates)
- Empty search results handling
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


def test_map_well_search_by_id():
    """Verify searching wells by canonical Well ID."""
    res = client.get("/api/wells?search=15/9-F-12")
    assert res.status_code == 200
    wells = res.json()
    assert len(wells) == 1
    w = wells[0]
    assert w["well_id"] == "15/9-F-12"
    assert w["total_depth_m"] == 3520.0
    assert w["water_depth_m"] == 91.0
    assert w["npdid"] == 5599
    assert w["utm_easting"] == 435053.0
    assert w["utm_northing"] == 6478568.0


def test_map_well_search_by_npdid():
    """Verify searching wells by Norwegian Petroleum Directorate ID (NPDID)."""
    # 5599 -> 15/9-F-12
    res_f12 = client.get("/api/wells?search=5599")
    assert res_f12.status_code == 200
    wells_f12 = res_f12.json()
    assert len(wells_f12) == 1
    assert wells_f12[0]["well_id"] == "15/9-F-12"

    # 3145 -> 15/9-19 A
    res_19a = client.get("/api/wells?search=3145")
    assert res_19a.status_code == 200
    wells_19a = res_19a.json()
    assert len(wells_19a) == 1
    assert wells_19a[0]["well_id"] == "15/9-19 A"


def test_map_well_search_by_field():
    """Verify searching wells by field name returns field wells."""
    res = client.get("/api/wells?search=VOLVE")
    assert res.status_code == 200
    wells = res.json()
    assert len(wells) >= 6
    for w in wells:
        assert w["field"] == "VOLVE"


def test_map_well_search_empty():
    """Verify empty result when search term has no matches."""
    res = client.get("/api/wells?search=NON_EXISTENT_EXPLORATION_WELL_999")
    assert res.status_code == 200
    wells = res.json()
    assert len(wells) == 0


def test_click_probe_geology_in_surveyed_field():
    """Verify click probe at Volve platform location returns intersected formation & confidence."""
    # Near Well 15/9-F-12 (58.441636 N, 1.887483 E) at reservoir depth 2800m
    res = client.get("/api/geology/probe?latitude=58.441636&longitude=1.887483&depth_m=2800.0&workspace=volve")
    assert res.status_code == 200
    probe = res.json()
    assert probe["latitude"] == pytest.approx(58.441636, rel=1e-4)
    assert probe["longitude"] == pytest.approx(1.887483, rel=1e-4)
    assert probe["formation"] is not None
    assert probe["confidence"] in ("HIGH", "MODERATE")
    assert probe["provenance"] == "REAL"
    assert len(probe["nearby_wells"]) > 0


def test_click_probe_outside_surveyed_field():
    """Verify click probe outside surveyed boundaries explicitly returns UNKNOWN / data gaps."""
    # Offshore location far from Volve Block 15/9
    res = client.get("/api/geology/probe?latitude=62.0000&longitude=4.0000&depth_m=2000.0&workspace=volve")
    assert res.status_code == 200
    probe = res.json()
    assert probe["formation"] is None
    assert probe["confidence"] == "UNKNOWN"
    assert len(probe["data_gaps"]) > 0


def test_structural_faults_endpoint():
    """Verify /api/faults returns authentic Volve structural faults."""
    res = client.get("/api/faults?workspace=volve")
    assert res.status_code == 200
    faults = res.json()
    assert len(faults) >= 3
    fault_names = [f["name"] for f in faults]
    assert any("West Boundary Fault" in n for n in fault_names)
    assert any("East Crestal Fault" in n for n in fault_names)
    for f in faults:
        assert f["provenance"] == "REAL"
        assert len(f["segments"]) > 0


def test_hugin_reservoir_endpoint():
    """Verify /api/reservoirs returns Hugin reservoir body."""
    res = client.get("/api/reservoirs?workspace=volve")
    assert res.status_code == 200
    reservoirs = res.json()
    assert len(reservoirs) >= 1
    hugin = reservoirs[0]
    assert "Hugin" in hugin["name"]
    assert hugin["provenance"] == "REAL"
