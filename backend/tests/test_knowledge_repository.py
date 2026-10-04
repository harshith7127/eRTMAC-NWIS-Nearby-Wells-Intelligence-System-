"""
NWIS Phase 7 Knowledge Repository, Evidence Search & Traceability Backend Test Suite
Tests:
1. Knowledge search
2. Event detail
3. Report detail
4. Evidence retrieval
5. Formation filtering
6. Event filtering
7. Depth filtering
8. Well filtering
9. Provenance filtering
10. Reviewed-only filtering
11. Active-well context
12. Nearby-well integration
13. Phase 4 look-ahead integration
14. Missing evidence handling
15. Missing report handling
16. Historical practice preservation
17. No fabricated evidence
18. Provenance correctness
19. CSV export
20. Pagination
"""

import sqlite3
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.knowledge_service import (
    search_knowledge,
    get_knowledge_event_detail,
    get_knowledge_report_detail,
    get_active_well_knowledge_context,
    export_knowledge_events_csv
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db_conn():
    conn = sqlite3.connect("data/nwis.db")
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


# ----------------------------------------------------
# 1. Knowledge Search Base Test
# ----------------------------------------------------
def test_knowledge_search_base(db_conn):
    res = search_knowledge(db_conn, query="sweeps")
    assert res["total_count"] > 0
    assert len(res["results"]) > 0
    first = res["results"][0]
    assert first["result_type"] in ("EVENT", "REPORT")
    assert first["provenance"] in ("REAL", "DERIVED", "SYNTHETIC", "ILLUSTRATIVE")


# ----------------------------------------------------
# 2. Event Detail & Evidence Traceability
# ----------------------------------------------------
def test_knowledge_event_detail(db_conn):
    # Find any existing event
    ev_row = db_conn.execute("SELECT event_id FROM events LIMIT 1").fetchone()
    assert ev_row is not None
    ev_id = ev_row[0]

    detail = get_knowledge_event_detail(db_conn, ev_id)
    assert detail is not None
    assert detail["event"]["event_id"] == ev_id
    assert detail["formation"] is not None
    assert detail["provenance"] in ("REAL", "DERIVED", "SYNTHETIC", "ILLUSTRATIVE")
    if detail["historical_practice"]:
        assert detail["historical_practice"].startswith("Historical offset practice: Offset well")


# ----------------------------------------------------
# 3. Report Detail & Evidence Spans
# ----------------------------------------------------
def test_knowledge_report_detail(db_conn):
    rep_row = db_conn.execute("SELECT report_id FROM reports LIMIT 1").fetchone()
    assert rep_row is not None
    rep_id = rep_row[0]

    rep_detail = get_knowledge_report_detail(db_conn, rep_id)
    assert rep_detail is not None
    assert rep_detail["report_id"] == rep_id
    assert rep_detail["text"] is not None
    assert isinstance(rep_detail["events"], list)
    assert isinstance(rep_detail["evidence_spans"], list)


# ----------------------------------------------------
# 4. Evidence Retrieval Verification
# ----------------------------------------------------
def test_evidence_retrieval(db_conn):
    # Search for an event with source_text
    res = search_knowledge(db_conn, limit=50)
    event_results = [r for r in res["results"] if r["result_type"] == "EVENT" and r.get("source_text")]
    assert len(event_results) > 0
    first_ev = event_results[0]
    assert first_ev["source_text"] is not None
    assert len(first_ev["source_text"]) > 0


# ----------------------------------------------------
# 5. Formation Filtering
# ----------------------------------------------------
def test_formation_filtering(db_conn):
    res = search_knowledge(db_conn, formation="Chalk")
    assert res["total_count"] > 0
    for r in res["results"]:
        if r["result_type"] == "EVENT":
            assert "Chalk" in r["formation"] or "Shetland" in r["formation"]


# ----------------------------------------------------
# 6. Event Type Filtering
# ----------------------------------------------------
def test_event_type_filtering(db_conn):
    res = search_knowledge(db_conn, event_type="STICKY_HOLE")
    assert res["total_count"] > 0
    for r in res["results"]:
        assert r["result_type"] == "EVENT"
        assert r["event_type"].upper() == "STICKY_HOLE"


# ----------------------------------------------------
# 7. Depth Range Filtering
# ----------------------------------------------------
def test_depth_filtering(db_conn):
    res = search_knowledge(db_conn, depth_min=2000.0, depth_max=3000.0)
    for r in res["results"]:
        if r["result_type"] == "EVENT" and r.get("depth") is not None:
            assert 2000.0 <= r["depth"] <= 3000.0


# ----------------------------------------------------
# 8. Well Filtering
# ----------------------------------------------------
def test_well_filtering(db_conn):
    res = search_knowledge(db_conn, well_id="15/9-19 A")
    assert res["total_count"] > 0
    for r in res["results"]:
        assert r["well_id"] == "15/9-19 A"


# ----------------------------------------------------
# 9. Provenance Filtering
# ----------------------------------------------------
def test_provenance_filtering(db_conn):
    res = search_knowledge(db_conn, provenance="REAL")
    assert res["total_count"] > 0
    for r in res["results"]:
        assert r["provenance"] == "REAL"


# ----------------------------------------------------
# 10. Reviewed-Only Filtering
# ----------------------------------------------------
def test_reviewed_only_filtering(db_conn):
    res = search_knowledge(db_conn, reviewed_only=True)
    for r in res["results"]:
        assert r["reviewed"] is True


# ----------------------------------------------------
# 11. Active-Well Knowledge Context
# ----------------------------------------------------
def test_active_well_knowledge_context(db_conn):
    ctx = get_active_well_knowledge_context(
        db_conn,
        wellbore_id="15/9-F-12-WB1",
        current_md=2750.0,
        radius_km=2.0,
        lookahead_m=300.0
    )
    assert ctx is not None
    assert ctx["current_position"]["wellbore_id"] == "15/9-F-12-WB1"
    assert ctx["current_position"]["current_md"] == 2750.0
    assert ctx["current_position"]["current_formation"] is not None
    assert "nearby_well_coverage" in ctx
    assert "lookahead" in ctx
    assert "disclaimer" in ctx
    assert "Volve" in ctx["disclaimer"]


# ----------------------------------------------------
# 12. Nearby-Well Integration in Context
# ----------------------------------------------------
def test_nearby_well_integration_in_context(db_conn):
    ctx = get_active_well_knowledge_context(
        db_conn,
        wellbore_id="15/9-F-12-WB1",
        current_md=2750.0,
        radius_km=5.0
    )
    assert ctx["nearby_well_coverage"]["candidate_wells_count"] > 0
    assert len(ctx["nearby_well_coverage"]["candidate_details"]) > 0


# ----------------------------------------------------
# 13. Phase 4 Lookahead Integration in Context
# ----------------------------------------------------
def test_phase4_lookahead_integration(db_conn):
    ctx = get_active_well_knowledge_context(
        db_conn,
        wellbore_id="15/9-F-12-WB1",
        current_md=2750.0,
        lookahead_m=300.0
    )
    lh = ctx["lookahead"]
    assert "alerts" in lh
    assert "coverage" in lh
    assert "evidence" in lh


# ----------------------------------------------------
# 14. Missing Evidence Handling
# ----------------------------------------------------
def test_missing_evidence_handling(db_conn):
    # Event with missing source text returns explicit data gap
    detail = get_knowledge_event_detail(db_conn, "NON_EXISTENT_EVT")
    assert detail is None


# ----------------------------------------------------
# 15. Missing Report Handling
# ----------------------------------------------------
def test_missing_report_handling(db_conn):
    rep = get_knowledge_report_detail(db_conn, "NON_EXISTENT_REPORT")
    assert rep is None


# ----------------------------------------------------
# 16. Historical Practice Preservation (Strict Prefix)
# ----------------------------------------------------
def test_historical_practice_preservation(db_conn):
    res = search_knowledge(db_conn, limit=50)
    with_actions = [r for r in res["results"] if r.get("historical_practice")]
    assert len(with_actions) > 0
    for r in with_actions:
        assert r["historical_practice"].startswith("Historical offset practice: Offset well")
        assert "Recommended" not in r["historical_practice"]


# ----------------------------------------------------
# 17. No Fabricated Evidence
# ----------------------------------------------------
def test_no_fabricated_evidence(db_conn):
    res = search_knowledge(db_conn, query="DEFINITELY_NOT_EXISTING_QUERY_STRING_XYZ")
    assert res["total_count"] == 0
    assert len(res["results"]) == 0
    assert len(res["data_gaps"]) > 0


# ----------------------------------------------------
# 18. Provenance Correctness
# ----------------------------------------------------
def test_provenance_correctness(db_conn):
    ctx = get_active_well_knowledge_context(
        db_conn,
        wellbore_id="15/9-F-12-WB1",
        current_md=2750.0
    )
    assert ctx["current_position"]["provenance"] == "DERIVED"
    assert ctx["provenance_breakdown"]["REAL"] >= 0
    assert ctx["provenance_breakdown"]["DERIVED"] >= 1


# ----------------------------------------------------
# 19. CSV Export
# ----------------------------------------------------
def test_csv_export(db_conn):
    csv_str = export_knowledge_events_csv(db_conn)
    assert csv_str.startswith("well,wellbore,formation")
    assert "historical_practice" in csv_str
    lines = csv_str.strip().split("\n")
    assert len(lines) > 1


# ----------------------------------------------------
# 20. Pagination & API Endpoints
# ----------------------------------------------------
def test_knowledge_api_endpoints():
    # 1. Search endpoint
    r1 = client.get("/api/knowledge/search?limit=10&offset=0")
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["limit"] == 10
    assert d1["page"] == 1
    assert "results" in d1

    # 2. Context endpoint
    r2 = client.get("/api/knowledge/context?wellbore_id=15/9-F-12-WB1&current_md=2750")
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["current_position"]["wellbore_id"] == "15/9-F-12-WB1"

    # 3. CSV Export endpoint
    r3 = client.get("/api/knowledge/export/csv")
    assert r3.status_code == 200
    assert "text/csv" in r3.headers["content-type"]
    assert "well,wellbore,formation" in r3.text
