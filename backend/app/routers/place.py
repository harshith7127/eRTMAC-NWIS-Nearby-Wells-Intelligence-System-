"""
NWIS Place Router — Endpoints for Geographic Place Query, Trajectory Proximity & Evidence Retrieval
"""

from typing import Optional, Dict, Any
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import get_db
from ..services import place_service

router = APIRouter(tags=["Place Query & Area Map"])


@router.get("/place")
def get_place_query(
    latitude: Optional[float] = Query(None, description="Query latitude in WGS84 decimal degrees"),
    longitude: Optional[float] = Query(None, description="Query longitude in WGS84 decimal degrees"),
    lat: Optional[float] = Query(None, description="Alias for latitude"),
    lon: Optional[float] = Query(None, description="Alias for longitude"),
    radius_km: Optional[float] = Query(None, description="Search radius in kilometers (default: 2.0)", ge=0.05, le=50.0),
    radius: Optional[float] = Query(None, description="Alias for radius_km"),
    depth_m: Optional[float] = Query(None, description="Optional target depth filter (m)", ge=0.0, le=12000.0),
    depth: Optional[float] = Query(None, description="Alias for depth_m"),
    dataset: Optional[str] = Query("VOLVE_PUBLIC", description="Dataset filter (VOLVE_PUBLIC, SYNTHETIC_DEMO, ALL)"),
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. LOSS, KICK, STICKY_HOLE)"),
    formation_name: Optional[str] = Query(None, description="Filter by formation name substring"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Execute Place Query: Ingests geographic location and returns nearby wells,
    subsurface trajectory closest approaches, formations observed around depth,
    drilling events, casing, mud programs, data gaps, and provenance summary.
    """
    effective_lat = latitude if latitude is not None else lat
    effective_lon = longitude if longitude is not None else lon

    if effective_lat is None or effective_lon is None:
        # Default to Volve Field center (Well 15/9-F-12)
        effective_lat = 58.441636
        effective_lon = 1.887483

    # Validate coordinate ranges
    if not (-90.0 <= effective_lat <= 90.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90 degrees")
    if not (-180.0 <= effective_lon <= 180.0):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180 degrees")

    effective_radius = radius_km if radius_km is not None else (radius if radius is not None else 2.0)
    if effective_radius > 50.0:
        raise HTTPException(status_code=400, detail="Radius exceeds maximum allowable limit of 50 km")

    effective_depth = depth_m if depth_m is not None else depth

    return place_service.execute_place_query(
        conn=db,
        latitude=effective_lat,
        longitude=effective_lon,
        radius_km=effective_radius,
        depth_m=effective_depth,
        dataset=dataset,
        event_type=event_type,
        formation_name=formation_name
    )
