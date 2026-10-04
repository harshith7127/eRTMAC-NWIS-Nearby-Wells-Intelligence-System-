"""
NWIS Offset Events Router — Cross-Well Formation and Depth-Aligned Evidence Queries
Exposes GET /api/offset/events for retrieving historical drilling events by Formation + Relative Depth Below Top.
"""

from typing import Optional
import sqlite3
from fastapi import APIRouter, Depends, Query
from ..db import get_db
from ..schemas import OffsetEventsQueryResponse
from ..services import offset_service

router = APIRouter(tags=["Stratigraphic Offset Intelligence"])


@router.get("/offset/events", response_model=OffsetEventsQueryResponse)
def get_offset_events(
    formation: str = Query(..., description="Target canonical or raw formation name, e.g. 'Upper Hordaland Shale' or 'Hugin'"),
    depth_below_top: float = Query(..., description="Target depth below formation top in meters (MD)"),
    tolerance: float = Query(50.0, description="Relative depth tolerance window (± meters)", ge=1.0, le=1000.0),
    event_type: Optional[str] = Query(None, description="Filter by event type (LOSS, KICK, STICKY_HOLE)"),
    dataset: Optional[str] = Query(None, description="Dataset filter: VOLVE_PUBLIC, SYNTHETIC_DEMO, ALL"),
    reviewed: Optional[bool] = Query(None, description="Filter by review status"),
    latitude: Optional[float] = Query(None, description="Optional center latitude for proximity filtering"),
    longitude: Optional[float] = Query(None, description="Optional center longitude for proximity filtering"),
    radius_km: Optional[float] = Query(None, description="Optional search radius in km if latitude/longitude provided", ge=0.1, le=500.0),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Retrieve historical drilling evidence across wells aligned by common geological formation
    and relative depth below formation top, with optional geographic proximity constraint.
    """
    return offset_service.query_offset_events(
        conn=db,
        formation=formation,
        depth_below_top=depth_below_top,
        tolerance=tolerance,
        event_type=event_type,
        dataset=dataset,
        reviewed=reviewed,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km
    )
