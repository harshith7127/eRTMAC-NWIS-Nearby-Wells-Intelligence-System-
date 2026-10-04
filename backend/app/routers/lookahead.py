"""
NWIS Look-Ahead Rule Engine Router — Offset Evidence Decision Support
Exposes GET /api/offset/lookahead for deterministic, explainable look-ahead risk intelligence.
"""

from typing import Optional
import sqlite3
from fastapi import APIRouter, Depends, Query
from ..db import get_db
from ..schemas import LookaheadResponse
from ..services import lookahead_service

router = APIRouter(tags=["Look-Ahead Rule Engine"])


@router.get("/offset/lookahead", response_model=LookaheadResponse)
def get_lookahead_evidence(
    wellbore_id: str = Query(..., description="Target active wellbore ID"),
    current_md: float = Query(..., description="Current active drilling measured depth in meters (MD)"),
    lookahead_m: float = Query(300.0, description="Look-ahead depth window in meters (MD)", ge=10.0, le=2000.0),
    radius_km: float = Query(2.0, description="Geographic search radius in km", ge=0.1, le=50.0),
    event_type: Optional[str] = Query(None, description="Optional hazard filter, e.g. LOSS, KICK, STICKY_HOLE"),
    include_unreviewed: bool = Query(False, description="Whether to include unreviewed historical events in driving alerts"),
    dataset: Optional[str] = Query("VOLVE_PUBLIC", description="Dataset scope: VOLVE_PUBLIC, SYNTHETIC_DEMO, ALL"),
    formation: Optional[str] = Query(None, description="Optional formation override"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Evaluates historical offset evidence ahead of the active well within a configurable look-ahead window.
    Strictly deterministic K-of-N evidence logic based on canonical formation alignment and relative depth.
    """
    return lookahead_service.evaluate_lookahead(
        conn=db,
        wellbore_id=wellbore_id,
        current_md=current_md,
        lookahead_m=lookahead_m,
        radius_km=radius_km,
        event_type=event_type,
        include_unreviewed=include_unreviewed,
        dataset=dataset,
        formation_override=formation
    )
