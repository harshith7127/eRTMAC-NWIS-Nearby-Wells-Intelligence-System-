"""
NWIS Phase 2 Contract & Integrity Tests
Validates:
1. Workspace separation (Workspace A: Volve, Workspace B: Demo Onshore)
2. /api/surfaces and 3D regular metric grids
3. /api/faults and /api/reservoirs
4. /api/terrain bathymetry
5. /api/geology/probe subsurface interrogation
6. /api/locations/analyze explainable factor checklist (No arbitrary scores)
7. Banned-string quarantine tests (No synthetic constants leaking into Workspace A)
8. Geodetic coordinate transformation fidelity
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Workspaces Endpoint Tests
# ---------------------------------------------------------------------------
def test_get_workspaces_list():
    res = client.get("/api/workspaces")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    ws_ids = [w["id"] for w in data]
    assert "volve" in ws_ids
    assert "onshore_demo" in ws_ids

    # Verify Volve metadata
    volve_ws = next(w for w in data if w["id"] == "volve")
    assert volve_ws["type"] == "REAL_VOLVE"
    assert volve_ws["provenance"] == "REAL"
    assert "ED50" in volve_ws["crs"]
    assert volve_ws["well_count"] == 6

    # Verify Demo metadata
    demo_ws = next(w for w in data if w["id"] == "onshore_demo")
    assert demo_ws["type"] == "DEMO_ONSHORE"
    assert demo_ws["provenance"] == "SYNTHETIC"
    assert "DEMO" in demo_ws["disclaimer"]


def test_get_individual_workspace():
    res_v = client.get("/api/workspaces/volve")
    assert res_v.status_code == 200
    assert res_v.json()["id"] == "volve"

    res_d = client.get("/api/workspaces/onshore_demo")
    assert res_d.status_code == 200
    assert res_d.json()["id"] == "onshore_demo"

    res_404 = client.get("/api/workspaces/non_existent_workspace")
    assert res_404.status_code == 404


# ---------------------------------------------------------------------------
# 2. Surfaces Endpoint Tests
# ---------------------------------------------------------------------------
def test_get_surfaces_summary():
    res = client.get("/api/surfaces?workspace=volve")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 10
    names = [s["name"] for s in data]
    assert "Nordland Group" in names
    assert "Lower Hordaland Reactive Shale" in names
    assert "Vestland Group (Hugin Reservoir)" in names

    for s in data:
        assert s["provenance"] == "REAL"
        assert s["average_tvd_m"] > 0
        assert s["lithology"] != ""


def test_get_surface_grid_detail():
    res = client.get("/api/surfaces/lower_hordaland?workspace=volve&resolution=15")
    assert res.status_code == 200
    grid = res.json()
    assert grid["id"] == "lower_hordaland"
    assert grid["grid_dim_x"] == 15
    assert grid["grid_dim_y"] == 15
    assert len(grid["depth_values"]) == 15
    assert len(grid["depth_values"][0]) == 15
    assert grid["provenance"] == "REAL"
    # Ensure depths are around 1975m TVD
    sample_val = grid["depth_values"][7][7]
    assert 1900.0 < sample_val < 2050.0


# ---------------------------------------------------------------------------
# 3. Faults & Reservoirs Endpoint Tests
# ---------------------------------------------------------------------------
def test_get_faults():
    res = client.get("/api/faults?workspace=volve")
    assert res.status_code == 200
    faults = res.json()
    assert len(faults) >= 3
    names = [f["name"] for f in faults]
    assert any("West Boundary" in n for n in names)
    for f in faults:
        assert f["strike_deg"] >= 0.0
        assert f["dip_deg"] > 0.0
        assert len(f["segments"]) > 0
        assert f["provenance"] == "REAL"


def test_get_reservoirs():
    res = client.get("/api/reservoirs?workspace=volve")
    assert res.status_code == 200
    reservoirs = res.json()
    assert len(reservoirs) >= 1
    hugin = reservoirs[0]
    assert "Hugin" in hugin["name"]
    assert hugin["top_tvd_m"] == 3085.0
    assert hugin["base_tvd_m"] == 3280.0
    assert hugin["avg_porosity_fraction"] == 0.21
    assert hugin["permeability_md"] == 950.0
    assert hugin["oil_water_contact_tvd_m"] == 3180.0
    assert hugin["provenance"] == "REAL"


# ---------------------------------------------------------------------------
# 4. Terrain & Bathymetry Endpoint Tests
# ---------------------------------------------------------------------------
def test_get_terrain_bathymetry():
    res = client.get("/api/terrain/bathymetry?workspace=volve")
    assert res.status_code == 200
    data = res.json()
    assert data["terrain_type"] == "BATHYMETRY"
    assert data["seabed_depth_m"] == 91.0
    assert data["provenance"] == "REAL"
    # Volve bathymetric grid points should be around -91m MSL
    assert len(data["elevation_grid"]) > 0
    sample_pt = data["elevation_grid"][0][0]
    assert -100.0 < sample_pt < -80.0


# ---------------------------------------------------------------------------
# 5. Geology Probe Endpoint Tests
# ---------------------------------------------------------------------------
def test_geology_probe_inside_bounds():
    # Volve center at 2000m TVD (Lower Hordaland Reactive Shale)
    res = client.get("/api/geology/probe?latitude=58.4416&longitude=1.8875&depth_m=2000.0&workspace=volve")
    assert res.status_code == 200
    data = res.json()
    assert data["formation"] == "Lower Hordaland Reactive Shale"
    assert data["group_name"] == "Hordaland Group"
    assert data["rock_type"] == "Shale"
    assert data["pore_pressure_emw"] == 1.35
    assert data["confidence"] in ("HIGH", "MODERATE")
    assert data["data_availability"] in ("MEASURED", "INTERPOLATED")
    assert data["provenance"] == "REAL"


def test_geology_probe_shallow_seabed():
    res = client.get("/api/geology/probe?latitude=58.4416&longitude=1.8875&depth_m=50.0&workspace=volve")
    assert res.status_code == 200
    data = res.json()
    assert "Seabed" in data["formation"]
    assert data["confidence"] == "HIGH"


def test_geology_probe_outside_bounds():
    # Far out in Atlantic Ocean
    res = client.get("/api/geology/probe?latitude=10.0&longitude=10.0&depth_m=2000.0&workspace=volve")
    assert res.status_code == 200
    data = res.json()
    assert data["formation"] is None
    assert data["confidence"] == "UNKNOWN"
    assert data["data_availability"] == "UNKNOWN"
    assert len(data["data_gaps"]) > 0


# ---------------------------------------------------------------------------
# 6. Location Analysis Tests (Rule 5: No Arbitrary Scores)
# ---------------------------------------------------------------------------
def test_location_analyze_explainable_factors():
    payload = {
        "latitude": 58.441636,
        "longitude": 1.887483,
        "target_depth_m": 3100.0,
        "target_formation": "Vestland Group (Hugin Reservoir)",
        "radius_km": 5.0,
        "workspace": "volve"
    }
    res = client.post("/api/locations/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Rule 5 check: MUST NOT contain composite percentage scores (e.g. 82%)
    assert "score" not in data
    assert "suitability_percentage" not in data
    assert "suitability" not in data

    # Check explainable factor checklist
    assert "factors" in data
    factors = data["factors"]
    assert len(factors) >= 5

    factor_names = [f["factor"] for f in factors]
    assert "geographic_coverage" in factor_names
    assert "offset_well_control" in factor_names
    assert "target_formation" in factor_names
    assert "depth_feasibility" in factor_names
    assert "structural_fault_proximity" in factor_names

    # Check each factor uses only OK, UNKNOWN, CONCERN
    valid_statuses = {"OK", "UNKNOWN", "CONCERN"}
    for f in factors:
        assert f["status"] in valid_statuses
        assert len(f["evidence"]) > 0
        assert len(f["source"]) > 0

    assert data["overall_confidence"] in ("HIGH", "MEDIUM", "MODERATE", "LOW", "UNKNOWN")
    assert data["provenance"] == "REAL"


# ---------------------------------------------------------------------------
# 7. Banned-String & Quarantine Tests (Rule 4)
# ---------------------------------------------------------------------------
def test_banned_strings_in_workspace_a():
    """Ensure synthetic demo constants never leak into Workspace A (Volve)."""
    banned_keywords = ["Jodhpur", "Rig-04", "A-17", "B-04", "SYNTHETIC_DEMO", "Jaisalmer"]

    # 1. Wells list in Volve
    res_wells = client.get("/api/wells?workspace=volve")
    assert res_wells.status_code == 200
    wells_text = res_wells.text
    for kw in banned_keywords:
        assert kw not in wells_text, f"Banned synthetic keyword '{kw}' found in Workspace A wells"

    # 2. Surfaces in Volve
    res_surfaces = client.get("/api/surfaces?workspace=volve")
    assert res_surfaces.status_code == 200
    surfaces_text = res_surfaces.text
    for kw in ["Jodhpur", "Upper Sandstone", "Basement Gneiss"]:
        assert kw not in surfaces_text, f"Banned synthetic surface '{kw}' found in Workspace A surfaces"

    # 3. Faults in Volve
    res_faults = client.get("/api/faults?workspace=volve")
    assert res_faults.status_code == 200
    assert "Simulated" not in res_faults.text


# ---------------------------------------------------------------------------
# 8. Geodetic Coordinate Verification (Rule 7)
# ---------------------------------------------------------------------------
def test_ed50_utm31n_to_wgs84_fidelity():
    """Verify that Volve wellhead coordinates in WGS84 are accurate to Norwegian Directorate publications."""
    res = client.get("/api/wells/15%2F9-F-12")
    assert res.status_code == 200
    w = res.json()
    # Official WGS84 coordinates for 15/9-F-12: ~58.441636 N, 1.887483 E
    assert abs(w["latitude"] - 58.441636) < 0.001
    assert abs(w["longitude"] - 1.887483) < 0.001
    assert w["provenance"] == "REAL"
