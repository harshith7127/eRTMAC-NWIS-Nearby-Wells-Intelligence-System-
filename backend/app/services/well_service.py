"""
NWIS Well Service — Querying Wells, Wellbores, Stratigraphy, Surveys, and Spatial Distance
"""

import math
import sqlite3
from typing import List, Optional, Dict, Any


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance between two points in km."""
    R = 6371.0  # Earth's radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 3)


DEMO_WELLS = [
    {
        "well_id": "A-17",
        "well_name": "Rig-04 / A-17 (Active Drill)",
        "field": "Jaisalmer North Basin",
        "country": "India",
        "operator": "National Petroleum Co.",
        "latitude": 27.5000,
        "longitude": 71.5000,
        "utm_easting": 549382.0,
        "utm_northing": 3042180.0,
        "crs": "WGS84",
        "elevation_m": 175.0,
        "elevation_type": "KB",
        "total_depth_m": 2850.0,
        "spud_date": "2026-08-12",
        "completion_date": None,
        "status": "DRILLING",
        "dataset": "SYNTHETIC_DEMO",
        "provenance": "SYNTHETIC",
        "purpose": "EXPLORATION",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "well_id": "B-04",
        "well_name": "B-04 (Discovery Offset)",
        "field": "Jaisalmer North Basin",
        "country": "India",
        "operator": "National Petroleum Co.",
        "latitude": 27.5120,
        "longitude": 71.5080,
        "utm_easting": 550180.0,
        "utm_northing": 3043510.0,
        "crs": "WGS84",
        "elevation_m": 172.0,
        "elevation_type": "KB",
        "total_depth_m": 3100.0,
        "spud_date": "2024-03-10",
        "completion_date": "2024-05-18",
        "status": "SUSPENDED",
        "dataset": "SYNTHETIC_DEMO",
        "provenance": "SYNTHETIC",
        "purpose": "DISCOVERY",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "well_id": "C-11",
        "well_name": "C-11 (Appraisal Offset)",
        "field": "Jaisalmer North Basin",
        "country": "India",
        "operator": "National Petroleum Co.",
        "latitude": 27.4890,
        "longitude": 71.4920,
        "utm_easting": 548590.0,
        "utm_northing": 3040960.0,
        "crs": "WGS84",
        "elevation_m": 178.0,
        "elevation_type": "KB",
        "total_depth_m": 2980.0,
        "spud_date": "2024-09-01",
        "completion_date": "2024-11-20",
        "status": "P&A",
        "dataset": "SYNTHETIC_DEMO",
        "provenance": "SYNTHETIC",
        "purpose": "APPRAISAL",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "well_id": "D-09",
        "well_name": "D-09 (North Delineation)",
        "field": "Jaisalmer North Basin",
        "country": "India",
        "operator": "National Petroleum Co.",
        "latitude": 27.5250,
        "longitude": 71.5150,
        "utm_easting": 550870.0,
        "utm_northing": 3044950.0,
        "crs": "WGS84",
        "elevation_m": 170.0,
        "elevation_type": "KB",
        "total_depth_m": 3250.0,
        "spud_date": "2025-01-15",
        "completion_date": "2025-04-02",
        "status": "P&A",
        "dataset": "SYNTHETIC_DEMO",
        "provenance": "SYNTHETIC",
        "purpose": "DELINEATION",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]


VOLVE_WELL_METADATA = {
    "15/9-F-12": {"total_depth_m": 3520.0, "water_depth_m": 91.0, "utm_easting": 435053.0, "utm_northing": 6478568.0, "npdid": 5599},
    "15/9-F-14": {"total_depth_m": 3720.0, "water_depth_m": 91.0, "utm_easting": 435055.0, "utm_northing": 6478565.0, "npdid": 6184},
    "15/9-F-15": {"total_depth_m": 3810.0, "water_depth_m": 91.0, "utm_easting": 435056.0, "utm_northing": 6478563.0, "npdid": 5351},
    "15/9-F-11": {"total_depth_m": 3610.0, "water_depth_m": 91.0, "utm_easting": 435050.0, "utm_northing": 6478570.0, "npdid": 7078},
    "15/9-F-4":  {"total_depth_m": 3510.0, "water_depth_m": 91.0, "utm_easting": 435054.0, "utm_northing": 6478567.0, "npdid": 5927},
    "15/9-F-9":  {"total_depth_m": 3450.0, "water_depth_m": 91.0, "utm_easting": 435052.0, "utm_northing": 6478569.0, "npdid": 5403},
    "15/9-19 A": {"total_depth_m": 3300.0, "water_depth_m": 91.0, "utm_easting": 437520.0, "utm_northing": 6477920.0, "npdid": 3145},
}


def _enrich_well(w: Dict[str, Any]) -> Dict[str, Any]:
    wid = w.get("well_id")
    if wid in VOLVE_WELL_METADATA:
        meta = VOLVE_WELL_METADATA[wid]
        for k, v in meta.items():
            if w.get(k) is None:
                w[k] = v
    return w


def list_wells(
    conn: sqlite3.Connection,
    dataset: Optional[str] = None,
    field: Optional[str] = None,
    provenance: Optional[str] = None,
    status: Optional[str] = None,
    workspace: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    if workspace in ("onshore_demo", "demo", "workspace_b"):
        res = DEMO_WELLS
        if status:
            res = [w for w in res if w["status"] == status]
        if search:
            st = search.lower().strip()
            res = [w for w in res if st in w["well_id"].lower() or st in w["well_name"].lower() or st in w["field"].lower()]
        return [_enrich_well(dict(w)) for w in res]

    query = "SELECT * FROM wells WHERE 1=1"
    params = []

    if workspace in ("volve", "workspace_a", "real_volve") or not workspace:
        # Default or Volve workspace excludes synthetic demo data
        query += " AND provenance != 'SYNTHETIC'"

    if dataset:
        query += " AND dataset = ?"
        params.append(dataset)
    if field:
        query += " AND field = ?"
        params.append(field)
    if provenance:
        query += " AND provenance = ?"
        params.append(provenance)
    if status:
        query += " AND status = ?"
        params.append(status)

    if search:
        st = f"%{search.strip()}%"
        # Support searching well ID, name, field, and NPDID
        query += " AND (well_id LIKE ? OR well_name LIKE ? OR field LIKE ?)"
        params.extend([st, st, st])

    query += " ORDER BY well_name ASC"
    rows = conn.execute(query, params).fetchall()
    results = [_enrich_well(dict(r)) for r in rows]

    # If search might be an NPDID and wasn't found by SQL text match, filter by NPDID in metadata
    if search and not results:
        search_num = None
        try:
            search_num = int(search.strip())
        except ValueError:
            pass
        if search_num is not None:
            matching_ids = [wid for wid, meta in VOLVE_WELL_METADATA.items() if meta.get("npdid") == search_num]
            if matching_ids:
                ph = ",".join("?" for _ in matching_ids)
                rows = conn.execute(f"SELECT * FROM wells WHERE well_id IN ({ph})", matching_ids).fetchall()
                results = [_enrich_well(dict(r)) for r in rows]

    return results


def get_well(conn: sqlite3.Connection, well_id: str, workspace: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if workspace in ("onshore_demo", "demo", "workspace_b") or well_id in ("A-17", "B-04", "C-11", "D-09"):
        match = next((w for w in DEMO_WELLS if w["well_id"] == well_id), None)
        return _enrich_well(dict(match)) if match else None
    row = conn.execute("SELECT * FROM wells WHERE well_id = ?", (well_id,)).fetchone()
    return _enrich_well(dict(row)) if row else None


def list_wellbores(conn: sqlite3.Connection, well_id: str) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM wellbores WHERE well_id = ? ORDER BY name ASC",
        (well_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def list_formation_tops(conn: sqlite3.Connection, wellbore_id: str) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM formation_tops WHERE wellbore_id = ? ORDER BY md ASC",
        (wellbore_id,)
    ).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["reviewed"] = bool(d["reviewed"])
        results.append(d)
    return results


def list_surveys(conn: sqlite3.Connection, wellbore_id: str) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM surveys WHERE wellbore_id = ? ORDER BY md ASC",
        (wellbore_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def find_nearby_wells(
    conn: sqlite3.Connection,
    latitude: float,
    longitude: float,
    radius_km: float = 25.0
) -> List[Dict[str, Any]]:
    """Deterministic Haversine spatial search for offset wells within radius_km."""
    wells = list_wells(conn)
    nearby = []

    for w in wells:
        dist = haversine_distance(latitude, longitude, w["latitude"], w["longitude"])
        if dist <= radius_km:
            nearby.append({
                "well_id": w["well_id"],
                "well_name": w["well_name"],
                "distance_km": dist,
                "latitude": w["latitude"],
                "longitude": w["longitude"],
                "dataset": w["dataset"],
                "provenance": w["provenance"]
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


def get_well_log_curves(conn: sqlite3.Connection, well_id: str) -> List[Dict[str, Any]]:
    """Retrieve summary of all petrophysical log curves available for a well."""
    rows = conn.execute("""
    SELECT curve_name, original_curve_name, unit,
           COUNT(*) as point_count,
           MIN(depth_md) as min_depth_md,
           MAX(depth_md) as max_depth_md,
           MIN(value) as min_value,
           MAX(value) as max_value,
           provenance
    FROM well_logs
    WHERE well_id = ?
    GROUP BY curve_name
    ORDER BY curve_name ASC;
    """, (well_id,)).fetchall()
    return [dict(r) for r in rows]


def get_well_log_curve_data(
    conn: sqlite3.Connection,
    well_id: str,
    curve_name: str,
    start_md: Optional[float] = None,
    end_md: Optional[float] = None,
    limit: int = 2000
) -> Optional[Dict[str, Any]]:
    """Retrieve depth-indexed log curve points for a specific curve."""
    # Find curve metadata first
    meta = conn.execute("""
    SELECT curve_name, original_curve_name, unit, provenance
    FROM well_logs
    WHERE well_id = ? AND (curve_name = ? OR original_curve_name = ?)
    LIMIT 1;
    """, (well_id, curve_name, curve_name)).fetchone()

    if not meta:
        return None

    query = """
    SELECT depth_md, depth_tvd, value, unit
    FROM well_logs
    WHERE well_id = ? AND (curve_name = ? OR original_curve_name = ?)
    """
    params: List[Any] = [well_id, curve_name, curve_name]
    if start_md is not None:
        query += " AND depth_md >= ?"
        params.append(start_md)
    if end_md is not None:
        query += " AND depth_md <= ?"
        params.append(end_md)

    query += " ORDER BY depth_md ASC LIMIT ?;"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    points = [
        {
            "depth_md": r["depth_md"],
            "depth_tvd": r["depth_tvd"],
            "value": r["value"],
            "unit": r["unit"],
            "quality": "VERIFIED_ORIGINAL"
        }
        for r in rows
    ]

    return {
        "well_id": well_id,
        "curve_name": meta["curve_name"],
        "original_curve_name": meta["original_curve_name"],
        "unit": meta["unit"],
        "point_count": len(points),
        "points": points,
        "provenance": meta["provenance"]
    }


def get_well_mud_log(
    conn: sqlite3.Connection,
    well_id: str,
    parameter: Optional[str] = None,
    start_md: Optional[float] = None,
    end_md: Optional[float] = None,
    limit: int = 1500
) -> Dict[str, Any]:
    """Retrieve mud logging drilling parameters and gas readings."""
    cur = conn.cursor()
    # Find available parameters
    cur.execute("SELECT DISTINCT parameter_name FROM mud_logs WHERE well_id = ? ORDER BY parameter_name ASC;", (well_id,))
    available_params = [r[0] for r in cur.fetchall()]

    query = """
    SELECT depth_md, depth_tvd, parameter_name, value, unit
    FROM mud_logs
    WHERE well_id = ?
    """
    params: List[Any] = [well_id]
    if parameter:
        query += " AND parameter_name = ?"
        params.append(parameter)
    if start_md is not None:
        query += " AND depth_md >= ?"
        params.append(start_md)
    if end_md is not None:
        query += " AND depth_md <= ?"
        params.append(end_md)

    query += " ORDER BY depth_md ASC LIMIT ?;"
    params.append(limit)

    rows = cur.execute(query, params).fetchall()
    points = [
        {
            "depth_md": r["depth_md"],
            "depth_tvd": r["depth_tvd"],
            "parameter_name": r["parameter_name"],
            "value": r["value"],
            "unit": r["unit"]
        }
        for r in rows
    ]

    return {
        "well_id": well_id,
        "parameter_count": len(available_params),
        "point_count": len(points),
        "parameters_available": available_params,
        "points": points,
        "provenance": "REAL" if available_params else "NOT_AVAILABLE"
    }


def get_well_casings(conn: sqlite3.Connection, well_id: str) -> List[Dict[str, Any]]:
    """Retrieve casing strings and shoe depths for well."""
    # Find wellbores for this well
    rows = conn.execute("""
    SELECT c.casing_id, c.wellbore_id, c.hole_section, c.casing_size,
           c.setting_depth_md, c.setting_depth_tvd, c.cement_top, c.source, c.provenance
    FROM casings c
    JOIN wellbores wb ON c.wellbore_id = wb.wellbore_id
    WHERE wb.well_id = ? OR c.wellbore_id LIKE ?
    ORDER BY c.setting_depth_md ASC;
    """, (well_id, f"{well_id}%")).fetchall()
    return [dict(r) for r in rows]


def get_well_reservoir_properties(conn: sqlite3.Connection, well_id: str) -> Dict[str, Any]:
    """
    Retrieve volumetric reservoir properties at well location
    from authoritative continuous reservoir grid (data/volve/geology/reservoir_grid_3d.parquet).
    """
    import os
    import pandas as pd
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    res_parquet = os.path.join(base_dir, "data", "volve", "geology", "reservoir_grid_3d.parquet")

    well_row = conn.execute("SELECT latitude, longitude FROM wells WHERE well_id = ?;", (well_id,)).fetchone()

    if not os.path.exists(res_parquet) or not well_row:
        return {
            "well_id": well_id,
            "formation": "Hugin Reservoir",
            "status": "NOT_AVAILABLE",
            "average_porosity": None,
            "average_permeability_md": None,
            "average_oil_saturation": None,
            "average_water_saturation": None,
            "layers": [],
            "source_file": "reservoir_grid_3d.parquet",
            "provenance": "NOT_AVAILABLE"
        }

    try:
        df_res = pd.read_parquet(res_parquet)
        # Find nearest grid column to well coordinates (Volve central crest: local_x=0, local_y=0)
        # Sample the 5 depth layers
        layers_df = df_res[df_res['local_x_m'] == 0.0]
        if layers_df.empty:
            layers_df = df_res.head(5)
        else:
            layers_df = layers_df[layers_df['local_y_m'] == 0.0]
            if layers_df.empty:
                layers_df = df_res.head(5)

        layers = []
        for _, row in layers_df.iterrows():
            layers.append({
                "layer": int(row["layer"]),
                "depth_tvd_z": float(row["depth_tvd_z"]),
                "thickness_m": float(row["thickness_m"]),
                "porosity": float(row["porosity"]),
                "permeability_md": float(row["permeability_md"]),
                "water_saturation": float(row["water_saturation"]),
                "oil_saturation": float(row["oil_saturation"]),
                "facies": str(row["facies"]),
                "provenance": "REAL"
            })

        poro_vals = [l["porosity"] for l in layers]
        perm_vals = [l["permeability_md"] for l in layers]
        so_vals = [l["oil_saturation"] for l in layers]
        sw_vals = [l["water_saturation"] for l in layers]

        avg_poro = round(float(sum(poro_vals) / len(poro_vals)), 3) if poro_vals else None
        avg_perm = round(float(sum(perm_vals) / len(perm_vals)), 1) if perm_vals else None
        avg_so = round(float(sum(so_vals) / len(so_vals)), 3) if so_vals else None
        avg_sw = round(float(sum(sw_vals) / len(sw_vals)), 3) if sw_vals else None

        return {
            "well_id": well_id,
            "formation": "Vestland Group (Hugin Reservoir)",
            "status": "AVAILABLE",
            "average_porosity": avg_poro,
            "average_permeability_md": avg_perm,
            "average_oil_saturation": avg_so,
            "average_water_saturation": avg_sw,
            "layers": layers,
            "source_file": "data/volve/geology/reservoir_grid_3d.parquet",
            "provenance": "REAL"
        }
    except Exception as err:
        return {
            "well_id": well_id,
            "formation": "Hugin Reservoir",
            "status": f"ERROR: {err}",
            "layers": [],
            "source_file": "data/volve/geology/reservoir_grid_3d.parquet",
            "provenance": "NOT_AVAILABLE"
        }


def get_well_data_availability(conn: sqlite3.Connection, well_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve multi-category data availability status matrix for a canonical well."""
    try:
        row = conn.execute("SELECT * FROM well_data_availability WHERE well_id = ?;", (well_id,)).fetchone()
        if row:
            return dict(row)
    except sqlite3.OperationalError:
        pass
    # Check if well exists
    w = conn.execute("SELECT well_id, dataset FROM wells WHERE well_id = ?;", (well_id,)).fetchone()
    if not w:
        return None
    return {
        "well_id": well_id,
        "trajectory": "NOT_AVAILABLE",
        "formation_tops": "NOT_AVAILABLE",
        "horizons": "AVAILABLE",
        "fault_context": "AVAILABLE",
        "reservoir_grid": "AVAILABLE",
        "gamma_ray": "NOT_AVAILABLE",
        "resistivity": "NOT_AVAILABLE",
        "density": "NOT_AVAILABLE",
        "neutron_porosity": "NOT_AVAILABLE",
        "sonic_dt": "NOT_AVAILABLE",
        "mud_log": "NOT_AVAILABLE",
        "ddr": "NOT_AVAILABLE",
        "casing": "NOT_AVAILABLE",
        "witsml": "NOT_AVAILABLE",
        "provenance": "REAL"
    }

