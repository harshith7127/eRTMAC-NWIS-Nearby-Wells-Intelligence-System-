"""
NWIS Backend Tests — Place Query & Spatial Evidence Retrieval
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from scripts.import_volve_to_sqlite import import_volve_to_sqlite


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    db_file = str(tmp_path_factory.mktemp("place_test") / "place_nwis.db")
    import_volve_to_sqlite(db_file)
    import os
    os.environ["NWIS_DB_PATH"] = db_file
    with TestClient(app) as test_client:
        yield test_client


def test_place_query_default_location(client):
    res = client.get("/api/place")
    assert res.status_code == 200
    data = res.json()

    assert "query" in data
    assert "nearby_wells" in data
    assert "formations" in data
    assert "events" in data
    assert "data_gaps" in data
    assert "provenance_summary" in data

    # Default location is 15/9-F-12 (Volve center)
    assert len(data["nearby_wells"]) >= 5
    assert data["nearby_wells"][0]["well_id"] == "15/9-F-12"
    assert data["nearby_wells"][0]["distance_km"] == 0.0


def test_place_query_radius_filtering(client):
    # Search with tight radius (50 meters) -> only very close wells
    res_tight = client.get("/api/place?latitude=58.441636&longitude=1.887483&radius_km=0.05")
    assert res_tight.status_code == 200
    data_tight = res_tight.json()

    # Search with wide radius (10 km) -> all Volve field wells
    res_wide = client.get("/api/place?latitude=58.441636&longitude=1.887483&radius_km=10.0")
    assert res_wide.status_code == 200
    data_wide = res_wide.json()

    assert len(data_wide["nearby_wells"]) >= len(data_tight["nearby_wells"])


def test_place_query_subsurface_trajectory_vs_fallback(client):
    res = client.get("/api/place?latitude=58.441636&longitude=1.887483&radius_km=10.0")
    assert res.status_code == 200
    wells = res.json()["nearby_wells"]

    # Well 15/9-F-9 has imported WITSML trajectory stations
    f9_well = next((w for w in wells if w["well_id"] == "15/9-F-9"), None)
    if f9_well:
        assert f9_well["trajectory_basis"] == "SUBSURFACE_SURVEY"
        assert f9_well["closest_approach_m"] is not None

    # Wells without directional surveys use wellhead fallback
    other_well = next((w for w in wells if w["well_id"] == "15/9-19 A"), None)
    if other_well:
        assert other_well["trajectory_basis"] == "WELLHEAD_FALLBACK"


def test_place_query_depth_filtering(client):
    # Query at 2212 m MD (where a sticky hole incident occurred in Lower Hordaland)
    res_depth = client.get("/api/place?latitude=58.441636&longitude=1.887483&radius_km=10.0&depth_m=2212")
    assert res_depth.status_code == 200
    data = res_depth.json()

    events = data["events"]
    assert len(events) > 0
    # Every returned event with a depth must be within the depth filter window (±250m)
    for ev in events:
        if ev["md"] is not None:
            assert abs(ev["md"] - 2212.0) <= 250.0


def test_place_query_data_gaps(client):
    res = client.get("/api/place?latitude=58.441636&longitude=1.887483&radius_km=2.0")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["data_gaps"], list)
    assert len(data["data_gaps"]) > 0  # Unreviewed events and fallback surveys are explicitly listed


def test_place_query_invalid_coordinates(client):
    # Invalid latitude > 90
    res = client.get("/api/place?latitude=95.0&longitude=1.88")
    assert res.status_code in (400, 422)

    # Excessive radius > 50 km
    res_radius = client.get("/api/place?latitude=58.44&longitude=1.88&radius_km=100.0")
    assert res_radius.status_code in (400, 422)


def test_place_query_empty_location(client):
    # Query in middle of Pacific ocean (0, -140)
    res = client.get("/api/place?latitude=0.0&longitude=-140.0&radius_km=2.0")
    assert res.status_code == 200
    data = res.json()
    assert len(data["nearby_wells"]) == 0
    assert any("No wellbores found" in gap for gap in data["data_gaps"])
