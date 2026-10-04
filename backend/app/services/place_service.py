"""
NWIS Place Query Service — Geographic, Trajectory, Stratigraphic & Evidence Retrieval
Executes deterministic proximity searches over surface wellheads and subsurface MWD trajectory stations.
"""

import math
import sqlite3
from typing import Dict, Any, List, Optional
from .well_service import haversine_distance, list_wells


def execute_place_query(
    conn: sqlite3.Connection,
    latitude: float,
    longitude: float,
    radius_km: float = 2.0,
    depth_m: Optional[float] = None,
    dataset: Optional[str] = "VOLVE_PUBLIC",
    event_type: Optional[str] = None,
    formation_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core Place Query: Evaluates what is known around (latitude, longitude) within radius_km.
    Identifies nearby wellbores, closest approach via MWD surveys, stratigraphy, DDR evidence,
    and explicit data gaps.
    """
    # Enforce dataset filter unless explicitly requested as 'ALL'
    dataset_filter = None if (not dataset or dataset.upper() == "ALL") else dataset.upper()

    all_wells = list_wells(conn, dataset=dataset_filter)
    nearby_wells = []
    nearby_well_ids = set()
    nearby_wellbore_ids = set()
    data_gaps: List[str] = []

    # 1. Evaluate wellhead distances and survey trajectories
    for w in all_wells:
        w_lat = float(w["latitude"])
        w_lon = float(w["longitude"])
        surface_dist_km = haversine_distance(latitude, longitude, w_lat, w_lon)
        surface_dist_m = round(surface_dist_km * 1000.0, 1)

        # Get wellbores for this well
        wb_rows = conn.execute(
            "SELECT * FROM wellbores WHERE well_id = ? ORDER BY name ASC",
            (w["well_id"],)
        ).fetchall()

        for wb in wb_rows:
            wb_id = wb["wellbore_id"]
            # Fetch surveys if available
            surveys = conn.execute(
                "SELECT * FROM surveys WHERE wellbore_id = ? ORDER BY md ASC",
                (wb_id,)
            ).fetchall()

            closest_approach_m = surface_dist_m
            closest_md = float(wb["md_start"] or 0.0)
            closest_tvd = float(wb["tvd_start"] or 0.0)
            trajectory_basis = "WELLHEAD_FALLBACK"

            if surveys:
                trajectory_basis = "SUBSURFACE_SURVEY"
                # If survey stations exist with displacement offsets, calculate closest approach
                min_station_dist_m = float("inf")
                best_station = None

                for s in surveys:
                    s_md = float(s["md"])
                    # If depth filter is active, give preference to survey stations around depth window (±250m)
                    if depth_m is not None and abs(s_md - depth_m) > 350.0:
                        continue

                    # Approximate station lat/lon offset if displacement northing/easting is available
                    # 1 deg lat ~ 111,195 m; 1 deg lon ~ 111,195 * cos(lat) m
                    disp_n = float(s["northing"] or 0.0)
                    disp_e = float(s["easting"] or 0.0)
                    stn_lat = w_lat + (disp_n / 111195.0)
                    stn_lon = w_lon + (disp_e / (111195.0 * math.cos(math.radians(w_lat))))
                    stn_dist_m = round(haversine_distance(latitude, longitude, stn_lat, stn_lon) * 1000.0, 1)

                    if stn_dist_m < min_station_dist_m:
                        min_station_dist_m = stn_dist_m
                        best_station = s

                if best_station is not None and min_station_dist_m < float("inf"):
                    closest_approach_m = min_station_dist_m
                    closest_md = float(best_station["md"])
                    closest_tvd = float(best_station["tvd"]) if best_station["tvd"] is not None else closest_md
            else:
                data_gaps.append(f"Directional MWD survey unavailable for wellbore {wb_id}; using surface wellhead fallback.")

            # Check if well meets radius threshold based on closest approach or surface distance
            effective_dist_km = min(surface_dist_km, closest_approach_m / 1000.0)
            if effective_dist_km <= radius_km:
                nearby_well_ids.add(w["well_id"])
                nearby_wellbore_ids.add(wb_id)

                nearby_wells.append({
                    "well_id": w["well_id"],
                    "well_name": w["well_name"],
                    "field": w["field"],
                    "operator": w["operator"],
                    "dataset": w["dataset"],
                    "provenance": w["provenance"],
                    "latitude": w_lat,
                    "longitude": w_lon,
                    "distance_km": round(surface_dist_km, 3),
                    "distance_m": surface_dist_m,
                    "closest_approach_m": round(closest_approach_m, 1),
                    "closest_md": closest_md,
                    "closest_tvd": closest_tvd,
                    "trajectory_basis": trajectory_basis,
                    "status": w.get("status", "P&A"),
                    "spud_date": w.get("spud_date")
                })

    nearby_wells.sort(key=lambda x: x["distance_km"])

    if not nearby_wells:
        return {
            "query": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km,
                "depth_m": depth_m,
                "dataset": dataset or "ALL",
                "source_crs": "ED50 / UTM Zone 31N & WGS84 Geographic"
            },
            "nearby_wells": [],
            "nearby_wellbores": [],
            "formations": [],
            "events": [],
            "reports": [],
            "casings": [],
            "mud_programs": [],
            "data_gaps": [f"No wellbores found within {radius_km} km radius of ({latitude:.5f}, {longitude:.5f})."],
            "provenance_summary": {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}
        }

    # 2. Fetch Formations Observed in Nearby Wellbores
    wb_placeholders = ",".join("?" for _ in nearby_wellbore_ids)
    form_query = f"""
        SELECT f.*, w.well_id, w.name as wellbore_name
        FROM formation_tops f
        JOIN wellbores w ON f.wellbore_id = w.wellbore_id
        WHERE f.wellbore_id IN ({wb_placeholders})
    """
    form_params = list(nearby_wellbore_ids)
    if formation_name:
        form_query += " AND UPPER(f.formation_name) LIKE UPPER(?)"
        form_params.append(f"%{formation_name}%")
    form_query += " ORDER BY f.md ASC"

    form_rows = conn.execute(form_query, form_params).fetchall()
    formations = []
    for r in form_rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        d["depth_basis"] = "MD"
        formations.append(d)

    if not formations:
        data_gaps.append("Stratigraphic tops unrecorded in selected radius.")

    # 3. Fetch Events & Incidents in Nearby Wellbores
    ev_query = f"""
        SELECT e.*, w.well_id, w.name as wellbore_name
        FROM events e
        JOIN wellbores w ON e.wellbore_id = w.wellbore_id
        WHERE e.wellbore_id IN ({wb_placeholders})
    """
    ev_params = list(nearby_wellbore_ids)

    if event_type:
        ev_query += " AND UPPER(e.event_type) = UPPER(?)"
        ev_params.append(event_type)
    if depth_m is not None:
        ev_query += " AND (e.md IS NULL OR ABS(e.md - ?) <= 250.0)"
        ev_params.append(depth_m)

    ev_query += " ORDER BY e.md ASC, e.created_at DESC"
    ev_rows = conn.execute(ev_query, ev_params).fetchall()

    events = []
    unreviewed_count = 0
    for r in ev_rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        d["excluded"] = bool(d["excluded"])
        if not d["reviewed"]:
            unreviewed_count += 1
        events.append(d)

    if unreviewed_count > 0:
        data_gaps.append(f"{unreviewed_count} incident records are auto-extracted heuristics pending engineering review (reviewed: false).")

    # 4. Fetch DDR Reports for Nearby Wellbores
    rep_query = f"""
        SELECT report_id, wellbore_id, report_type, title, report_date, source_file, provenance, reviewed, extraction_status
        FROM reports
        WHERE wellbore_id IN ({wb_placeholders})
        ORDER BY report_date DESC LIMIT 40
    """
    rep_rows = conn.execute(rep_query, list(nearby_wellbore_ids)).fetchall()
    reports = [dict(r) for r in rep_rows]

    # 5. Fetch Casings and Mud Programs
    casing_query = f"SELECT * FROM casings WHERE wellbore_id IN ({wb_placeholders}) ORDER BY setting_depth_md ASC"
    casing_rows = conn.execute(casing_query, list(nearby_wellbore_ids)).fetchall()
    casings = [dict(r) for r in casing_rows]

    mud_query = f"SELECT * FROM mud_programs WHERE wellbore_id IN ({wb_placeholders}) ORDER BY md_start ASC"
    mud_rows = conn.execute(mud_query, list(nearby_wellbore_ids)).fetchall()
    mud_programs = [dict(r) for r in mud_rows]

    # Provenance Summary
    prov_counts = {"REAL": 0, "DERIVED": 0, "SYNTHETIC": 0, "ILLUSTRATIVE": 0}
    for w in nearby_wells:
        p = w.get("provenance", "REAL")
        prov_counts[p] = prov_counts.get(p, 0) + 1
    for e in events:
        p = e.get("provenance", "REAL")
        prov_counts[p] = prov_counts.get(p, 0) + 1

    return {
        "query": {
            "latitude": latitude,
            "longitude": longitude,
            "radius_km": radius_km,
            "depth_m": depth_m,
            "dataset": dataset or "ALL",
            "source_crs": "ED50 / UTM Zone 31N & WGS84 Geographic"
        },
        "nearby_wells": nearby_wells,
        "nearby_wellbores": list(nearby_wellbore_ids),
        "formations": formations,
        "events": events,
        "reports": reports,
        "casings": casings,
        "mud_programs": mud_programs,
        "data_gaps": data_gaps,
        "provenance_summary": prov_counts
    }
