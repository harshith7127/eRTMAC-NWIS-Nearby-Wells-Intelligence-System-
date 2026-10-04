"""
NWIS Geology Router — Click-anywhere subsurface geology interrogation and formation probing.
"""

from typing import Optional
import sqlite3
from fastapi import APIRouter, Depends, Query, Body

from ..db import get_db
from ..schemas import GeologyProbeResponse, HorizonPointResponse, FaultStickResponse
from ..services import geology_probe_service

router = APIRouter(prefix="/geology", tags=["Geology & Subsurface Probing"])


@router.get("/probe", response_model=GeologyProbeResponse)
def probe_geology_get(
    latitude: float = Query(..., description="Surface latitude in decimal degrees"),
    longitude: float = Query(..., description="Surface longitude in decimal degrees"),
    depth_m: float = Query(..., description="Interrogation depth (TVD by default)", ge=0.0),
    depth_basis: str = Query("TVD", description="Depth reference basis (TVD or MD)"),
    workspace: str = Query("volve", description="Workspace identifier"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Interrogate subsurface geology at given coordinate and depth."""
    return geology_probe_service.probe_geology(
        conn=db,
        latitude=latitude,
        longitude=longitude,
        depth_m=depth_m,
        depth_basis=depth_basis,
        workspace=workspace
    )


@router.post("/probe", response_model=GeologyProbeResponse)
def probe_geology_post(
    payload: dict = Body(..., description="Interrogation coordinates and depth"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Interrogate subsurface geology via JSON POST payload."""
    lat = float(payload.get("latitude", payload.get("lat", 58.4416)))
    lon = float(payload.get("longitude", payload.get("lon", 1.8875)))
    depth = float(payload.get("depth_m", payload.get("depth", 2000.0)))
    basis = payload.get("depth_basis", "TVD")
    ws = payload.get("workspace", "volve")

    return geology_probe_service.probe_geology(
        conn=db,
        latitude=lat,
        longitude=lon,
        depth_m=depth,
        depth_basis=basis,
        workspace=ws
    )


@router.get("/horizons/points", response_model=list[HorizonPointResponse])
def get_horizon_points(
    horizon_id: str = Query("top_hugin", description="Horizon identifier (e.g., top_hugin, top_shetland)"),
    limit: int = Query(500, ge=1, le=5000, description="Max points to return"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve continuous 3D (X, Y, Z) point cloud for a specific interpreted geological horizon."""
    cur = db.cursor()
    cur.execute("""
    SELECT point_id, horizon_id, horizon_name, group_name, easting, northing,
           tvd, local_x, local_y, local_z, lithology, provenance
    FROM geological_horizons
    WHERE horizon_id = ?
    LIMIT ?;
    """, (horizon_id, limit))
    rows = cur.fetchall()
    return [
        HorizonPointResponse(
            point_id=r["point_id"],
            horizon_id=r["horizon_id"],
            horizon_name=r["horizon_name"],
            group_name=r["group_name"],
            easting=r["easting"],
            northing=r["northing"],
            tvd=r["tvd"],
            local_x=r["local_x"],
            local_y=r["local_y"],
            local_z=r["local_z"],
            lithology=r["lithology"],
            provenance=r["provenance"]
        )
        for r in rows
    ]


@router.get("/faults/segments", response_model=list[FaultStickResponse])
def get_fault_segments(
    fault_id: Optional[str] = Query(None, description="Optional fault filter"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve official 3D structural fault sticks and displacement parameters."""
    cur = db.cursor()
    if fault_id:
        cur.execute("""
        SELECT segment_id, fault_id, fault_name, fault_type, stick_id,
               top_easting, top_northing, top_tvd,
               base_easting, base_northing, base_tvd,
               strike_deg, dip_deg, throw_m, provenance
        FROM fault_segments
        WHERE fault_id = ?
        ORDER BY stick_id;
        """, (fault_id,))
    else:
        cur.execute("""
        SELECT segment_id, fault_id, fault_name, fault_type, stick_id,
               top_easting, top_northing, top_tvd,
               base_easting, base_northing, base_tvd,
               strike_deg, dip_deg, throw_m, provenance
        FROM fault_segments
        ORDER BY fault_id, stick_id;
        """)
    rows = cur.fetchall()
    return [
        FaultStickResponse(
            segment_id=r["segment_id"],
            fault_id=r["fault_id"],
            fault_name=r["fault_name"],
            fault_type=r["fault_type"],
            stick_id=r["stick_id"],
            top_easting=r["top_easting"],
            top_northing=r["top_northing"],
            top_tvd=r["top_tvd"],
            base_easting=r["base_easting"],
            base_northing=r["base_northing"],
            base_tvd=r["base_tvd"],
            strike_deg=r["strike_deg"],
            dip_deg=r["dip_deg"],
            throw_m=r["throw_m"],
            provenance=r["provenance"]
        )
        for r in rows
    ]
