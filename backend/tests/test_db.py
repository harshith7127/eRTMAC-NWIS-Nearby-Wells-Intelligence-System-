"""
NWIS Backend Tests — Database Schema & Foreign Key Constraints
"""

import sqlite3
import pytest
from backend.app.db import init_db, get_db_connection


@pytest.fixture
def test_db(tmp_path):
    db_file = str(tmp_path / "test_nwis.db")
    init_db(db_file)
    conn = get_db_connection(db_file)
    yield conn
    conn.close()


def test_schema_tables_exist(test_db):
    cur = test_db.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = {r[0] for r in cur.fetchall()}
    expected_tables = {
        "wells", "wellbores", "surveys", "formation_tops",
        "reports", "events", "casings", "mud_programs"
    }
    assert expected_tables.issubset(tables)


def test_foreign_key_enforcement(test_db):
    # Attempting to insert a wellbore for a non-existent well must raise an IntegrityError
    with pytest.raises(sqlite3.IntegrityError):
        test_db.execute("""
            INSERT INTO wellbores (wellbore_id, well_id, name, provenance)
            VALUES ('WB-NONEXISTENT', 'NONEXISTENT-WELL', 'Test Bore', 'REAL');
        """)


def test_well_insertion_and_cascade(test_db):
    with test_db:
        test_db.execute("""
            INSERT INTO wells (
                well_id, well_name, field, operator, dataset, provenance,
                latitude, longitude, created_at, updated_at
            ) VALUES ('W-01', 'Test Well 01', 'VOLVE', 'Equinor', 'VOLVE_PUBLIC', 'REAL', 58.44, 1.88, '2026-01-01', '2026-01-01');
        """)
        test_db.execute("""
            INSERT INTO wellbores (wellbore_id, well_id, name, provenance)
            VALUES ('WB-01', 'W-01', 'Main Bore', 'REAL');
        """)

    row = test_db.execute("SELECT * FROM wellbores WHERE wellbore_id = 'WB-01'").fetchone()
    assert row is not None
    assert row["well_id"] == "W-01"

    # Delete parent well -> should cascade delete wellbore
    with test_db:
        test_db.execute("DELETE FROM wells WHERE well_id = 'W-01';")

    assert test_db.execute("SELECT * FROM wellbores WHERE wellbore_id = 'WB-01'").fetchone() is None
