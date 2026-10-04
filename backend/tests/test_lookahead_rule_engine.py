"""
NWIS Backend Pytest Suite — Phase 4 Look-Ahead Rule Engine & Offset Evidence Decision Support
Validates deterministic, explainable K-of-N historical offset calculations, stratigraphic interval coverage,
review/exclusion filtering, analogue attribute matching, alert deduplication, and provenance preservation.
"""

import sqlite3
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import get_db_connection, init_db
from backend.app.services.lookahead_service import evaluate_lookahead
from backend.app.services.formation_service import get_formation_at_depth


@pytest.fixture(scope="module")
def client():
    init_db()
    return TestClient(app)


@pytest.fixture(scope="module")
def db_conn():
    conn = get_db_connection()
    yield conn
    conn.close()


# ----------------------------------------------------------------------
# 1. Current Well Alignment & Stratigraphic Context
# ----------------------------------------------------------------------
def test_current_well_alignment(db_conn):
    """Verifies that active wellbore and current MD resolve to containing formation and relative depth."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    assert "active_well" in res
    assert res["active_well"]["wellbore_id"] == "15/9-F-12-WB1"
    assert res["active_well"]["current_md"] == 2750.0
    assert res["active_well"]["canonical_formation_name"] != "UNKNOWN"
    assert res["active_well"]["current_relative_depth"] is not None
    assert res["active_well"]["current_relative_depth"] >= 0.0


# ----------------------------------------------------------------------
# 2. Lookahead Boundary Calculation
# ----------------------------------------------------------------------
def test_lookahead_boundary_calculation(db_conn):
    """Verifies lookahead_start and lookahead_end window arithmetic."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    start = res["query"]["current_relative_depth"]
    lookahead = res["query"]["lookahead_m"]
    assert lookahead == 300.0
    for alert in res["alerts"]:
        assert alert["lookahead_start"] == start
        assert round(alert["lookahead_end"] - alert["lookahead_start"], 2) == 300.0


# ----------------------------------------------------------------------
# 3. Default 300m Window & Configurable Presets
# ----------------------------------------------------------------------
def test_default_300m_window(db_conn):
    """Verifies default lookahead window is 300 m."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0)
    assert res["query"]["lookahead_m"] == 300.0


def test_configurable_window_presets(db_conn):
    """Verifies configurable windows (100m, 200m, 500m, 1000m)."""
    for window in [100.0, 200.0, 500.0, 1000.0]:
        res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=window)
        assert res["query"]["lookahead_m"] == window


# ----------------------------------------------------------------------
# 4. Same-Formation & Relative Depth Filtering
# ----------------------------------------------------------------------
def test_same_formation_filtering(db_conn):
    """Verifies only wellbores matching the canonical target formation are covered."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    target_form = res["active_well"]["canonical_formation_name"]
    for detail in res["coverage"]["candidate_wellbore_details"]:
        if detail["formation_match"]:
            assert target_form.lower() in detail["explanation"].lower()


def test_relative_depth_filtering(db_conn):
    """Verifies that evidence events match within the relative depth window."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0, include_unreviewed=True)
    cur_rel = res["active_well"]["current_relative_depth"]
    look_end = cur_rel + 300.0
    for ev in res["evidence"]:
        assert cur_rel - 5.0 <= ev["relative_depth"] <= look_end + 5.0


# ----------------------------------------------------------------------
# 5. Geographic Radius & Denominator Coverage
# ----------------------------------------------------------------------
def test_geographic_radius_filtering(db_conn):
    """Verifies candidate wells outside radius_km are excluded."""
    res_tight = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, radius_km=0.001)
    res_wide = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, radius_km=10.0)
    assert res_tight["coverage"]["candidate_offset_wellbores"] <= res_wide["coverage"]["candidate_offset_wellbores"]


def test_covered_offset_denominator(db_conn):
    """Verifies denominator N only counts wells with actual coverage of the queried relative depth interval."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    cand_count = res["coverage"]["candidate_offset_wellbores"]
    cov_count = res["coverage"]["covered_offset_wellbores"]
    assert cov_count <= cand_count
    for alert in res["alerts"]:
        assert alert["n"] == cov_count


# ----------------------------------------------------------------------
# 6. K-of-N Calculation & Severities
# ----------------------------------------------------------------------
def test_k_of_n_calculation(db_conn):
    """Verifies K <= N and K represents unique offset wells with qualifying events."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=500.0, include_unreviewed=True)
    for alert in res["alerts"]:
        assert alert["k"] <= alert["n"]
        assert len(alert["offset_wells"]) == alert["k"]


def test_insufficient_coverage_state(db_conn):
    """When N < 2, severity is INSUFFICIENT_COVERAGE and status is INSUFFICIENT_DATA."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, radius_km=0.001)
    if res["coverage"]["covered_offset_wellbores"] < 2:
        for alert in res["alerts"]:
            assert alert["severity"] == "INSUFFICIENT_COVERAGE"
            assert alert["status"] == "INSUFFICIENT_DATA"


def test_no_evidence_state(db_conn):
    """When N >= 2 and K == 0, severity is NO_EVIDENCE and status is NO_HAZARD_OBSERVED."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, event_type="NONEXISTENT_HAZARD")
    if res["coverage"]["covered_offset_wellbores"] >= 2:
        for alert in res["alerts"]:
            assert alert["k"] == 0
            assert alert["severity"] == "NO_EVIDENCE"
            assert alert["status"] == "NO_HAZARD_OBSERVED"


# ----------------------------------------------------------------------
# 7. Review & Exclusion Filtering
# ----------------------------------------------------------------------
def test_unreviewed_event_exclusion(db_conn):
    """Unreviewed events are excluded from operational alerts by default."""
    res_default = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, include_unreviewed=False)
    for ev in res_default["evidence"]:
        assert ev["reviewed"] is True


def test_unreviewed_event_inclusion_flag(db_conn):
    """Unreviewed events can be included when include_unreviewed=True."""
    res_unrev = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, include_unreviewed=True)
    assert res_unrev["query"]["include_unreviewed"] is True


def test_excluded_event_exclusion(db_conn):
    """Excluded events (excluded=True) never contribute to alert evidence."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, include_unreviewed=True)
    for ev in res["evidence"]:
        assert ev["excluded"] is False


# ----------------------------------------------------------------------
# 8. Event Type Filtering
# ----------------------------------------------------------------------
def test_event_type_filtering(db_conn):
    """Filtering by specific event type returns alerts for that hazard."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, event_type="LOSS")
    assert len(res["alerts"]) >= 1
    for alert in res["alerts"]:
        assert alert["event_type"] == "LOSS"


# ----------------------------------------------------------------------
# 9. Provenance Preservation
# ----------------------------------------------------------------------
def test_provenance_preservation(db_conn):
    """Verifies REAL provenance for source evidence and DERIVED for alerts."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, include_unreviewed=True)
    for alert in res["alerts"]:
        assert alert["provenance"] == "DERIVED"
    for ev in res["evidence"]:
        assert ev["provenance"] in ["REAL", "DERIVED", "SYNTHETIC", "ILLUSTRATIVE"]
    assert "provenance_breakdown" in res


# ----------------------------------------------------------------------
# 10. Alert Explanation & Deduplication
# ----------------------------------------------------------------------
def test_alert_deterministic_explanation(db_conn):
    """Alert trigger_reason contains explicit deterministic explanation."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    for alert in res["alerts"]:
        assert "offset wellbore" in alert["trigger_reason"]
        assert str(alert["n"]) in alert["trigger_reason"]
        assert alert["formation"] in alert["trigger_reason"] or alert["severity"] == "INSUFFICIENT_COVERAGE"


def test_alert_deduplication_stability(db_conn):
    """Repeated calls with identical parameters yield identical alert IDs."""
    res1 = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    res2 = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, lookahead_m=300.0)
    ids1 = [a["alert_id"] for a in res1["alerts"]]
    ids2 = [a["alert_id"] for a in res2["alerts"]]
    assert ids1 == ids2


# ----------------------------------------------------------------------
# 11. Data Gaps & Edge Cases
# ----------------------------------------------------------------------
def test_missing_formation_data_gap(db_conn):
    """When active depth is above recorded formation tops, returns clean data gap."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=50.0)
    assert res["active_well"]["canonical_formation_name"] == "UNKNOWN"
    assert len(res["alerts"]) == 0
    assert len(res["data_gaps"]) > 0
    assert "No offset-based estimate yet" in res["data_gaps"][0]


def test_missing_survey_wellhead_fallback(db_conn):
    """Candidate wellbores with missing MWD survey fall back to surface wellhead distance."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0)
    for comp in res["coverage"]["candidate_wellbore_details"]:
        assert comp["distance_basis"] in ["WELLHEAD_FALLBACK", "SUBSURFACE_SURVEY"]


def test_analogue_attribute_comparison(db_conn):
    """Candidate wellbores expose attribute-level comparisons without fake ML scores."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0)
    for comp in res["coverage"]["candidate_wellbore_details"]:
        assert isinstance(comp["formation_match"], bool)
        assert isinstance(comp["relative_depth_coverage"], bool)
        assert isinstance(comp["trajectory_available"], bool)
        assert isinstance(comp["casing_available"], bool)
        assert isinstance(comp["mud_program_available"], bool)
        assert isinstance(comp["explanation"], str)


def test_historical_action_preservation(db_conn):
    """Evidence events preserve mitigation actions with explicit historical prefix."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0, include_unreviewed=True)
    for ev in res["evidence"]:
        if ev.get("historical_action"):
            assert ev["historical_action"].startswith("Historical offset practice: Offset well")


def test_telemetry_context_string(db_conn):
    """Telemetry context explicitly states no ML predictions."""
    res = evaluate_lookahead(db_conn, wellbore_id="15/9-F-12-WB1", current_md=2750.0)
    for alert in res["alerts"]:
        assert "predict" not in alert["telemetry_context"].lower()
        assert "historical offset evidence" in alert["telemetry_context"]


# ----------------------------------------------------------------------
# 12. HTTP Endpoint Test
# ----------------------------------------------------------------------
def test_api_get_offset_lookahead(client):
    """Tests GET /api/offset/lookahead endpoint."""
    response = client.get("/api/offset/lookahead", params={
        "wellbore_id": "15/9-F-12-WB1",
        "current_md": 2750.0,
        "lookahead_m": 300.0,
        "radius_km": 2.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "active_well" in data
    assert "query" in data
    assert "alerts" in data
    assert "coverage" in data
    assert "evidence" in data
    assert "data_gaps" in data
    assert "provenance_breakdown" in data
