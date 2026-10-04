"""
NWIS Event Service — Search, Filter, Retrieve, and Review Drilling Events/Incidents
"""

import sqlite3
from typing import List, Optional, Dict, Any


def search_events(
    conn: sqlite3.Connection,
    wellbore_id: Optional[str] = None,
    well_id: Optional[str] = None,
    event_type: Optional[str] = None,
    formation_name: Optional[str] = None,
    min_md: Optional[float] = None,
    max_md: Optional[float] = None,
    reviewed: Optional[bool] = None,
    excluded: Optional[bool] = None,
    provenance: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = """
    SELECT e.*, w.well_id, w.name as wellbore_name
    FROM events e
    LEFT JOIN wellbores w ON e.wellbore_id = w.wellbore_id
    WHERE 1=1
    """
    params = []

    if wellbore_id:
        query += " AND e.wellbore_id = ?"
        params.append(wellbore_id)
    if well_id:
        query += " AND w.well_id = ?"
        params.append(well_id)
    if event_type:
        query += " AND UPPER(e.event_type) = UPPER(?)"
        params.append(event_type)
    if formation_name:
        query += " AND UPPER(e.formation_name) LIKE UPPER(?)"
        params.append(f"%{formation_name}%")
    if min_md is not None:
        query += " AND (e.md >= ? OR e.md_end >= ?)"
        params.extend([min_md, min_md])
    if max_md is not None:
        query += " AND (e.md <= ? OR e.md_start <= ?)"
        params.extend([max_md, max_md])
    if reviewed is not None:
        query += " AND e.reviewed = ?"
        params.append(1 if reviewed else 0)
    if excluded is not None:
        query += " AND e.excluded = ?"
        params.append(1 if excluded else 0)
    if provenance:
        query += " AND e.provenance = ?"
        params.append(provenance)

    query += " ORDER BY e.md ASC, e.created_at DESC"
    rows = conn.execute(query, params).fetchall()

    results = []
    for r in rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        d["excluded"] = bool(d["excluded"])
        results.append(d)
    return results


def get_event(conn: sqlite3.Connection, event_id: str) -> Optional[Dict[str, Any]]:
    row = conn.execute("SELECT * FROM events WHERE event_id = ?", (event_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["reviewed"] = bool(d["reviewed"])
    d["excluded"] = bool(d["excluded"])
    return d


def list_events_by_well(conn: sqlite3.Connection, well_id: str) -> List[Dict[str, Any]]:
    query = """
    SELECT e.*
    FROM events e
    JOIN wellbores w ON e.wellbore_id = w.wellbore_id
    WHERE w.well_id = ?
    ORDER BY e.md ASC
    """
    rows = conn.execute(query, (well_id,)).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        d["excluded"] = bool(d["excluded"])
        results.append(d)
    return results


def list_events_by_wellbore(conn: sqlite3.Connection, wellbore_id: str) -> List[Dict[str, Any]]:
    query = "SELECT * FROM events WHERE wellbore_id = ? ORDER BY md ASC"
    rows = conn.execute(query, (wellbore_id,)).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        d["excluded"] = bool(d["excluded"])
        results.append(d)
    return results


def update_event_review(conn: sqlite3.Connection, event_id: str, reviewed: bool) -> Optional[Dict[str, Any]]:
    """Update human review verification status without altering lineage fields."""
    with conn:
        cursor = conn.execute(
            "UPDATE events SET reviewed = ? WHERE event_id = ?",
            (1 if reviewed else 0, event_id)
        )
        if cursor.rowcount == 0:
            return None
    return get_event(conn, event_id)
