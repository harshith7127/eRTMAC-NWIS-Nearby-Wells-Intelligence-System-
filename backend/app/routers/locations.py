"""
NWIS Locations Router — Explainable prospective well location analysis and risk checklists.
Conforms strictly to Rule 5: NO ARBITRARY COMPOSITE SCORES.
"""

from typing import Optional
import sqlite3
from fastapi import APIRouter, Depends, Query, Body

from ..db import get_db
from ..schemas import LocationAnalysisResponse
from ..services import location_analysis_service

router = APIRouter(prefix="/locations", tags=["Location Analysis"])


@router.post("/analyze", response_model=LocationAnalysisResponse)
def analyze_location_post(
    payload: dict = Body(..., description="Location analysis parameters"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Run explainable location analysis for proposed drilling coordinate.
    Evaluates nearby well control, stratigraphy, structural faults, bathymetry, and hazards.
    """
    lat = float(payload.get("latitude", payload.get("lat", 58.441636)))
    lon = float(payload.get("longitude", payload.get("lon", 1.887483)))
    target_depth = float(payload.get("target_depth_m", payload.get("target_depth", 3100.0)))
    target_fm = payload.get("target_formation")
    radius_km = float(payload.get("radius_km", 5.0))
    ws = payload.get("workspace", "volve")

    return location_analysis_service.analyze_proposed_location(
        conn=db,
        latitude=lat,
        longitude=lon,
        target_depth_m=target_depth,
        target_formation=target_fm,
        radius_km=radius_km,
        workspace=ws
    )


@router.get("/analyze", response_model=LocationAnalysisResponse)
def analyze_location_get(
    latitude: float = Query(..., description="Surface latitude in decimal degrees"),
    longitude: float = Query(..., description="Surface longitude in decimal degrees"),
    target_depth_m: float = Query(..., description="Target well total depth in meters", ge=100.0),
    target_formation: Optional[str] = Query(None, description="Nominated target formation"),
    radius_km: float = Query(5.0, description="Offset search radius in kilometers", ge=0.5, le=50.0),
    workspace: str = Query("volve", description="Workspace identifier"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Run explainable location analysis via GET query parameters."""
    return location_analysis_service.analyze_proposed_location(
        conn=db,
        latitude=latitude,
        longitude=longitude,
        target_depth_m=target_depth_m,
        target_formation=target_formation,
        radius_km=radius_km,
        workspace=workspace
    )
