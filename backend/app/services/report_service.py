"""
NWIS Report Service — Retrieving Daily Drilling Reports (DDRs) and Associated Event Evidence Spans
"""

import sqlite3
from typing import Optional, Dict, Any, List


def get_report(conn: sqlite3.Connection, report_id: str) -> Optional[Dict[str, Any]]:
    row = conn.execute("SELECT * FROM reports WHERE report_id = ?", (report_id,)).fetchone()
    if not row:
        return None

    report = dict(row)
    report["reviewed"] = bool(report["reviewed"])

    # Fetch associated event evidence spans
    event_rows = conn.execute("""
        SELECT event_id, event_type, severity, md, description, evidence_start, evidence_end, reviewed
        FROM events
        WHERE report_id = ?
        ORDER BY evidence_start ASC, md ASC
    """, (report_id,)).fetchall()

    events = []
    for er in event_rows:
        ed = dict(er)
        ed["reviewed"] = bool(ed["reviewed"])
        events.append(ed)

    report["events"] = events
    return report


def list_reports(conn: sqlite3.Connection, wellbore_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if wellbore_id:
        rows = conn.execute(
            "SELECT * FROM reports WHERE wellbore_id = ? ORDER BY report_date DESC",
            (wellbore_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM reports ORDER BY report_date DESC").fetchall()

    results = []
    for r in rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        results.append(d)
    return results
