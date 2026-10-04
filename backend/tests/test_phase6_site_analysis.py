"""
Phase 6 Automated Test Suite — Explainable Site Analysis, Risk Checklists & Decision Dossiers.
Validates:
1. Proposed location analysis API via both GET and POST.
2. Anti-hallucination compliance (Rule R5): strict absence of arbitrary composite percentage scores.
3. Factor checklist statuses (OK, CONCERN, UNKNOWN) with explicit rules and traceable evidence.
4. Multi-well offset triangulation and distance calculations.
5. Stratigraphic prognosis and target horizon resolution (Hugin Formation).
6. Volumetric reservoir intersection evaluation (Jurassic Hugin reservoir window).
7. Structural fault standoff and geohazard clearance (faults F-1, F-2, F-3).
8. Petrophysical wireline/LWD curve availability in offset control.
9. Historical DDR operational hazards (losses, kicks, pack-offs).
10. Defensible data confidence rating (HIGH, MEDIUM, LOW, UNKNOWN).
11. Data gaps and out-of-bounds geographic handling.
12. Strict provenance isolation (REAL for Volve vs SYNTHETIC for demo).
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


VOLVE_PROSPECT = {
    "latitude": 58.441636,
    "longitude": 1.887483,
    "target_depth_m": 3100.0,
    "target_formation": "Hugin Formation",
    "radius_km": 5.0,
    "workspace": "volve"
}


def test_phase6_analyze_location_post():
    """Verify POST /api/locations/analyze evaluates proposed drilling coordinates."""
    resp = client.post("/api/locations/analyze", json=VOLVE_PROSPECT)
    assert resp.status_code == 200
    data = resp.json()

    # Rule R5: Strict absence of arbitrary composite percentage scores
    assert "score" not in data
    assert "suitability" not in data
    assert "suitability_percentage" not in data
    assert "risk_score" not in data

    assert data["latitude"] == VOLVE_PROSPECT["latitude"]
    assert data["longitude"] == VOLVE_PROSPECT["longitude"]
    assert data["target_depth_m"] == 3100.0
    assert data["provenance"] == "REAL"
    assert data["overall_confidence"] in ["HIGH", "MEDIUM", "MODERATE", "LOW", "UNKNOWN"]
    assert len(data["factors"]) >= 8


def test_phase6_analyze_location_get():
    """Verify GET /api/locations/analyze with query parameters."""
    url = (
        f"/api/locations/analyze?latitude={VOLVE_PROSPECT['latitude']}"
        f"&longitude={VOLVE_PROSPECT['longitude']}"
        f"&target_depth_m={VOLVE_PROSPECT['target_depth_m']}"
        f"&target_formation=Hugin+Formation"
        f"&radius_km=5.0"
        f"&workspace=volve"
    )
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["factors"]) >= 8
    assert data["provenance"] == "REAL"


def test_phase6_explainable_factors_evidence_and_rules():
    """Verify that every factor provides why with evidence, rule, source, and valid status."""
    resp = client.post("/api/locations/analyze", json=VOLVE_PROSPECT)
    assert resp.status_code == 200
    data = resp.json()

    valid_statuses = {"OK", "UNKNOWN", "CONCERN"}
    for f in data["factors"]:
        assert f["status"] in valid_statuses
        assert len(f["summary"]) > 5
        assert len(f["evidence"]) > 10
        assert len(f["source"]) > 3
        assert f["provenance"] in ["REAL", "SYNTHETIC"]
        if f.get("rule"):
            assert f["rule"].startswith("RULE_")


def test_phase6_offset_well_triangulation_and_distance():
    """Verify nearby offset well control and distance calculations."""
    resp = client.post("/api/locations/analyze", json=VOLVE_PROSPECT)
    assert resp.status_code == 200
    data = resp.json()

    nearby = data.get("nearby_wells", [])
    assert len(nearby) >= 2, "Expected at least 2 offset wells within 5 km of Volve center"

    # Closest well must be within 1 km
    assert nearby[0]["dist_km"] <= 1.0
    assert nearby[0]["td"] >= 1000.0

    factor_names = [f["factor"] for f in data["factors"]]
    assert "offset_well_control" in factor_names
    assert "distance_to_wells" in factor_names


def test_phase6_reservoir_intersection_and_fault_standoff():
    """Verify reservoir penetration evaluation and structural fault proximity."""
    resp = client.post("/api/locations/analyze", json=VOLVE_PROSPECT)
    assert resp.status_code == 200
    data = resp.json()

    factors_by_name = {f["factor"]: f for f in data["factors"]}

    # Reservoir intersection for target at 3100m TVD (Hugin interval)
    res_factor = factors_by_name.get("reservoir_intersection")
    assert res_factor is not None
    assert res_factor["status"] == "OK"
    assert "Hugin" in res_factor["evidence"] or "Vestland" in res_factor["evidence"]

    # Fault standoff check
    fault_factor = factors_by_name.get("structural_fault_proximity")
    assert fault_factor is not None
    assert fault_factor["status"] in ["OK", "CONCERN"]
    assert "fault" in fault_factor["source"].lower()


def test_phase6_petrophysical_logs_and_drilling_events_analogue():
    """Verify wireline log availability and DDR operational incident analog."""
    resp = client.post("/api/locations/analyze", json=VOLVE_PROSPECT)
    assert resp.status_code == 200
    data = resp.json()

    factors_by_name = {f["factor"]: f for f in data["factors"]}

    # Well log availability
    log_factor = factors_by_name.get("well_log_availability")
    assert log_factor is not None
    assert log_factor["status"] == "OK"
    assert "well_logs" in log_factor["source"] or "Wireline" in log_factor["source"]

    # Drilling hazard incidents
    ddr_factor = factors_by_name.get("historical_drilling_hazards")
    assert ddr_factor is not None
    assert "DDR" in ddr_factor["source"] or "Drilling" in ddr_factor["source"]


def test_phase6_out_of_bounds_and_missing_data_handling():
    """Verify graceful handling for coordinates outside surveyed domain (Anti-Hallucination)."""
    out_of_bounds_prospect = {
        "latitude": 40.7128,  # NYC
        "longitude": -74.0060,
        "target_depth_m": 3100.0,
        "radius_km": 5.0,
        "workspace": "volve"
    }
    resp = client.post("/api/locations/analyze", json=out_of_bounds_prospect)
    assert resp.status_code == 200
    data = resp.json()

    assert data["overall_confidence"] == "LOW"
    assert len(data["data_gaps"]) >= 1

    factors_by_name = {f["factor"]: f for f in data["factors"]}
    geo_factor = factors_by_name.get("geographic_coverage")
    assert geo_factor["status"] == "CONCERN"

    offset_factor = factors_by_name.get("offset_well_control")
    assert offset_factor["status"] == "CONCERN"
    assert len(data.get("nearby_wells", [])) == 0


def test_phase6_unrecognized_target_formation():
    """Verify UNKNOWN status when nominated target formation is not recognized."""
    fake_formation_prospect = {
        "latitude": 58.441636,
        "longitude": 1.887483,
        "target_depth_m": 3100.0,
        "target_formation": "NON_EXISTENT_SUPER_FORMATION_XYZ",
        "radius_km": 5.0,
        "workspace": "volve"
    }
    resp = client.post("/api/locations/analyze", json=fake_formation_prospect)
    assert resp.status_code == 200
    data = resp.json()

    factors_by_name = {f["factor"]: f for f in data["factors"]}
    fm_factor = factors_by_name.get("target_formation")
    assert fm_factor["status"] == "UNKNOWN"
    assert any("NON_EXISTENT_SUPER_FORMATION_XYZ" in gap for gap in data["data_gaps"])


def test_phase6_demo_workspace_synthetic_isolation():
    """Verify demo workspace returns strictly SYNTHETIC provenance and demo bounds."""
    demo_prospect = {
        "latitude": 27.50,
        "longitude": 71.50,
        "target_depth_m": 2200.0,
        "radius_km": 5.0,
        "workspace": "onshore_demo"
    }
    resp = client.post("/api/locations/analyze", json=demo_prospect)
    assert resp.status_code == 200
    data = resp.json()
    assert data["provenance"] == "SYNTHETIC"
    assert "DEMO" in data["disclaimer"] or "simulated" in data["disclaimer"].lower()
