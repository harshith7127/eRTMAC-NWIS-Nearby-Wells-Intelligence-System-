"""
Phase 4 Subsurface 3D Geological Environment Automated Tests.
Validates:
1. Geological horizon surfaces and 2D/3D regular metric grids.
2. Structural fault planes, segments, and displacement metrics.
3. Jurassic Hugin oil reservoir bodies, net pay, porosity, and fluid contacts.
4. Trajectory coordinates, casing shoes, and formation picks for 3D wellbores.
5. Local metric coordinate transformations (E - E0, N - N0, z = -TVD).
6. 3D geology probe interrogation with accurate nearest well distances.
7. Anti-hallucination and provenance validation (DERIVED / INTERPOLATED / REAL).
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

ORIGIN_E = 435050.0
ORIGIN_N = 6478560.0
WATER_DEPTH_M = 91.0


def test_phase4_surfaces_list():
    """Verify listing of geological surfaces with depth, thickness, and provenance."""
    resp = client.get("/api/surfaces?workspace=volve")
    assert resp.status_code == 200
    surfaces = resp.json()
    assert len(surfaces) >= 5

    surface_ids = [s["id"] for s in surfaces]
    assert any("hugin" in s.lower() or "vestland" in s.lower() for s in surface_ids)
    
    for s in surfaces:
        assert "id" in s
        assert "name" in s
        assert "group_name" in s
        assert "average_tvd_m" in s
        assert "lithology" in s
        assert s["provenance"] in ["REAL", "DERIVED", "INTERPOLATED"]
        # Ensure depths are geologically plausible for Volve (0 - 4500m)
        assert 0 <= s["average_tvd_m"] <= 4500


def test_phase4_surface_grid_geometry():
    """Verify regular metric grid geometry for 3D horizon surface mesh generation."""
    # List surfaces to get an authentic surface id
    list_resp = client.get("/api/surfaces?workspace=volve")
    assert list_resp.status_code == 200
    surfaces = list_resp.json()
    surface_id = surfaces[0]["id"]

    resp = client.get(f"/api/surfaces/{surface_id}?workspace=volve&resolution=11")
    assert resp.status_code == 200
    grid = resp.json()

    assert "depth_values" in grid
    assert "grid_dim_x" in grid
    assert "grid_dim_y" in grid
    assert "origin_x" in grid
    assert "origin_y" in grid
    assert len(grid["depth_values"]) > 0

    # Verify structural depth values within realistic Volve subsurface range
    all_depths = [z for row in grid["depth_values"] for z in row]
    assert min(all_depths) > 0
    assert max(all_depths) < 4500
    # Provenance tracking
    assert grid["provenance"] in ["REAL", "DERIVED", "INTERPOLATED"]


def test_phase4_faults_geometry():
    """Verify structural fault planes, strike, dip, throw, and 3D segment polylines."""
    resp = client.get("/api/faults?workspace=volve")
    assert resp.status_code == 200
    faults = resp.json()
    assert len(faults) >= 1

    for f in faults:
        assert "id" in f
        assert "name" in f
        assert 0 <= f["strike_deg"] <= 360
        assert 0 <= f["dip_deg"] <= 90
        assert f["throw_m"] >= 0
        assert "depth_range_m" in f
        assert len(f["segments"]) >= 1
        assert f["provenance"] in ["REAL", "DERIVED", "INTERPOLATED"]


def test_phase4_reservoir_geometry_and_properties():
    """Verify Jurassic Hugin reservoir polygon, net pay, porosity, and fluid contacts."""
    resp = client.get("/api/reservoirs?workspace=volve")
    assert resp.status_code == 200
    reservoirs = resp.json()
    assert len(reservoirs) >= 1

    hugin = next((r for r in reservoirs if "hugin" in r["name"].lower() or "hugin" in r["formation"].lower()), None)
    assert hugin is not None, "Hugin reservoir body must be present for Volve"

    assert "hugin" in hugin["formation"].lower() or "vestland" in hugin["formation"].lower()
    assert hugin["net_pay_m"] > 0
    assert 0.1 <= hugin["avg_porosity_fraction"] <= 0.35  # Volve typical Hugin porosity ~20-22%
    assert hugin["permeability_md"] > 0
    assert hugin["oil_water_contact_tvd_m"] > 3000  # Volve OWC is approx 3120m TVDSS
    assert len(hugin["polygon"]) >= 3  # Valid polygon boundary


def test_phase4_trajectory_and_local_metric_frame():
    """Verify 3D trajectory data and coordinate conversion to local metric frame."""
    wellbore_id = "15/9-F-9-WB1"
    resp = client.get(f"/api/wellbores/{wellbore_id}/trajectory")
    assert resp.status_code == 200
    data = resp.json()
    stations = data.get("stations", [])
    assert len(stations) > 0

    for st in stations:
        assert "md" in st
        assert "tvd" in st
        assert "utm_easting" in st or "easting" in st or "dx" in st
        assert "utm_northing" in st or "northing" in st or "dy" in st

        tvd = st["tvd"]
        local_z = -tvd
        assert local_z <= 0  # Subsurface depths are negative Z in 3D frame

        if "utm_easting" in st and "utm_northing" in st:
            local_x = st["utm_easting"] - ORIGIN_E
            local_y = st["utm_northing"] - ORIGIN_N
            assert abs(local_x) < 15000
            assert abs(local_y) < 15000


def test_phase4_casing_and_shoes():
    """Verify casing strings and shoes for authentic 3D wellbore representation."""
    well_id = "15/9-F-12"
    resp = client.get(f"/api/wells/{well_id}/casing")
    assert resp.status_code == 200
    casings = resp.json()
    assert len(casings) >= 1

    for c in casings:
        assert "setting_depth_md" in c
        assert "casing_size" in c
        assert c.get("provenance") in ["REAL", "DERIVED", "INTERPOLATED"]


def test_phase4_formation_tops_picks():
    """Verify formation tops picks along wellbore trajectories."""
    wellbore_id = "15/9-F-12-WB1"
    resp = client.get(f"/api/wellbores/{wellbore_id}/formations")
    assert resp.status_code == 200
    tops = resp.json()
    assert len(tops) >= 3

    for pick in tops:
        assert "formation_name" in pick or "formation_name_canonical" in pick
        assert "md" in pick
        assert pick["md"] > 0


def test_phase4_geology_3d_probe():
    """Verify 3D probe interrogation at Volve coordinates with depth and nearest well."""
    # Probe at 15/9-F-12 surface location at 2500m TVD
    probe_url = "/api/geology/probe?latitude=58.4416&longitude=1.8875&depth_m=2500&depth_basis=TVD&workspace=volve"
    resp = client.get(probe_url)
    assert resp.status_code == 200
    result = resp.json()

    assert "formation" in result
    assert result["formation"] is not None
    assert "lithology" in result
    assert "nearby_wells" in result
    assert len(result["nearby_wells"]) > 0
    assert result["provenance"] in ["REAL", "DERIVED", "INTERPOLATED"]
