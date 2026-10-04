"""
NWIS Knowledge Repository & Evidence Traceability Service — Phase 7
Provides unified knowledge search, source evidence inspection, historical offset practice retrieval,
and active-well knowledge context aggregation.
Strictly NO generative LLM guesswork, NO fake document spans, and NO artificial risk probabilities.
"""

import io
import csv
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from .well_service import list_wells, list_wellbores, haversine_distance
from .formation_service import get_formation_at_depth, resolve_canonical_formation_name
from .lookahead_service import evaluate_lookahead


def search_knowledge(
    conn: sqlite3.Connection,
    query: Optional[str] = None,
    well_id: Optional[str] = None,
    wellbore_id: Optional[str] = None,
    formation: Optional[str] = None,
    event_type: Optional[str] = None,
    document_type: Optional[str] = None,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    reviewed_only: bool = False,
    provenance: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Unified knowledge search across canonical events, Daily Drilling Reports (DDRs),
    and evidence spans.
    """
    limit = max(1, min(200, int(limit)))
    offset = max(0, int(offset))
    results: List[Dict[str, Any]] = []
    data_gaps: List[str] = []
    prov_counts = {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}

    # 1. Search Events
    ev_sql = """
    SELECT e.*, w.well_id, w.name as wellbore_name, wells.well_name, r.title as report_title, r.report_date
    FROM events e
    LEFT JOIN wellbores w ON e.wellbore_id = w.wellbore_id
    LEFT JOIN wells ON w.well_id = wells.well_id
    LEFT JOIN reports r ON e.report_id = r.report_id
    WHERE e.excluded = 0
    """
    ev_params: List[Any] = []

    if well_id:
        ev_sql += " AND w.well_id = ?"
        ev_params.append(well_id)
    if wellbore_id:
        ev_sql += " AND e.wellbore_id = ?"
        ev_params.append(wellbore_id)
    if event_type:
        ev_sql += " AND UPPER(e.event_type) = UPPER(?)"
        ev_params.append(event_type)
    if formation:
        ev_sql += " AND UPPER(e.formation_name) LIKE UPPER(?)"
        ev_params.append(f"%{formation}%")
    if depth_min is not None:
        ev_sql += " AND (e.md >= ? OR e.md_end >= ?)"
        ev_params.extend([depth_min, depth_min])
    if depth_max is not None:
        ev_sql += " AND (e.md <= ? OR e.md_start <= ?)"
        ev_params.extend([depth_max, depth_max])
    if date_from:
        ev_sql += " AND r.report_date >= ?"
        ev_params.append(date_from)
    if date_to:
        ev_sql += " AND r.report_date <= ?"
        ev_params.append(date_to)
    if reviewed_only:
        ev_sql += " AND e.reviewed = 1"
    if provenance:
        ev_sql += " AND e.provenance = ?"
        ev_params.append(provenance)
    if query:
        q_term = f"%{query.strip()}%"
        ev_sql += """ AND (
            e.description LIKE ? OR
            e.source_text LIKE ? OR
            e.cause LIKE ? OR
            e.action LIKE ? OR
            e.formation_name LIKE ? OR
            e.event_type LIKE ? OR
            w.well_id LIKE ? OR
            wells.well_name LIKE ?
        )"""
        ev_params.extend([q_term] * 8)

    ev_sql += " ORDER BY (e.action IS NOT NULL AND length(trim(e.action)) > 0) DESC, (e.md IS NULL), e.md ASC, e.created_at DESC"
    ev_rows = conn.execute(ev_sql, ev_params).fetchall()

    for r in ev_rows:
        d = dict(r)
        prov = d.get("provenance", "REAL")
        prov_counts[prov] = prov_counts.get(prov, 0) + 1

        # Format historical action strictly as historical offset practice
        hist_practice = None
        if d.get("action"):
            well_label = d.get("well_name") or d.get("well_id") or "Offset well"
            hist_practice = f"Historical offset practice: Offset well {well_label} recorded action: {d['action']}"

        item = {
            "result_type": "EVENT",
            "event_id": d["event_id"],
            "report_id": d.get("report_id"),
            "evidence_id": f"EVID-{d['event_id']}" if d.get("source_text") else None,
            "well_id": d.get("well_id"),
            "well_name": d.get("well_name") or d.get("well_id"),
            "wellbore_id": d.get("wellbore_id"),
            "wellbore_name": d.get("wellbore_name"),
            "formation": d.get("formation_name") or "Not recorded",
            "event_type": d["event_type"],
            "severity": d.get("severity"),
            "depth": d.get("md"),
            "depth_basis": d.get("depth_basis", "MD"),
            "summary": d.get("description", ""),
            "historical_practice": hist_practice,
            "source_text": d.get("source_text"),
            "report_date": d.get("report_date"),
            "document_type": "DAILY_DRILLING_REPORT" if d.get("report_id") else None,
            "reviewed": bool(d.get("reviewed", 0)),
            "provenance": prov
        }
        results.append(item)

    # 2. Search Reports (if not filtering by event_type strictly)
    if not event_type and (not document_type or document_type.upper() in ("DDR", "DAILY_DRILLING_REPORT", "REPORT")):
        rep_sql = """
        SELECT r.*, w.well_id, w.name as wellbore_name, wells.well_name
        FROM reports r
        LEFT JOIN wellbores w ON r.wellbore_id = w.wellbore_id
        LEFT JOIN wells ON w.well_id = wells.well_id
        WHERE 1=1
        """
        rep_params: List[Any] = []

        if well_id:
            rep_sql += " AND w.well_id = ?"
            rep_params.append(well_id)
        if wellbore_id:
            rep_sql += " AND r.wellbore_id = ?"
            rep_params.append(wellbore_id)
        if date_from:
            rep_sql += " AND r.report_date >= ?"
            rep_params.append(date_from)
        if date_to:
            rep_sql += " AND r.report_date <= ?"
            rep_params.append(date_to)
        if reviewed_only:
            rep_sql += " AND r.reviewed = 1"
        if provenance:
            rep_sql += " AND r.provenance = ?"
            rep_params.append(provenance)
        if query:
            q_term = f"%{query.strip()}%"
            rep_sql += """ AND (
                r.title LIKE ? OR
                r.text LIKE ? OR
                r.report_type LIKE ? OR
                w.well_id LIKE ? OR
                wells.well_name LIKE ?
            )"""
            rep_params.extend([q_term] * 5)

        rep_sql += " ORDER BY r.report_date DESC"
        rep_rows = conn.execute(rep_sql, rep_params).fetchall()

        for r in rep_rows:
            d = dict(r)
            prov = d.get("provenance", "REAL")
            prov_counts[prov] = prov_counts.get(prov, 0) + 1

            # Summary snippet from report text
            snippet = d.get("text", "")[:200] + ("..." if len(d.get("text", "")) > 200 else "")

            item = {
                "result_type": "REPORT",
                "event_id": None,
                "report_id": d["report_id"],
                "evidence_id": None,
                "well_id": d.get("well_id"),
                "well_name": d.get("well_name") or d.get("well_id"),
                "wellbore_id": d.get("wellbore_id"),
                "wellbore_name": d.get("wellbore_name"),
                "formation": "Various (Full Shift)",
                "event_type": None,
                "severity": None,
                "depth": None,
                "depth_basis": "MD",
                "summary": snippet,
                "historical_practice": None,
                "source_text": d.get("text"),
                "report_date": d.get("report_date"),
                "document_type": d.get("report_type", "DDR"),
                "reviewed": bool(d.get("reviewed", 0)),
                "provenance": prov
            }
            results.append(item)

    total_count = len(results)
    paged_results = results[offset: offset + limit]

    if total_count == 0:
        data_gaps.append(f"No historical events or reports matched query parameters (Query: '{query or 'ALL'}').")

    return {
        "query": {
            "query": query,
            "well_id": well_id,
            "wellbore_id": wellbore_id,
            "formation": formation,
            "event_type": event_type,
            "document_type": document_type,
            "depth_min": depth_min,
            "depth_max": depth_max,
            "date_from": date_from,
            "date_to": date_to,
            "reviewed_only": reviewed_only,
            "provenance": provenance,
            "limit": limit,
            "offset": offset
        },
        "total_count": total_count,
        "page": (offset // limit) + 1,
        "limit": limit,
        "results": paged_results,
        "data_gaps": data_gaps,
        "provenance_breakdown": prov_counts,
        "provenance_summary": prov_counts
    }


def get_knowledge_event_detail(conn: sqlite3.Connection, event_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves complete knowledge profile and source evidence trace for a specific event.
    """
    ev_row = conn.execute("SELECT * FROM events WHERE event_id = ?", (event_id,)).fetchone()
    if not ev_row:
        return None

    raw_ev = dict(ev_row)
    raw_ev["reviewed"] = bool(raw_ev.get("reviewed", 0))
    raw_ev["excluded"] = bool(raw_ev.get("excluded", 0))

    data_gaps: List[str] = []
    wb_info = None
    well_info = None

    if raw_ev.get("wellbore_id"):
        wb_row = conn.execute("SELECT * FROM wellbores WHERE wellbore_id = ?", (raw_ev["wellbore_id"],)).fetchone()
        if wb_row:
            wb_info = dict(wb_row)
            w_row = conn.execute("SELECT * FROM wells WHERE well_id = ?", (wb_info["well_id"],)).fetchone()
            if w_row:
                well_info = dict(w_row)

    # Source Report metadata & text
    source_report = None
    if raw_ev.get("report_id"):
        rep_row = conn.execute("SELECT * FROM reports WHERE report_id = ?", (raw_ev["report_id"],)).fetchone()
        if rep_row:
            source_report = dict(rep_row)
            source_report["reviewed"] = bool(source_report.get("reviewed", 0))
    else:
        data_gaps.append(f"Event '{event_id}' has no linked source DDR report document.")

    # Historical Action strictly preserved
    hist_practice = None
    if raw_ev.get("action"):
        well_name = (well_info.get("well_name") if well_info else raw_ev.get("wellbore_id")) or "Offset well"
        hist_practice = f"Historical offset practice: Offset well {well_name} recorded action: {raw_ev['action']}"
    else:
        data_gaps.append(f"No specific corrective drilling action was recorded for event '{event_id}'.")

    # Evidence Span
    evidence_span = None
    if raw_ev.get("source_text"):
        evidence_span = {
            "evidence_id": f"EVID-{event_id}",
            "event_id": event_id,
            "report_id": raw_ev.get("report_id"),
            "well_id": well_info.get("well_id") if well_info else (wb_info.get("well_id") if wb_info else "UNKNOWN"),
            "well_name": well_info.get("well_name") if well_info else (raw_ev.get("wellbore_id") or "UNKNOWN"),
            "wellbore_id": raw_ev.get("wellbore_id"),
            "formation": raw_ev.get("formation_name"),
            "depth": raw_ev.get("md"),
            "depth_basis": raw_ev.get("depth_basis", "MD"),
            "page_or_section": f"Chars {raw_ev.get('evidence_start')}-{raw_ev.get('evidence_end')}" if raw_ev.get("evidence_start") is not None else "Source location not recorded",
            "source_text": raw_ev["source_text"],
            "evidence_type": "DAILY_DRILLING_REPORT",
            "historical_practice": hist_practice,
            "reviewed": raw_ev["reviewed"],
            "provenance": raw_ev.get("provenance", "REAL")
        }
    else:
        data_gaps.append(f"Source evidence text span not recorded for event '{event_id}'.")

    return {
        "event": raw_ev,
        "well": well_info,
        "wellbore": wb_info,
        "formation": raw_ev.get("formation_name") or "Not recorded",
        "depth_md": raw_ev.get("md"),
        "depth_basis": raw_ev.get("depth_basis", "MD"),
        "historical_practice": hist_practice,
        "evidence": evidence_span,
        "source_report": source_report,
        "reviewed": raw_ev["reviewed"],
        "provenance": raw_ev.get("provenance", "REAL"),
        "data_gaps": data_gaps
    }


def get_knowledge_report_detail(conn: sqlite3.Connection, report_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves full DDR / report document metadata, verbatim text, and associated event evidence spans.
    """
    rep_row = conn.execute("SELECT * FROM reports WHERE report_id = ?", (report_id,)).fetchone()
    if not rep_row:
        return None

    rep_dict = dict(rep_row)
    rep_dict["reviewed"] = bool(rep_dict.get("reviewed", 0))

    data_gaps: List[str] = []
    wb_info = None
    well_info = None

    if rep_dict.get("wellbore_id"):
        wb_row = conn.execute("SELECT * FROM wellbores WHERE wellbore_id = ?", (rep_dict["wellbore_id"],)).fetchone()
        if wb_row:
            wb_info = dict(wb_row)
            w_row = conn.execute("SELECT * FROM wells WHERE well_id = ?", (wb_info["well_id"],)).fetchone()
            if w_row:
                well_info = dict(w_row)

    # Associated Events
    ev_rows = conn.execute("SELECT * FROM events WHERE report_id = ? ORDER BY md ASC", (report_id,)).fetchall()
    events = []
    evidence_spans = []

    for er in ev_rows:
        ed = dict(er)
        ed["reviewed"] = bool(ed.get("reviewed", 0))
        ed["excluded"] = bool(ed.get("excluded", 0))
        events.append(ed)

        if ed.get("source_text"):
            evidence_spans.append({
                "evidence_id": f"EVID-{ed['event_id']}",
                "event_id": ed["event_id"],
                "report_id": report_id,
                "well_id": well_info.get("well_id") if well_info else "UNKNOWN",
                "well_name": well_info.get("well_name") if well_info else "UNKNOWN",
                "wellbore_id": ed.get("wellbore_id"),
                "formation": ed.get("formation_name"),
                "depth": ed.get("md"),
                "depth_basis": ed.get("depth_basis", "MD"),
                "page_or_section": f"Chars {ed.get('evidence_start')}-{ed.get('evidence_end')}" if ed.get("evidence_start") is not None else "Source location not recorded",
                "source_text": ed["source_text"],
                "evidence_type": "DAILY_DRILLING_REPORT",
                "historical_practice": f"Historical offset practice: Offset well {well_info.get('well_name') if well_info else 'Offset'} recorded action: {ed['action']}" if ed.get("action") else None,
                "reviewed": ed["reviewed"],
                "provenance": ed.get("provenance", "REAL")
            })

    if len(events) == 0:
        data_gaps.append(f"No specific drilling hazard incidents extracted from report '{report_id}'.")

    return {
        "report_id": rep_dict["report_id"],
        "well_id": well_info.get("well_id") if well_info else None,
        "well_name": well_info.get("well_name") if well_info else None,
        "wellbore_id": rep_dict.get("wellbore_id"),
        "report_type": rep_dict.get("report_type", "DDR"),
        "title": rep_dict.get("title", f"Daily Drilling Report {report_id}"),
        "report_date": rep_dict.get("report_date"),
        "source_file": rep_dict.get("source_file"),
        "text": rep_dict.get("text", ""),
        "provenance": rep_dict.get("provenance", "REAL"),
        "reviewed": rep_dict["reviewed"],
        "events": events,
        "evidence_spans": evidence_spans,
        "data_gaps": data_gaps
    }


def get_active_well_knowledge_context(
    conn: sqlite3.Connection,
    wellbore_id: str,
    current_md: float,
    radius_km: float = 2.0,
    lookahead_m: float = 300.0,
    dataset: Optional[str] = "VOLVE_PUBLIC",
    include_unreviewed: bool = False
) -> Dict[str, Any]:
    """
    Seamlessly combines Phase 2 (Nearby Wells), Phase 3 (Formation/Depth Alignment),
    Phase 4 (K-of-N Lookahead Rule Engine), Casing/Mud records, and Source Evidence into
    a unified engineer-facing knowledge context.
    """
    data_gaps: List[str] = []
    prov_counts = {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}

    # 1. Active Wellbore & Well
    wb_row = conn.execute("SELECT * FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
    if not wb_row:
        # Fallback: check if wellbore_id is actually well_id
        w_row = conn.execute("SELECT * FROM wells WHERE well_id = ?", (wellbore_id,)).fetchone()
        if w_row:
            active_well = dict(w_row)
            first_wb = conn.execute("SELECT * FROM wellbores WHERE well_id = ? ORDER BY wellbore_id ASC", (active_well["well_id"],)).fetchone()
            if first_wb:
                wb_row = first_wb
                wellbore_id = first_wb["wellbore_id"]
            else:
                wb_row = {"wellbore_id": f"{wellbore_id}-WB1", "well_id": wellbore_id, "name": f"{wellbore_id} Main"}
        else:
            return {
                "current_position": {"wellbore_id": wellbore_id, "current_md": current_md},
                "nearby_well_coverage": {"candidate_wells_count": 0, "covered_wells_count": 0, "radius_km": radius_km, "nearby_wells": []},
                "historical_events": [],
                "lookahead": {},
                "casings": [],
                "mud_programs": [],
                "data_gaps": [f"Wellbore '{wellbore_id}' not found in canonical database."],
                "provenance_breakdown": prov_counts,
                "disclaimer": "Volve is a public North Sea prototype dataset (Block 15/9) and is not operational evidence for Oil India formations."
            }

    active_wb = dict(wb_row)
    well_row = conn.execute("SELECT * FROM wells WHERE well_id = ?", (active_wb["well_id"],)).fetchone()
    active_well = dict(well_row) if well_row else {"well_id": active_wb["well_id"], "well_name": active_wb["name"], "latitude": 58.442, "longitude": 1.887}

    # 2. Stratigraphic Alignment at current_md (Phase 3)
    strat = get_formation_at_depth(conn, wellbore_id, current_md)
    canonical_formation = strat.get("formation_name_canonical") or "UNKNOWN"
    current_rel_depth = strat.get("depth_below_top_md")

    current_pos = {
        "well_id": active_well.get("well_id"),
        "well_name": active_well.get("well_name"),
        "wellbore_id": wellbore_id,
        "wellbore_name": active_wb.get("name"),
        "current_md": current_md,
        "tvd": strat.get("target_tvd"),
        "current_formation": canonical_formation,
        "current_relative_depth": current_rel_depth,
        "formation_top_md": strat.get("formation_top_md"),
        "depth_basis": "MD",
        "alignment_basis": strat.get("alignment_basis", "NOT_ALIGNED"),
        "provenance": "DERIVED"
    }
    prov_counts["DERIVED"] += 1

    # 3. Phase 4 K-of-N Lookahead Rule Evaluation
    lookahead_res = evaluate_lookahead(
        conn,
        wellbore_id=wellbore_id,
        current_md=current_md,
        lookahead_m=lookahead_m,
        radius_km=radius_km,
        include_unreviewed=include_unreviewed,
        dataset=dataset
    )

    for gap in lookahead_res.get("data_gaps", []):
        data_gaps.append(gap)

    # 4. Nearby Historical Events
    events_list = []
    for ev in lookahead_res.get("evidence", []):
        prov = ev.get("provenance", "REAL")
        prov_counts[prov] = prov_counts.get(prov, 0) + 1
        events_list.append(ev)

    # 5. Casing & Mud Programs for candidate offsets
    candidate_wbs = [c["wellbore_id"] for c in lookahead_res.get("coverage", {}).get("candidate_wellbore_details", [])]
    casings: List[Dict[str, Any]] = []
    mud_progs: List[Dict[str, Any]] = []

    if candidate_wbs:
        placeholders = ",".join(["?"] * len(candidate_wbs))
        c_rows = conn.execute(f"SELECT * FROM casings WHERE wellbore_id IN ({placeholders})", candidate_wbs).fetchall()
        for r in c_rows:
            casings.append(dict(r))
            prov_counts["REAL"] += 1

        m_rows = conn.execute(f"SELECT * FROM mud_programs WHERE wellbore_id IN ({placeholders})", candidate_wbs).fetchall()
        for r in m_rows:
            mud_progs.append(dict(r))
            prov_counts["REAL"] += 1

    nearby_coverage = {
        "candidate_wells_count": lookahead_res.get("coverage", {}).get("candidate_offset_wellbores", 0),
        "covered_wells_count": lookahead_res.get("coverage", {}).get("covered_offset_wellbores", 0),
        "radius_km": radius_km,
        "candidate_details": lookahead_res.get("coverage", {}).get("candidate_wellbore_details", [])
    }

    if not casings:
        data_gaps.append("No casing record available for candidate offset wells.")
    if not mud_progs:
        data_gaps.append("No mud program record available for candidate offset wells.")
    # Operational research dataset boundaries are always explicitly recorded
    data_gaps.append("Volve is a public North Sea prototype research dataset; live rig telemetry and real-time wireline logs are not connected.")

    return {
        "current_position": current_pos,
        "nearby_well_coverage": nearby_coverage,
        "historical_events": events_list,
        "lookahead": lookahead_res,
        "casings": casings,
        "mud_programs": mud_progs,
        "data_gaps": list(set(data_gaps)),
        "provenance_breakdown": prov_counts,
        "disclaimer": "Volve is a public North Sea prototype dataset (Block 15/9) and is not operational evidence for Oil India formations. eRTMAC live rig telemetry is explicitly NOT CONNECTED."
    }


def export_knowledge_events_csv(
    conn: sqlite3.Connection,
    query: Optional[str] = None,
    well_id: Optional[str] = None,
    formation: Optional[str] = None,
    event_type: Optional[str] = None,
    reviewed_only: bool = False
) -> str:
    """
    Generates downloadable CSV containing filtered knowledge events and historical practices.
    """
    res = search_knowledge(
        conn,
        query=query,
        well_id=well_id,
        formation=formation,
        event_type=event_type,
        reviewed_only=reviewed_only,
        limit=500
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Standard Header
    writer.writerow([
        "well",
        "wellbore",
        "formation",
        "event",
        "depth",
        "depth_basis",
        "report",
        "historical_practice",
        "provenance",
        "reviewed"
    ])

    for r in res["results"]:
        if r.get("result_type") == "EVENT":
            writer.writerow([
                r.get("well_id", "") or r.get("well_name", ""),
                r.get("wellbore_id", ""),
                r.get("formation", ""),
                r.get("event_type", ""),
                r.get("depth", ""),
                r.get("depth_basis", "MD"),
                r.get("report_id", ""),
                r.get("historical_practice", "") or r.get("historical_offset_practice", ""),
                r.get("provenance", "REAL"),
                "YES" if r.get("reviewed") else "NO"
            ])

    return output.getvalue()
