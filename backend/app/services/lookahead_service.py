"""
NWIS Look-Ahead Rule Engine & Offset Evidence Decision-Support Service
Deterministic, explainable, source-linked historical offset evidence evaluation.
Answers: "Based on nearby offset wells that drilled this formation and relative depth, what historically happened ahead of the current well?"
Strictly NO machine learning, NO predictive probabilities, NO fabricated confidence scores.
"""

import math
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from .well_service import list_wells, haversine_distance
from .formation_service import (
    resolve_canonical_formation_name,
    get_wellbore_formation_tops,
    get_formation_at_depth,
    align_event_to_stratigraphy
)


def evaluate_lookahead(
    conn: sqlite3.Connection,
    wellbore_id: str,
    current_md: float,
    lookahead_m: float = 300.0,
    radius_km: float = 2.0,
    event_type: Optional[str] = None,
    include_unreviewed: bool = False,
    dataset: Optional[str] = "VOLVE_PUBLIC",
    formation_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates historical offset evidence ahead of the active wellbore at current_md.
    Pipeline:
    Active Well -> Formation + Relative Depth -> Lookahead Window -> Nearby Offsets -> Interval Coverage -> Event Matching -> K-of-N Evidence -> Explainable Alert.
    """
    # 1. Parameter validation
    lookahead_m = max(10.0, min(2000.0, float(lookahead_m)))
    radius_km = max(0.1, min(50.0, float(radius_km)))
    data_gaps: List[str] = []
    prov_counts = {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}

    # 2. Fetch active wellbore and active well
    wb_row = conn.execute("SELECT * FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
    if not wb_row:
        return {
            "active_well": {"wellbore_id": wellbore_id, "current_md": current_md},
            "query": {"wellbore_id": wellbore_id, "current_md": current_md, "lookahead_m": lookahead_m, "radius_km": radius_km},
            "alerts": [],
            "coverage": {"candidate_offset_wellbores": 0, "covered_offset_wellbores": 0, "candidate_wellbore_details": []},
            "evidence": [],
            "data_gaps": [f"Active wellbore '{wellbore_id}' not found in canonical database."],
            "provenance_breakdown": prov_counts
        }

    active_wb = dict(wb_row)
    well_row = conn.execute("SELECT * FROM wells WHERE well_id = ?", (active_wb["well_id"],)).fetchone()
    active_well = dict(well_row) if well_row else {"well_id": active_wb["well_id"], "well_name": active_wb["name"], "latitude": 0.0, "longitude": 0.0}

    active_lat = float(active_well.get("latitude") or 0.0)
    active_lon = float(active_well.get("longitude") or 0.0)

    # 3. Stratigraphic alignment for active well at current_md
    active_strat = get_formation_at_depth(conn, wellbore_id, current_md)
    if formation_override:
        target_canonical_formation = resolve_canonical_formation_name(conn, formation_override)
        active_relative_depth = active_strat.get("depth_below_top_md") or 0.0
    else:
        target_canonical_formation = active_strat.get("formation_name_canonical") or "UNKNOWN"
        active_relative_depth = active_strat.get("depth_below_top_md")

    active_context = {
        "well_id": active_well.get("well_id"),
        "well_name": active_well.get("well_name"),
        "wellbore_id": wellbore_id,
        "wellbore_name": active_wb.get("name"),
        "current_md": current_md,
        "formation_name_raw": active_strat.get("formation_name_raw"),
        "canonical_formation_name": target_canonical_formation,
        "current_relative_depth": active_relative_depth,
        "alignment_basis": active_strat.get("alignment_basis", "NOT_ALIGNED")
    }

    # If active well formation or relative depth cannot be resolved
    if target_canonical_formation == "UNKNOWN" or active_relative_depth is None:
        gap_msg = (
            f"No offset-based estimate yet. Current MD {current_md} m could not be stratigraphically aligned to a canonical formation. "
            f"Reason: {active_strat.get('reason') or 'Formation top missing or depth is outside known formation boundaries.'}"
        )
        data_gaps.append(gap_msg)
        return {
            "active_well": active_context,
            "query": {
                "formation": target_canonical_formation,
                "current_relative_depth": None,
                "lookahead_m": lookahead_m,
                "radius_km": radius_km,
                "event_type": event_type,
                "include_unreviewed": include_unreviewed
            },
            "alerts": [],
            "coverage": {"candidate_offset_wellbores": 0, "covered_offset_wellbores": 0, "candidate_wellbore_details": []},
            "evidence": [],
            "data_gaps": data_gaps,
            "provenance_breakdown": prov_counts
        }

    # 4. Define look-ahead window
    lookahead_start = float(active_relative_depth)
    lookahead_end = round(lookahead_start + lookahead_m, 2)

    # 5. Retrieve candidate offset wells within geographic radius
    dataset_filter = None if (not dataset or dataset.upper() == "ALL") else dataset.upper()
    all_candidate_wells = list_wells(conn, dataset=dataset_filter)

    candidate_wellbore_comparisons: List[Dict[str, Any]] = []
    covered_offset_wellbore_ids = set()
    covered_offset_wellbores_info = {}

    for w in all_candidate_wells:
        w_id = w["well_id"]
        w_name = w["well_name"]
        w_lat = float(w["latitude"])
        w_lon = float(w["longitude"])

        surface_dist_km = haversine_distance(active_lat, active_lon, w_lat, w_lon)
        surface_dist_m = round(surface_dist_km * 1000.0, 1)

        # Retrieve wellbores for this candidate well
        wb_rows = conn.execute("SELECT * FROM wellbores WHERE well_id = ? ORDER BY name ASC", (w_id,)).fetchall()
        for off_wb in wb_rows:
            off_wb_id = off_wb["wellbore_id"]
            off_wb_name = off_wb["name"]

            # Exclude active wellbore from offset comparisons
            if off_wb_id == wellbore_id:
                continue

            # Trajectory closest approach calculation
            surveys = conn.execute("SELECT * FROM surveys WHERE wellbore_id = ? ORDER BY md ASC", (off_wb_id,)).fetchall()
            trajectory_avail = len(surveys) > 0
            distance_m = surface_dist_m
            distance_basis = "WELLHEAD_FALLBACK"

            if trajectory_avail:
                min_approach_m = float("inf")
                for s in surveys:
                    disp_n = float(s["northing"] or 0.0)
                    disp_e = float(s["easting"] or 0.0)
                    stn_lat = w_lat + (disp_n / 111195.0)
                    stn_lon = w_lon + (disp_e / (111195.0 * math.cos(math.radians(w_lat))))
                    stn_dist_m = haversine_distance(active_lat, active_lon, stn_lat, stn_lon) * 1000.0
                    if stn_dist_m < min_approach_m:
                        min_approach_m = stn_dist_m
                if min_approach_m < float("inf"):
                    distance_m = round(min_approach_m, 1)
                    distance_basis = "SUBSURFACE_SURVEY"

            # Check geographic proximity
            if (distance_m / 1000.0) > radius_km:
                continue

            # Multi-Attribute Analogue Match properties
            tops = get_wellbore_formation_tops(conn, off_wb_id)
            casing_count = conn.execute("SELECT count(*) FROM casings WHERE wellbore_id = ?", (off_wb_id,)).fetchone()[0]
            mud_count = conn.execute("SELECT count(*) FROM mud_programs WHERE wellbore_id = ?", (off_wb_id,)).fetchone()[0]

            casing_avail = casing_count > 0
            mud_avail = mud_count > 0

            # Formation Match
            matched_top_record = None
            next_top_record = None
            if tops:
                for idx, t in enumerate(tops):
                    if t["formation_name_canonical"].lower() == target_canonical_formation.lower():
                        matched_top_record = t
                        if idx + 1 < len(tops):
                            next_top_record = tops[idx + 1]
                        break

            formation_match = matched_top_record is not None

            # Relative Depth Coverage Check (Denominator Eligibility)
            relative_depth_coverage = False
            explanation_parts = []

            if not formation_match:
                explanation_parts.append(f"Formation '{target_canonical_formation}' not logged in tops")
            else:
                explanation_parts.append(f"Canonical formation match ({target_canonical_formation})")
                top_md = matched_top_record["md"]
                bottom_md = next_top_record["md"] if next_top_record else off_wb["md_end"]

                req_md_start = top_md + lookahead_start
                # The wellbore must have penetrated at least down to the required start of the interval
                if bottom_md is not None and bottom_md < req_md_start:
                    explanation_parts.append(f"Formation ended at MD {bottom_md} m before interval start {req_md_start:.1f} m")
                    relative_depth_coverage = False
                elif off_wb["md_end"] is not None and off_wb["md_end"] < req_md_start:
                    explanation_parts.append(f"Wellbore TD ({off_wb['md_end']} m) is above interval start ({req_md_start:.1f} m)")
                    relative_depth_coverage = False
                else:
                    relative_depth_coverage = True
                    explanation_parts.append(f"Interval covered ({lookahead_start:.1f} m - {lookahead_end:.1f} m below top)")

            if trajectory_avail:
                explanation_parts.append("MWD survey available")
            else:
                explanation_parts.append("MWD survey missing (wellhead fallback)")
                data_gaps.append(f"Directional MWD survey unavailable for candidate offset '{off_wb_name}'; using surface wellhead fallback.")

            if casing_avail:
                explanation_parts.append("Casing program recorded")
            else:
                data_gaps.append(f"Candidate offset wellbore '{off_wb_name}' has no casing records.")

            if mud_avail:
                explanation_parts.append("Mud program recorded")

            comp_obj = {
                "wellbore_id": off_wb_id,
                "well_id": w_id,
                "well_name": w_name,
                "wellbore_name": off_wb_name,
                "formation_match": formation_match,
                "relative_depth_coverage": relative_depth_coverage,
                "trajectory_available": trajectory_avail,
                "casing_available": casing_avail,
                "mud_program_available": mud_avail,
                "distance_m": distance_m,
                "distance_basis": distance_basis,
                "explanation": ", ".join(explanation_parts)
            }
            candidate_wellbore_comparisons.append(comp_obj)

            if formation_match and relative_depth_coverage:
                covered_offset_wellbore_ids.add(off_wb_id)
                covered_offset_wellbores_info[off_wb_id] = {
                    "well_id": w_id,
                    "well_name": w_name,
                    "wellbore_name": off_wb_name,
                    "distance_m": distance_m,
                    "distance_basis": distance_basis,
                    "tops": tops
                }

    candidate_count = len(candidate_wellbore_comparisons)
    covered_count = len(covered_offset_wellbore_ids)

    # 6. Retrieve matching historical events across covered offset wellbores
    qualifying_events: List[Dict[str, Any]] = []
    unreviewed_events_count = 0

    for off_wb_id in covered_offset_wellbore_ids:
        wb_meta = covered_offset_wellbores_info[off_wb_id]
        tops = wb_meta["tops"]

        ev_query = "SELECT * FROM events WHERE wellbore_id = ? AND excluded = 0"
        ev_params = [off_wb_id]

        if event_type:
            ev_query += " AND UPPER(event_type) = UPPER(?)"
            ev_params.append(event_type)

        ev_rows = conn.execute(ev_query, ev_params).fetchall()

        for ev_r in ev_rows:
            raw_ev = dict(ev_r)
            aligned = align_event_to_stratigraphy(conn, raw_ev, tops)

            ev_canon_form = aligned.get("canonical_formation_name")
            if not ev_canon_form or ev_canon_form.lower() != target_canonical_formation.lower():
                continue

            rel_depth = aligned.get("depth_below_formation_top_md")
            if rel_depth is None:
                continue

            # Match within lookahead interval [lookahead_start - 5.0, lookahead_end + 5.0]
            if not (lookahead_start - 5.0 <= rel_depth <= lookahead_end + 5.0):
                continue

            is_reviewed = bool(raw_ev.get("reviewed", 0))

            if not is_reviewed:
                unreviewed_events_count += 1

            # Only reviewed events contribute to alert rules by default
            if not include_unreviewed and not is_reviewed:
                data_gaps.append(
                    f"Unreviewed event '{raw_ev['event_id']}' ({raw_ev['event_type']}) at rel depth {rel_depth} m in offset '{wb_meta['well_name']}' omitted from operational alert."
                )
                continue

            # Report date lookup
            rep_date = None
            if raw_ev.get("report_id"):
                r_row = conn.execute("SELECT report_date FROM reports WHERE report_id = ?", (raw_ev["report_id"],)).fetchone()
                if r_row:
                    rep_date = r_row["report_date"]

            hist_action = None
            if raw_ev.get("action"):
                hist_action = f"Historical offset practice: Offset well {wb_meta['well_name']} recorded action: {raw_ev['action']}"

            prov = raw_ev.get("provenance", "REAL")
            prov_counts[prov] = prov_counts.get(prov, 0) + 1

            ev_item = {
                "well_id": wb_meta["well_id"],
                "wellbore_id": off_wb_id,
                "well_name": wb_meta["well_name"],
                "wellbore_name": wb_meta["wellbore_name"],
                "distance_m": wb_meta["distance_m"],
                "distance_basis": wb_meta["distance_basis"],
                "formation": target_canonical_formation,
                "event_type": raw_ev["event_type"],
                "severity": raw_ev.get("severity", "Medium"),
                "event_md": raw_ev.get("md"),
                "event_tvd": raw_ev.get("tvd"),
                "relative_depth": rel_depth,
                "current_relative_depth": active_relative_depth,
                "lookahead_end": lookahead_end,
                "source_report_id": raw_ev.get("report_id"),
                "report_date": rep_date,
                "event_id": raw_ev["event_id"],
                "reviewed": is_reviewed,
                "excluded": bool(raw_ev.get("excluded", 0)),
                "provenance": prov,
                "description": raw_ev.get("description", ""),
                "source_text": raw_ev.get("source_text"),
                "historical_action": hist_action
            }
            qualifying_events.append(ev_item)

    # Sort events by relative depth proximity
    qualifying_events.sort(key=lambda e: e["relative_depth"])

    # 7. K-of-N Aggregation & Deterministic Alerts
    alerts: List[Dict[str, Any]] = []
    evaluated_event_types = [event_type] if event_type else list(set([e["event_type"] for e in qualifying_events] or ["LOSS", "KICK", "STICKY_HOLE"]))

    created_timestamp = datetime.now(timezone.utc).isoformat()

    for etype in evaluated_event_types:
        etype_upper = etype.upper()
        matching_for_type = [e for e in qualifying_events if e["event_type"].upper() == etype_upper]
        distinct_offset_wells = sorted(list(set([e["well_name"] for e in matching_for_type])))
        k_count = len(distinct_offset_wells)
        n_count = covered_count

        # Telemetry context string
        telemetry_context = "Telemetry not available for this rule. Alert is driven exclusively by historical offset evidence."

        # Severity & Status determination
        if n_count < 2:
            severity = "INSUFFICIENT_COVERAGE"
            status = "INSUFFICIENT_DATA"
            trigger_reason = (
                f"Only {n_count} offset wellbore(s) drilled this interval within {radius_km} km. "
                f"Minimum 2 offset wellbores required for representative look-ahead evidence."
            )
        elif k_count == 0:
            severity = "NO_EVIDENCE"
            status = "NO_HAZARD_OBSERVED"
            trigger_reason = (
                f"0 of {n_count} reviewed offset wellbores encountered {etype_upper} within {lookahead_m} m ahead in {target_canonical_formation} formation."
            )
        elif k_count == 1:
            severity = "OBSERVED"
            status = "ACTIVE"
            trigger_reason = (
                f"1 of {n_count} reviewed offset wellbores encountered {etype_upper} within {lookahead_m} m ahead in {target_canonical_formation} formation ({', '.join(distinct_offset_wells)})."
            )
        else:
            severity = "REPEATED"
            status = "CONFIRMED"
            trigger_reason = (
                f"{k_count} of {n_count} reviewed offset wellbores encountered repeated {etype_upper} within {lookahead_m} m ahead in {target_canonical_formation} formation ({', '.join(distinct_offset_wells)})."
            )

        alert_id = f"alert_{wellbore_id}_{etype_upper}_{target_canonical_formation}_{int(lookahead_start)}_{int(lookahead_end)}"

        alert_obj = {
            "alert_id": alert_id,
            "active_well_id": active_well.get("well_id"),
            "active_wellbore_id": wellbore_id,
            "event_type": etype_upper,
            "formation": target_canonical_formation,
            "current_relative_depth": active_relative_depth,
            "lookahead_start": lookahead_start,
            "lookahead_end": lookahead_end,
            "k": k_count,
            "n": n_count,
            "severity": severity,
            "status": status,
            "trigger_reason": trigger_reason,
            "offset_wells": distinct_offset_wells,
            "evidence_events": matching_for_type,
            "created_at": created_timestamp,
            "provenance": "DERIVED",
            "telemetry_context": telemetry_context
        }
        alerts.append(alert_obj)
        prov_counts["DERIVED"] += 1

    if unreviewed_events_count > 0 and not include_unreviewed:
        data_gaps.append(f"{unreviewed_events_count} unreviewed historical event(s) exist in this interval but were excluded from operational alert evaluation.")

    return {
        "active_well": active_context,
        "query": {
            "formation": target_canonical_formation,
            "current_relative_depth": active_relative_depth,
            "lookahead_m": lookahead_m,
            "radius_km": radius_km,
            "event_type": event_type,
            "include_unreviewed": include_unreviewed
        },
        "alerts": alerts,
        "coverage": {
            "candidate_offset_wellbores": candidate_count,
            "covered_offset_wellbores": covered_count,
            "candidate_wellbore_details": candidate_wellbore_comparisons
        },
        "evidence": qualifying_events,
        "data_gaps": data_gaps,
        "provenance_breakdown": prov_counts
    }
