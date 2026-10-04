"""
NWIS Backend Tests — FastAPI HTTP Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import init_db
from scripts.import_volve_to_sqlite import import_volve_to_sqlite


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    db_file = str(tmp_path_factory.mktemp("api_test") / "api_nwis.db")
    import_volve_to_sqlite(db_file)
    import os
    os.environ["NWIS_DB_PATH"] = db_file
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["dataset"] == "VOLVE_PUBLIC"


def test_get_wells(client):
    res = client.get("/api/wells")
    assert res.status_code == 200
    wells = res.json()
    assert len(wells) == 6
    assert any(w["well_id"] == "15/9-F-12" for w in wells)
    assert all(w["provenance"] == "REAL" for w in wells)


def test_get_single_well(client):
    res = client.get("/api/wells/15/9-F-12")
    assert res.status_code == 200
    well = res.json()
    assert well["well_id"] == "15/9-F-12"
    assert well["dataset"] == "VOLVE_PUBLIC"
    assert well["provenance"] == "REAL"
    assert "lat" not in well or "latitude" in well
    assert well["latitude"] > 50.0


def test_get_well_not_found(client):
    res = client.get("/api/wells/NON_EXISTENT_WELL_999")
    assert res.status_code == 404


def test_get_well_wellbores(client):
    res = client.get("/api/wells/15/9-F-12/wellbores")
    assert res.status_code == 200
    wbs = res.json()
    assert len(wbs) >= 1
    assert wbs[0]["well_id"] == "15/9-F-12"


def test_get_wellbore_formations(client):
    res = client.get("/api/wellbores/15/9-F-12-WB1/formations")
    assert res.status_code == 200
    forms = res.json()
    assert len(forms) == 10
    assert any(f["formation_name"] == "Upper Hordaland Shale" for f in forms)


def test_get_wellbore_surveys(client):
    res = client.get("/api/wellbores/15/9-F-9-WB1/surveys")
    assert res.status_code == 200
    surveys = res.json()
    assert len(surveys) >= 1
    assert "inclination" in surveys[0]
    assert "azimuth" in surveys[0]


def test_nearby_wells(client):
    res = client.get("/api/wells/nearby?latitude=58.4416&longitude=1.8875&radius_km=10")
    assert res.status_code == 200
    nearby = res.json()
    assert len(nearby) == 6
    assert nearby[0]["distance_km"] <= nearby[-1]["distance_km"]


def test_events_search(client):
    res = client.get("/api/events/search?event_type=LOSS")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0
    assert all(e["event_type"] == "LOSS" for e in events)


def test_get_single_event(client):
    # Search first to get a real event_id
    search_res = client.get("/api/events/search")
    event_id = search_res.json()[0]["event_id"]

    res = client.get(f"/api/events/{event_id}")
    assert res.status_code == 200
    event = res.json()
    assert event["event_id"] == event_id
    assert "evidence_start" in event


def test_patch_event_review(client):
    search_res = client.get("/api/events/search")
    event_id = search_res.json()[0]["event_id"]

    # Mark reviewed
    patch_res = client.patch(f"/api/events/{event_id}/review", json={"reviewed": True})
    assert patch_res.status_code == 200
    assert patch_res.json()["reviewed"] is True

    # Revert to unreviewed
    revert_res = client.patch(f"/api/events/{event_id}/review", json={"reviewed": False})
    assert revert_res.status_code == 200
    assert revert_res.json()["reviewed"] is False


def test_get_report_detail(client):
    reports_res = client.get("/api/reports")
    assert reports_res.status_code == 200
    rep_id = reports_res.json()[0]["report_id"]

    res = client.get(f"/api/reports/{rep_id}")
    assert res.status_code == 200
    rep = res.json()
    assert rep["report_id"] == rep_id
    assert "text" in rep
    assert "events" in rep
