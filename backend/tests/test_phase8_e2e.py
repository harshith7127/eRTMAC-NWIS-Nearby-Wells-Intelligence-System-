"""
Phase 8 End-to-End Validation & Backtesting Test Suite
Tests complete system integration on authentic Volve field data:
Active Well -> Formation Alignment -> Spatial Place Query -> Offset Coverage ->
Look-Ahead Rule Engine -> Evidence Linkage -> Historical Practice -> CSV Export.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_phase8_e2e_well_selection_and_depth():
    """Verify active well 15/9-19 A retrieval and depth metadata."""
    res = client.get("/api/wells/15/9-19%20A")
    assert res.status_code == 200
    well = res.json()
    assert well["well_id"] == "15/9-19 A"
    assert well["field"] == "VOLVE"
    assert well["provenance"] == "REAL"
    assert well["dataset"] == "VOLVE_PUBLIC"
    assert 58.4 < well["latitude"] < 58.5
    assert 1.9 < well["longitude"] < 2.0

def test_phase8_e2e_formation_alignment():
    """Verify stratigraphic alignment at 2000m MD returns Lower Hordaland Reactive Shale."""
    res = client.get("/api/wellbores/15/9-19%20A-WB1/formation-at-depth?md=2000.0")
    assert res.status_code == 200
    form_data = res.json()
    assert form_data["formation_name_canonical"] == "Lower Hordaland Reactive Shale"
    assert form_data["formation_top_md"] == 1975.0
    assert form_data["depth_below_top_md"] == 25.0

def test_phase8_e2e_spatial_place_query_and_offsets():
    """Verify place query around 15/9-19 A finds Volve offsets within 5 km."""
    res = client.get("/api/place?latitude=58.435903&longitude=1.929736&radius_km=5.0")
    assert res.status_code == 200
    data = res.json()
    offsets = data.get("nearby_wells", [])
    assert len(offsets) >= 5
    well_ids = [w["well_id"] for w in offsets]
    for expected in ["15/9-F-12", "15/9-F-15", "15/9-F-14", "15/9-F-11", "15/9-F-9"]:
        assert expected in well_ids

def test_phase8_e2e_lookahead_rule_engine():
    """Verify Phase 4 look-ahead at 2000m MD (300m window) finds historical offset incidents."""
    res = client.get("/api/offset/lookahead?wellbore_id=15/9-19%20A-WB1&current_md=2000.0&lookahead_m=300.0&radius_km=5.0&include_unreviewed=true")
    assert res.status_code == 200
    data = res.json()
    assert data["active_well"]["wellbore_id"] == "15/9-19 A-WB1"
    assert data["active_well"]["current_md"] == 2000.0
    assert data["query"]["lookahead_m"] == 300.0
    
    # Check that events or alerts are produced
    alerts = data.get("alerts", [])
    assert len(alerts) > 0

def test_phase8_e2e_evidence_linkage_and_practice():
    """Verify evidence drawer retrieves primary DDR report and historical practice."""
    res = client.get("/api/knowledge/events/INC-15_9-19%20A-023")
    assert res.status_code == 200
    data = res.json()
    event = data["event"]
    assert event["event_type"] == "LOSS"
    assert event["md"] == 2050.0
    assert data["depth_md"] == 2050.0
    assert "LCM pill" in (data.get("historical_practice") or event.get("action"))
    assert data["provenance"] == "REAL"
    
    # Verify linked DDR report
    report = data.get("source_report")
    assert report is not None
    assert report["report_id"] == "DDR-15_9-19 A-1997-09-01"
    assert "15/9-19 A" in report["title"]
    assert report["provenance"] == "REAL"

def test_phase8_e2e_knowledge_search_and_export():
    """Verify multi-attribute knowledge search and CSV export."""
    # Search
    search_res = client.get("/api/knowledge/search?formation=Lower%20Hordaland&event_type=LOSS")
    assert search_res.status_code == 200
    results = search_res.json()
    assert results["total_count"] >= 1
    assert any(r["event_id"] == "INC-15_9-19 A-023" for r in results["results"])
    
    # Export CSV
    export_res = client.get("/api/knowledge/export/csv?formation=Lower%20Hordaland")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"].startswith("text/csv")
    csv_text = export_res.text
    assert "well" in csv_text
    assert "provenance" in csv_text
    assert "15/9-19 A" in csv_text

def test_phase8_e2e_ml_governance_and_status():
    """Verify ML status is NOT_SHIPPED and no data leakage exists."""
    status_res = client.get("/api/ml/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["model_status"] == "NOT_SHIPPED"
    assert status_data["beats_rule_baseline"] is False
    
    eval_res = client.get("/api/ml/evaluation")
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["model_status"] == "NOT_SHIPPED"
    assert eval_data["evaluation_method"] == "LEAVE_ONE_WELL_OUT"
    assert len(eval_data["evaluated_wells"]) == 6
    assert eval_data["total_intervals"] == 662
