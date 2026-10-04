"""
NWIS Data Integrity Tests — Verifies No Orphaned Evidence and Strict Provenance Compliance
"""

import pytest
from backend.app.db import get_db_connection
from scripts.import_volve_to_sqlite import import_volve_to_sqlite


@pytest.fixture(scope="module")
def integrity_db(tmp_path_factory):
    db_file = str(tmp_path_factory.mktemp("integrity") / "integrity_nwis.db")
    import_volve_to_sqlite(db_file)
    conn = get_db_connection(db_file)
    yield conn
    conn.close()


def test_no_orphaned_events(integrity_db):
    """Verify every event resolves to its parent wellbore and parent well."""
    events = integrity_db.execute("SELECT event_id, wellbore_id, report_id FROM events;").fetchall()
    assert len(events) > 0

    for ev in events:
        wb_id = ev["wellbore_id"]
        assert wb_id is not None, f"Event {ev['event_id']} missing wellbore_id"

        # Check wellbore exists
        wb = integrity_db.execute("SELECT wellbore_id, well_id FROM wellbores WHERE wellbore_id = ?", (wb_id,)).fetchone()
        assert wb is not None, f"Event {ev['event_id']} references non-existent wellbore {wb_id}"

        # Check parent well exists
        well_id = wb["well_id"]
        well = integrity_db.execute("SELECT well_id FROM wells WHERE well_id = ?", (well_id,)).fetchone()
        assert well is not None, f"Wellbore {wb_id} references non-existent well {well_id}"

        # Check report link if present
        if ev["report_id"]:
            rep = integrity_db.execute("SELECT report_id FROM reports WHERE report_id = ?", (ev["report_id"],)).fetchone()
            assert rep is not None, f"Event {ev['event_id']} references non-existent report {ev['report_id']}"


def test_no_orphaned_formations(integrity_db):
    """Verify every formation top resolves to a wellbore and well."""
    tops = integrity_db.execute("SELECT formation_top_id, wellbore_id FROM formation_tops;").fetchall()
    assert len(tops) > 0

    for top in tops:
        wb = integrity_db.execute("SELECT wellbore_id, well_id FROM wellbores WHERE wellbore_id = ?", (top["wellbore_id"],)).fetchone()
        assert wb is not None, f"Formation {top['formation_top_id']} references missing wellbore"
        well = integrity_db.execute("SELECT well_id FROM wells WHERE well_id = ?", (wb["well_id"],)).fetchone()
        assert well is not None, f"Wellbore {wb['wellbore_id']} references missing well"


def test_no_orphaned_surveys(integrity_db):
    """Verify every survey resolves to a valid wellbore."""
    surveys = integrity_db.execute("SELECT survey_id, wellbore_id FROM surveys;").fetchall()
    assert len(surveys) > 0

    for surv in surveys:
        wb = integrity_db.execute("SELECT wellbore_id FROM wellbores WHERE wellbore_id = ?", (surv["wellbore_id"],)).fetchone()
        assert wb is not None, f"Survey {surv['survey_id']} references missing wellbore"


def test_event_review_default_status(integrity_db):
    """Verify that all automatically extracted incidents default to reviewed: false (0)."""
    unreviewed_count = integrity_db.execute("SELECT COUNT(*) as c FROM events WHERE reviewed = 0;").fetchone()["c"]
    total_events = integrity_db.execute("SELECT COUNT(*) as c FROM events;").fetchone()["c"]
    assert total_events > 0
    assert unreviewed_count == total_events, "All auto-extracted incidents must start as reviewed = 0"


def test_volve_provenance_labels(integrity_db):
    """Verify that all Volve data has dataset = 'VOLVE_PUBLIC' and provenance = 'REAL'."""
    wells = integrity_db.execute("SELECT well_id, dataset, provenance FROM wells;").fetchall()
    assert all(w["dataset"] == "VOLVE_PUBLIC" for w in wells)
    assert all(w["provenance"] == "REAL" for w in wells)
