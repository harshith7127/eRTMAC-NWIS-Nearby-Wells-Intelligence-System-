"""
NWIS Offset Evidence Service — Cross-Well Stratigraphic & Relative Depth Evidence Retrieval
Compares drilling events across wells using a common Formation + Depth Below Formation Top + Spatial Proximity.
"""

import sqlite3
from typing import List, Dict, Any, Optional
from .well_service import list_wells, haversine_distance
from .formation_service import (
    resolve_canonical_formation_name,
    get_wellbore_formation_tops,
    align_event_to_stratigraphy
)


def query_offset_events(
    conn: sqlite3.Connection,
    formation: str,
    depth_below_top: float,
    tolerance: float = 50.0,
    event_type: Optional[str] = None,
    dataset: Optional[str] = None,
    reviewed: Optional[bool] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None
) -> Dict[str, Any]:
    """
    Retrieves historical offset events in the same canonical formation within ±tolerance meters of depth_below_top.
    Optionally filters by surface radius if latitude/longitude are provided.
    """
    canonical_target_formation = resolve_canonical_formation_name(conn, formation)
    data_gaps: List[str] = []

    # 1. Fetch candidate wells
    dataset_filter = None if (not dataset or dataset.upper() == "ALL") else dataset.upper()
    all_wells = list_wells(conn, dataset=dataset_filter)

    well_distance_map = {}
    candidate_wells = []

    for w in all_wells:
        w_id = w["well_id"]
        if latitude is not None and longitude is not None and radius_km is not None:
            dist = haversine_distance(latitude, longitude, float(w["latitude"]), float(w["longitude"]))
            if dist <= radius_km:
                well_distance_map[w_id] = dist
                candidate_wells.append(w)
        else:
            well_distance_map[w_id] = None
            candidate_wells.append(w)

    if not candidate_wells:
        data_gaps.append(f"No wells found matching geographic/dataset constraints.")
        return {
            "query": {
                "formation": formation,
                "canonical_formation": canonical_target_formation,
                "depth_below_top": depth_below_top,
                "tolerance": tolerance,
                "dataset": dataset or "ALL"
            },
            "total_count": 0,
            "events": [],
            "data_gaps": data_gaps,
            "provenance_breakdown": {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}
        }

    # 2. Query all events across candidate wells
    matching_events = []
    prov_counts = {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}

    for w in candidate_wells:
        well_id = w["well_id"]
        well_name = w["well_name"]
        dist_km = well_distance_map.get(well_id)

        # Get wellbores
        wb_rows = conn.execute(
            "SELECT * FROM wellbores WHERE well_id = ? ORDER BY name ASC",
            (well_id,)
        ).fetchall()

        for wb in wb_rows:
            wb_id = wb["wellbore_id"]
            wb_name = wb["name"]

            # Get formation tops for this wellbore
            tops = get_wellbore_formation_tops(conn, wb_id)
            if not tops:
                data_gaps.append(f"Wellbore '{wb_name}' ({well_name}) has no formation tops; excluded from stratigraphic comparison.")
                continue

            # Check if this wellbore contains the target canonical formation
            has_formation = any(t["formation_name_canonical"].lower() == canonical_target_formation.lower() for t in tops)
            if not has_formation:
                continue

            # Fetch events for this wellbore
            ev_query = "SELECT * FROM events WHERE wellbore_id = ? AND excluded = 0"
            ev_params = [wb_id]

            if event_type:
                ev_query += " AND UPPER(event_type) = UPPER(?)"
                ev_params.append(event_type)

            if reviewed is not None:
                ev_query += " AND reviewed = ?"
                ev_params.append(1 if reviewed else 0)

            ev_rows = conn.execute(ev_query, ev_params).fetchall()

            for ev_row in ev_rows:
                raw_ev = dict(ev_row)
                aligned = align_event_to_stratigraphy(conn, raw_ev, tops)

                # Check if aligned to the canonical target formation
                ev_canon_form = aligned.get("canonical_formation_name")
                if not ev_canon_form or ev_canon_form.lower() != canonical_target_formation.lower():
                    continue

                rel_depth = aligned.get("depth_below_formation_top_md")
                if rel_depth is None:
                    continue

                # Evaluate tolerance window
                diff = abs(rel_depth - depth_below_top)
                if diff <= tolerance:
                    # Fetch report date if report_id exists
                    rep_date = None
                    if raw_ev.get("report_id"):
                        r_row = conn.execute(
                            "SELECT report_date FROM reports WHERE report_id = ?",
                            (raw_ev["report_id"],)
                        ).fetchone()
                        if r_row:
                            rep_date = r_row["report_date"]

                    item = {
                        "event_id": raw_ev["event_id"],
                        "well_id": well_id,
                        "well_name": well_name,
                        "wellbore_id": wb_id,
                        "wellbore_name": wb_name,
                        "event_type": raw_ev["event_type"],
                        "severity": raw_ev.get("severity", "Medium"),
                        "raw_md": raw_ev.get("md"),
                        "raw_tvd": raw_ev.get("tvd"),
                        "canonical_formation_name": ev_canon_form,
                        "formation_top_md": aligned.get("formation_top_md"),
                        "depth_below_formation_top_md": rel_depth,
                        "depth_basis": aligned.get("depth_basis", "MD"),
                        "alignment_basis": aligned.get("alignment_basis", "FORMATION_TOP_MD"),
                        "distance_km": dist_km,
                        "reviewed": bool(raw_ev.get("reviewed", 0)),
                        "excluded": bool(raw_ev.get("excluded", 0)),
                        "provenance": raw_ev.get("provenance", "REAL"),
                        "description": raw_ev.get("description", ""),
                        "source_text": raw_ev.get("source_text"),
                        "report_id": raw_ev.get("report_id"),
                        "report_date": rep_date
                    }
                    matching_events.append(item)

                    prov = raw_ev.get("provenance", "REAL")
                    prov_counts[prov] = prov_counts.get(prov, 0) + 1

    # Sort matching events by closeness to target relative depth
    matching_events.sort(key=lambda e: abs(e["depth_below_formation_top_md"] - depth_below_top))

    if not matching_events:
        data_gaps.append(
            f"No offset events found in canonical formation '{canonical_target_formation}' "
            f"within ±{tolerance} m of relative depth {depth_below_top} m."
        )

    # Derived provenance count for alignment operations
    prov_counts["DERIVED"] = len(matching_events)

    return {
        "query": {
            "formation": formation,
            "canonical_formation": canonical_target_formation,
            "depth_below_top": depth_below_top,
            "tolerance": tolerance,
            "event_type": event_type,
            "dataset": dataset or "ALL",
            "reviewed": reviewed,
            "latitude": latitude,
            "longitude": longitude,
            "radius_km": radius_km
        },
        "total_count": len(matching_events),
        "events": matching_events,
        "data_gaps": data_gaps,
        "provenance_breakdown": prov_counts
    }
