"""
NWIS Backend Tests — Ingestion Idempotency Verification
"""

import pytest
from backend.app.db import get_db_connection
from scripts.import_volve_to_sqlite import import_volve_to_sqlite


def test_import_idempotency(tmp_path):
    db_file = str(tmp_path / "idempotency_nwis.db")

    # Run 1
    stats1 = import_volve_to_sqlite(db_file)
    conn = get_db_connection(db_file)
    wells1 = conn.execute("SELECT COUNT(*) as c FROM wells").fetchone()["c"]
    wellbores1 = conn.execute("SELECT COUNT(*) as c FROM wellbores").fetchone()["c"]
    surveys1 = conn.execute("SELECT COUNT(*) as c FROM surveys").fetchone()["c"]
    formations1 = conn.execute("SELECT COUNT(*) as c FROM formation_tops").fetchone()["c"]
    reports1 = conn.execute("SELECT COUNT(*) as c FROM reports").fetchone()["c"]
    events1 = conn.execute("SELECT COUNT(*) as c FROM events").fetchone()["c"]
    conn.close()

    # Run 2
    stats2 = import_volve_to_sqlite(db_file)
    conn = get_db_connection(db_file)
    wells2 = conn.execute("SELECT COUNT(*) as c FROM wells").fetchone()["c"]
    wellbores2 = conn.execute("SELECT COUNT(*) as c FROM wellbores").fetchone()["c"]
    surveys2 = conn.execute("SELECT COUNT(*) as c FROM surveys").fetchone()["c"]
    formations2 = conn.execute("SELECT COUNT(*) as c FROM formation_tops").fetchone()["c"]
    reports2 = conn.execute("SELECT COUNT(*) as c FROM reports").fetchone()["c"]
    events2 = conn.execute("SELECT COUNT(*) as c FROM events").fetchone()["c"]
    conn.close()

    assert wells1 == wells2 == 6
    assert wellbores1 == wellbores2 == 6
    assert surveys1 == surveys2 == 25
    assert formations1 == formations2 == 60
    assert reports1 == reports2 == 80
    assert events1 == events2 == 24
