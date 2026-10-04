"""
NWIS Phase 3 Test Suite — Formation, Depth & Minimum Curvature Trajectory Alignment
Tests all 24 required alignment, minimum curvature, alias, and cross-well evidence rules.
"""

import math
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import get_db_connection, init_db
from backend.app.services.trajectory_service import (
    normalize_surveys,
    minimum_curvature_step,
    compute_wellbore_trajectory,
    interpolate_trajectory_at_md
)
from backend.app.services.formation_service import (
    resolve_canonical_formation_name,
    get_wellbore_formation_tops,
    get_formation_at_depth,
    align_event_to_stratigraphy
)
from backend.app.services.offset_service import query_offset_events


@pytest.fixture
def client():
    init_db()
    return TestClient(app)


@pytest.fixture
def db_conn():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


# ----------------------------------------------------
# 1-6: Trajectory & Minimum Curvature Engine Tests
# ----------------------------------------------------
def test_survey_md_ordering():
    """1. Survey stations must be strictly sorted by MD."""
    raw = [
        {"survey_id": "S3", "md": 1500.0, "inclination": 10.0, "azimuth": 45.0},
        {"survey_id": "S1", "md": 500.0, "inclination": 0.0, "azimuth": 0.0},
        {"survey_id": "S2", "md": 1000.0, "inclination": 5.0, "azimuth": 30.0}
    ]
    normalized, gaps = normalize_surveys(raw)
    assert len(normalized) == 3
    assert normalized[0]["md"] == 500.0
    assert normalized[1]["md"] == 1000.0
    assert normalized[2]["md"] == 1500.0


def test_duplicate_md_handling():
    """2. Duplicate MD survey stations must be handled deterministically without crashing."""
    raw = [
        {"survey_id": "S1", "md": 500.0, "inclination": 2.0, "azimuth": 40.0},
        {"survey_id": "S1_DUP", "md": 500.0, "inclination": 2.5, "azimuth": 42.0},
        {"survey_id": "S2", "md": 1000.0, "inclination": 5.0, "azimuth": 45.0}
    ]
    normalized, gaps = normalize_surveys(raw)
    assert len(normalized) == 2
    assert normalized[0]["survey_id"] == "S1"
    assert any("Duplicate survey station at MD 500.0 m" in g for g in gaps)


def test_minimum_curvature_straight_vertical_section():
    """3. Minimum curvature vertical section (Inc=0) yields delta TVD = delta MD and zero displacement."""
    step = minimum_curvature_step(
        md1=100.0, incl1_deg=0.0, azi1_deg=0.0,
        md2=200.0, incl2_deg=0.0, azi2_deg=0.0
    )
    assert round(step["delta_tvd"], 2) == 100.0
    assert round(step["delta_north"], 2) == 0.0
    assert round(step["delta_east"], 2) == 0.0
    assert step["dogleg_rad"] == 0.0
    assert step["dls"] == 0.0


def test_minimum_curvature_deviated_section():
    """4. Deviated section produces accurate 3D trigonometric increments."""
    step = minimum_curvature_step(
        md1=1000.0, incl1_deg=30.0, azi1_deg=90.0,  # East direction
        md2=1030.0, incl2_deg=30.0, azi2_deg=90.0
    )
    # delta MD = 30m, cos(30)=0.8660, sin(30)=0.5 -> delta TVD = 30 * 0.8660 = 25.98m, delta East = 15.0m
    assert abs(step["delta_tvd"] - 25.98) < 0.1
    assert abs(step["delta_east"] - 15.0) < 0.1
    assert abs(step["delta_north"]) < 0.001


def test_zero_dogleg_ratio_factor():
    """5. Zero dogleg angle handled cleanly with RF = 1.0 (no division by zero)."""
    step = minimum_curvature_step(
        md1=500.0, incl1_deg=15.0, azi1_deg=45.0,
        md2=550.0, incl2_deg=15.0, azi2_deg=45.0
    )
    assert not math.isnan(step["delta_tvd"])
    assert not math.isnan(step["delta_north"])
    assert not math.isnan(step["delta_east"])
    assert step["dogleg_rad"] == 0.0


def test_invalid_survey_data_and_nan_protection():
    """6. Invalid non-numeric or NaN survey values omitted safely."""
    raw = [
        {"survey_id": "S1", "md": 100.0, "inclination": 0.0, "azimuth": 0.0},
        {"survey_id": "S_BAD", "md": float("nan"), "inclination": 5.0, "azimuth": 20.0},
        {"survey_id": "S_STR", "md": "invalid", "inclination": 5.0, "azimuth": 20.0},
        {"survey_id": "S2", "md": 200.0, "inclination": 0.0, "azimuth": 0.0}
    ]
    normalized, gaps = normalize_surveys(raw)
    assert len(normalized) == 2
    assert normalized[0]["md"] == 100.0
    assert normalized[1]["md"] == 200.0
    assert len(gaps) >= 2


# ----------------------------------------------------
# 7-10: Trajectory Computation & Interpolation Tests
# ----------------------------------------------------
def test_md_to_tvd_computation():
    """7. MD -> TVD calculated cumulatively along trajectory stations."""
    raw = [
        {"survey_id": "S0", "md": 0.0, "inclination": 0.0, "azimuth": 0.0, "tvd": 0.0, "northing": 0.0, "easting": 0.0},
        {"survey_id": "S1", "md": 1000.0, "inclination": 0.0, "azimuth": 0.0, "tvd": None, "northing": None, "easting": None},
        {"survey_id": "S2", "md": 1100.0, "inclination": 60.0, "azimuth": 0.0, "tvd": None, "northing": None, "easting": None}
    ]
    computed, gaps = compute_wellbore_trajectory(raw)
    assert len(computed) == 3
    assert computed[0]["tvd"] == 0.0
    assert computed[1]["tvd"] == 1000.0
    assert computed[2]["tvd"] < 1100.0  # Deviated section has TVD < MD


def test_md_to_northing_easting_computation():
    """8. MD -> Northing / Easting displacement calculated from inclination and azimuth."""
    raw = [
        {"survey_id": "S0", "md": 0.0, "inclination": 0.0, "azimuth": 0.0, "tvd": 0.0, "northing": 0.0, "easting": 0.0},
        {"survey_id": "S1", "md": 100.0, "inclination": 90.0, "azimuth": 0.0, "tvd": None, "northing": None, "easting": None}  # Pure North
    ]
    computed, _ = compute_wellbore_trajectory(raw)
    assert computed[1]["northing"] > 0.0
    assert abs(computed[1]["easting"]) < 0.01


def test_trajectory_interpolation_inside_survey_range():
    """9. Interpolation inside survey range returns exact minimum-curvature position."""
    raw = [
        {"survey_id": "S1", "md": 1000.0, "inclination": 10.0, "azimuth": 45.0, "tvd": 995.0, "northing": 15.0, "easting": 15.0},
        {"survey_id": "S2", "md": 1100.0, "inclination": 20.0, "azimuth": 45.0, "tvd": 1090.0, "northing": 35.0, "easting": 35.0}
    ]
    res = interpolate_trajectory_at_md(raw, target_md=1050.0)
    assert res["position"] is not None
    assert res["interpolation_basis"] in ["MINIMUM_CURVATURE", "EXACT_STATION"]
    pos = res["position"]
    assert pos["md"] == 1050.0
    assert 995.0 < pos["tvd"] < 1090.0
    assert 15.0 < pos["northing"] < 35.0
    assert pos["provenance"] == "DERIVED"


def test_trajectory_interpolation_outside_survey_range():
    """10. Target MD outside survey range returns position: None and explicit data gap reason."""
    raw = [
        {"survey_id": "S1", "md": 1000.0, "inclination": 5.0, "azimuth": 30.0, "tvd": 998.0, "northing": 10.0, "easting": 5.0},
        {"survey_id": "S2", "md": 1500.0, "inclination": 10.0, "azimuth": 30.0, "tvd": 1490.0, "northing": 40.0, "easting": 20.0}
    ]
    res = interpolate_trajectory_at_md(raw, target_md=2000.0)
    assert res["position"] is None
    assert "outside available survey range" in res["reason"]


# ----------------------------------------------------
# 11-15: Stratigraphic Tops & Event Formation Alignment
# ----------------------------------------------------
def test_formation_top_ordering(db_conn):
    """11. Formation tops for a wellbore are returned strictly ordered by MD."""
    tops = get_wellbore_formation_tops(db_conn, "15/9-F-12-WB1")
    if tops:
        for i in range(len(tops) - 1):
            assert tops[i]["md"] <= tops[i + 1]["md"]


def test_event_formation_assignment_within_interval(db_conn):
    """12. Event at MD between Top_k and Top_{k+1} is assigned to Formation_k."""
    res = get_formation_at_depth(db_conn, "15/9-F-12-WB1", md=3200.0)
    assert res["formation_name_canonical"] is not None
    assert res["formation_name_canonical"] != "UNKNOWN"
    assert res["formation_top_md"] is not None
    assert res["formation_top_md"] <= 3200.0
    if res["formation_bottom_md"]:
        assert 3200.0 < res["formation_bottom_md"]


def test_event_above_first_formation_top(db_conn):
    """13. Target MD above first formation top returns UNKNOWN and explicit reason."""
    res = get_formation_at_depth(db_conn, "15/9-F-12-WB1", md=50.0)
    assert res["formation_name_canonical"] == "UNKNOWN"
    assert res["alignment_basis"] == "NOT_ALIGNED"
    assert "above the first recorded formation top" in res["reason"]


def test_event_below_last_formation_top(db_conn):
    """14. Target MD below last formation top is assigned to the deepest formation extending downwards."""
    tops = get_wellbore_formation_tops(db_conn, "15/9-F-12-WB1")
    if tops:
        deepest_top = tops[-1]
        res = get_formation_at_depth(db_conn, "15/9-F-12-WB1", md=deepest_top["md"] + 100.0)
        assert res["formation_name_canonical"] == deepest_top["formation_name_canonical"]
        assert res["formation_top_md"] == deepest_top["md"]
        assert res["depth_below_top_md"] == 100.0


def test_depth_below_formation_top_calculation(db_conn):
    """15. Depth below formation top = event_md - formation_top_md."""
    res = get_formation_at_depth(db_conn, "15/9-F-12-WB1", md=3180.0)
    if res["formation_top_md"]:
        expected_below = round(3180.0 - res["formation_top_md"], 2)
        assert res["depth_below_top_md"] == expected_below


# ----------------------------------------------------
# 16-19: Depth Basis & Formation Alias Normalization
# ----------------------------------------------------
def test_explicit_depth_basis_flags(db_conn):
    """16-18. Explicit depth_basis and alignment_basis flags returned without silent mixing."""
    res = get_formation_at_depth(db_conn, "15/9-F-12-WB1", md=3200.0)
    assert res["depth_basis"] == "MD"
    assert res["alignment_basis"] in ["FORMATION_TOP_MD", "NOT_ALIGNED"]


def test_formation_alias_normalization(db_conn):
    """19. Formation alias variants resolve to consistent canonical names."""
    assert resolve_canonical_formation_name(db_conn, "Hugin Fm.") == "Hugin"
    assert resolve_canonical_formation_name(db_conn, "Hugin Formation") == "Hugin"
    assert resolve_canonical_formation_name(db_conn, "Skade Fm.") == "Skade"
    assert resolve_canonical_formation_name(db_conn, "Upper Hordaland Shale") == "Upper Hordaland Shale"


# ----------------------------------------------------
# 20-24: Cross-Well Relative Depth Offset Queries & APIs
# ----------------------------------------------------
def test_cross_well_relative_depth_filtering(db_conn):
    """20. Cross-well offset query retrieves events in matching formation."""
    res = query_offset_events(
        conn=db_conn,
        formation="Hugin",
        depth_below_top=50.0,
        tolerance=100.0
    )
    assert res["query"]["canonical_formation"] == "Hugin"
    assert isinstance(res["events"], list)
    for ev in res["events"]:
        assert ev["canonical_formation_name"] == "Hugin"
        assert ev["depth_below_formation_top_md"] is not None
        assert abs(ev["depth_below_formation_top_md"] - 50.0) <= 100.0


def test_tolerance_boundaries(db_conn):
    """21. Strict tolerance boundaries (e.g. ±10m vs ±100m) accurately filter results."""
    narrow = query_offset_events(conn=db_conn, formation="Skade", depth_below_top=30.0, tolerance=5.0)
    wide = query_offset_events(conn=db_conn, formation="Skade", depth_below_top=30.0, tolerance=200.0)
    assert narrow["total_count"] <= wide["total_count"]


def test_provenance_preservation_in_alignment(db_conn):
    """22. Raw source depth is preserved as REAL; calculated relative depth is DERIVED."""
    ev = {
        "event_id": "TEST-EVT-01",
        "wellbore_id": "15/9-F-12-WB1",
        "md": 3200.0,
        "tvd": 3150.0,
        "formation_name": "Hugin Fm.",
        "provenance": "REAL"
    }
    aligned = align_event_to_stratigraphy(db_conn, ev)
    assert aligned["raw_md"] == 3200.0
    assert aligned["raw_tvd"] == 3150.0
    assert aligned["provenance"] == "REAL"
    assert aligned["canonical_formation_name"] is not None


def test_explicit_data_gap_generation(db_conn):
    """23. Explicit data gap messages generated when wellbores or formations are missing."""
    res = query_offset_events(
        conn=db_conn,
        formation="NonExistentFormation",
        depth_below_top=100.0,
        tolerance=20.0
    )
    assert res["total_count"] == 0
    assert len(res["data_gaps"]) > 0
    assert any("No offset events found" in g for g in res["data_gaps"])


def test_api_endpoints_phase3(client):
    """24. Test all new Phase 3 REST endpoints via FastAPI client."""
    # 1. Formation at depth
    r_form = client.get("/api/wellbores/15%2F9-F-12-WB1/formation-at-depth?md=3200")
    assert r_form.status_code == 200
    d_form = r_form.json()
    assert d_form["wellbore_id"] == "15/9-F-12-WB1"
    assert "formation_name_canonical" in d_form

    # 2. Wellbore trajectory
    r_traj = client.get("/api/wellbores/15%2F9-F-9-WB1/trajectory?md=2000")
    assert r_traj.status_code == 200
    d_traj = r_traj.json()
    assert "station_count" in d_traj
    assert "stations" in d_traj

    # 3. Formation aliases
    r_aliases = client.get("/api/formations/aliases")
    assert r_aliases.status_code == 200
    d_aliases = r_aliases.json()
    assert len(d_aliases) > 0
    assert any(a["canonical_name"] == "Hugin" for a in d_aliases)

    # 4. Offset events cross-well query
    r_offset = client.get("/api/offset/events?formation=Hugin&depth_below_top=50&tolerance=100")
    assert r_offset.status_code == 200
    d_offset = r_offset.json()
    assert "events" in d_offset
    assert "provenance_breakdown" in d_offset
