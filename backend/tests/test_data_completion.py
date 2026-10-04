"""
Automated Test Suite for SIH121 Data Completion & Verification
Tests:
- Canonical well mapping and identity resolution
- Well-log curve endpoints (GR, Resistivity, RHOB, NPHI, DT)
- Mud logging telemetry endpoints
- Casing strings and shoe depths
- Volumetric reservoir properties linkage
- Multi-well data availability matrix
- Preservation of authoritative geological geometry (data/volve/geology/)
- Proper error handling and missing-data status (NOT_AVAILABLE)
"""

import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import get_db_path

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    canonical_db = os.path.join(base_dir, "data", "nwis.db")
    monkeypatch.setenv("NWIS_DB_PATH", canonical_db)


def test_canonical_wells_registered():
    """Verify that canonical Volve wells exist in the API."""
    response = client.get("/api/wells?workspace=volve")
    assert response.status_code == 200
    wells = response.json()
    well_ids = [w["well_id"] for w in wells]

    expected = ["15/9-F-12", "15/9-F-4", "15/9-F-9", "15/9-F-11", "15/9-F-14", "15/9-F-15", "15/9-19 A"]
    for ew in expected:
        assert ew in well_ids, f"Expected canonical well {ew} missing from /api/wells"


def test_well_log_curves_summary_and_points():
    """Verify well log curve queries for well 15/9-F-4."""
    # 1. Summary of curves
    res = client.get("/api/wells/15/9-F-4/logs")
    assert res.status_code == 200
    curves = res.json()
    assert len(curves) > 0
    curve_names = [c["curve_name"] for c in curves]
    assert "gamma_ray" in curve_names
    assert "bulk_density" in curve_names
    assert "neutron_porosity" in curve_names
    assert "sonic_dt" in curve_names

    # 2. Specific curve points
    res_gr = client.get("/api/wells/15/9-F-4/logs/gamma_ray?limit=50")
    assert res_gr.status_code == 200
    gr_data = res_gr.json()
    assert gr_data["well_id"] == "15/9-F-4"
    assert gr_data["curve_name"] == "gamma_ray"
    assert len(gr_data["points"]) > 0
    first_pt = gr_data["points"][0]
    assert "depth_md" in first_pt
    assert "value" in first_pt
    assert first_pt["value"] > 0.0
    assert first_pt["quality"] == "VERIFIED_ORIGINAL"


def test_mud_log_telemetry():
    """Verify mud logging telemetry queries for well 15/9-F-4."""
    res = client.get("/api/wells/15/9-F-4/mudlog?limit=100")
    assert res.status_code == 200
    mud = res.json()
    assert mud["well_id"] == "15/9-F-4"
    assert mud["parameter_count"] >= 10
    assert "rop" in mud["parameters_available"]
    assert "torque" in mud["parameters_available"]
    assert "spp" in mud["parameters_available"]
    assert len(mud["points"]) > 0

    # Filter by specific parameter
    res_rop = client.get("/api/wells/15/9-F-4/mudlog?parameter=rop&limit=50")
    assert res_rop.status_code == 200
    rop_data = res_rop.json()
    assert all(p["parameter_name"] == "rop" for p in rop_data["points"])


def test_casing_strings():
    """Verify casing strings and shoe depths for Volve wells."""
    # Well 15/9-F-12
    res_f12 = client.get("/api/wells/15/9-F-12/casing")
    assert res_f12.status_code == 200
    casings_f12 = res_f12.json()
    assert len(casings_f12) >= 4
    sizes_f12 = [c["casing_size"] for c in casings_f12]
    assert any("30\"" in s for s in sizes_f12)
    assert any("13-3/8\"" in s for s in sizes_f12)
    assert any("9-5/8\"" in s for s in sizes_f12)
    assert any("7\"" in s for s in sizes_f12)

    # Well 15/9-F-9 (from WITSML wbGeometry)
    res_f9 = client.get("/api/wells/15/9-F-9/casing")
    assert res_f9.status_code == 200
    casings_f9 = res_f9.json()
    assert len(casings_f9) >= 3


def test_reservoir_properties():
    """Verify volumetric reservoir properties retrieved from authoritative grid."""
    res = client.get("/api/wells/15/9-F-12/reservoir-properties")
    assert res.status_code == 200
    res_prop = res.json()
    assert res_prop["well_id"] == "15/9-F-12"
    assert res_prop["status"] == "AVAILABLE"
    assert res_prop["average_porosity"] is not None
    assert 0.15 <= res_prop["average_porosity"] <= 0.30
    assert res_prop["average_permeability_md"] is not None
    assert len(res_prop["layers"]) == 5


def test_well_data_availability():
    """Verify data availability matrix returns truthful categorical status."""
    # Well with full telemetry and logs
    res_f4 = client.get("/api/wells/15/9-F-4/data-availability")
    assert res_f4.status_code == 200
    avail_f4 = res_f4.json()
    assert avail_f4["gamma_ray"] == "AVAILABLE"
    assert avail_f4["mud_log"] == "AVAILABLE"
    assert avail_f4["ddr"] == "AVAILABLE"
    assert avail_f4["casing"] == "AVAILABLE"

    # Well 15/9-19 A (appraisal well with no continuous LWD density log in CSV)
    res_19a = client.get("/api/wells/15/9-19 A/data-availability")
    assert res_19a.status_code == 200
    avail_19a = res_19a.json()
    assert avail_19a["density"] == "NOT_AVAILABLE"
    assert avail_19a["formation_tops"] == "AVAILABLE"
    assert avail_19a["ddr"] == "AVAILABLE"


def test_missing_well_error_handling():
    """Verify 404 behavior for non-existent well."""
    res = client.get("/api/wells/NON_EXISTENT_WELL_99/logs")
    assert res.status_code == 404

    res = client.get("/api/wells/NON_EXISTENT_WELL_99/casing")
    assert res.status_code == 404

    res = client.get("/api/wells/NON_EXISTENT_WELL_99/data-availability")
    assert res.status_code == 404


def test_geology_geometry_untouched():
    """Verify that existing continuous geological geometry files exist and are intact."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    geo_dir = os.path.join(base_dir, "data", "volve", "geology")

    expected_files = [
        "horizons_continuous_xyz.parquet",
        "top_hugin_surface_xyz.csv",
        "fault_sticks_xyz.csv",
        "fault_polygons_xyz.json",
        "reservoir_grid_3d.parquet"
    ]
    for ef in expected_files:
        p = os.path.join(geo_dir, ef)
        assert os.path.exists(p), f"Geology file {ef} must exist!"
        assert os.path.getsize(p) > 1000, f"Geology file {ef} must not be empty!"


def test_well_events():
    """Verify well-specific drilling events retrieval."""
    res = client.get("/api/wells/15/9-19 A/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0
    first_ev = events[0]
    assert "event_id" in first_ev
    assert "event_type" in first_ev
    assert first_ev["provenance"] in ("REAL", "DERIVED")


def test_ddr_reports_extracted():
    """Verify DDR reports exist in database and can be queried."""
    import sqlite3
    db_path = os.environ.get("NWIS_DB_PATH", "data/nwis.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rep_count = conn.execute("SELECT count(*) FROM reports").fetchone()[0]
    assert rep_count >= 1500, f"Expected >= 1500 DDR reports, found {rep_count}"
    sample_rep = conn.execute("SELECT * FROM reports LIMIT 1").fetchone()
    assert sample_rep["report_id"] is not None
    assert sample_rep["text"] is not None
    conn.close()


def test_provenance_isolation():
    """Verify REAL_VOLVE and SYNTHETIC_DEMO datasets are strictly isolated."""
    res_volve = client.get("/api/wells?workspace=volve")
    assert res_volve.status_code == 200
    for w in res_volve.json():
        assert w["provenance"] == "REAL", f"Well {w['well_id']} in Volve must have REAL provenance"

    res_demo = client.get("/api/wells?workspace=onshore_demo")
    assert res_demo.status_code == 200
    for w in res_demo.json():
        assert w["provenance"] == "SYNTHETIC", f"Demo well {w['well_id']} must have SYNTHETIC provenance"
