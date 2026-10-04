"""
NWIS Backend Tests — Service Layer (Spatial Proximity, Multi-dimensional Event Search, Review)
"""

import pytest
from backend.app.db import init_db, get_db_connection
from backend.app.services import well_service, event_service, report_service
from scripts.import_volve_to_sqlite import import_volve_to_sqlite


@pytest.fixture
def populated_db(tmp_path):
    db_file = str(tmp_path / "populated_nwis.db")
    import_volve_to_sqlite(db_file)
    conn = get_db_connection(db_file)
    yield conn
    conn.close()


def test_list_wells_and_filters(populated_db):
    wells = well_service.list_wells(populated_db)
    assert len(wells) == 6
    assert all(w["dataset"] == "VOLVE_PUBLIC" for w in wells)
    assert all(w["provenance"] == "REAL" for w in wells)

    # Filter by specific well ID / field
    volve_wells = well_service.list_wells(populated_db, field="VOLVE")
    assert len(volve_wells) == 6


def test_haversine_distance_calculation():
    # Equinor Volve 15/9-F-12 is at approx 58.441636 N, 1.887483 E
    # 15/9-F-15 is at approx 58.441586 N, 1.887542 E (very close, < 0.01 km)
    dist = well_service.haversine_distance(58.441636, 1.887483, 58.441586, 1.887542)
    assert dist >= 0.0
    assert dist < 0.05  # Within 50 meters

    # Distance to London (51.5074 N, 0.1278 W) should be ~780 km
    london_dist = well_service.haversine_distance(58.441636, 1.887483, 51.5074, -0.1278)
    assert 750 <= london_dist <= 850


def test_nearby_wells_query(populated_db):
    # Search from 15/9-F-12 coordinates within 10 km
    nearby = well_service.find_nearby_wells(
        populated_db,
        latitude=58.441636,
        longitude=1.887483,
        radius_km=10.0
    )
    assert len(nearby) == 6
    # First item should be 15/9-F-12 itself at distance 0.0
    assert nearby[0]["well_id"] == "15/9-F-12"
    assert nearby[0]["distance_km"] == 0.0


def test_event_search_by_type_and_depth(populated_db):
    # Search for LOSS events
    losses = event_service.search_events(populated_db, event_type="LOSS")
    assert len(losses) > 0
    assert all(e["event_type"] == "LOSS" for e in losses)

    # Search by depth interval (e.g. 1800m to 2500m)
    depth_events = event_service.search_events(populated_db, min_md=1800.0, max_md=2500.0)
    assert len(depth_events) > 0
    for e in depth_events:
        if e["md"] is not None:
            assert e["md"] >= 1800.0 or (e["md_end"] and e["md_end"] >= 1800.0)


def test_event_search_by_formation(populated_db):
    shale_events = event_service.search_events(populated_db, formation_name="Hordaland")
    assert len(shale_events) > 0
    assert all("Hordaland" in (e["formation_name"] or "") for e in shale_events)


def test_event_review_workflow(populated_db):
    events = event_service.search_events(populated_db)
    assert len(events) > 0
    target_event = events[0]
    event_id = target_event["event_id"]

    # Auto-extracted event must start unreviewed
    assert target_event["reviewed"] is False

    # Review event
    updated = event_service.update_event_review(populated_db, event_id, True)
    assert updated["reviewed"] is True

    # Check search with reviewed filter
    reviewed_events = event_service.search_events(populated_db, reviewed=True)
    assert any(e["event_id"] == event_id for e in reviewed_events)

    # Unreview
    reverted = event_service.update_event_review(populated_db, event_id, False)
    assert reverted["reviewed"] is False


def test_report_detail_with_evidence_spans(populated_db):
    reports = report_service.list_reports(populated_db)
    assert len(reports) == 80

    # Pick a report with linked incidents if available
    target_rep = reports[0]
    rep_id = target_rep["report_id"]
    detail = report_service.get_report(populated_db, rep_id)
    assert detail is not None
    assert "events" in detail
    assert isinstance(detail["events"], list)
