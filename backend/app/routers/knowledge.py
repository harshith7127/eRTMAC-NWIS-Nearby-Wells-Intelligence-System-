"""
NWIS Knowledge Repository & Evidence Traceability Router — Phase 7
Exposes endpoints for knowledge search, event detail, report detail, active-well context, and CSV export.
"""

from typing import Optional
import sqlite3
from fastapi import APIRouter, Depends, Query, HTTPException, Response

from ..db import get_db
from ..schemas import (
    KnowledgeSearchResponse,
    KnowledgeEventDetailResponse,
    KnowledgeReportDetailResponse,
    ActiveWellKnowledgeContextResponse
)
from ..services import knowledge_service

router = APIRouter(prefix="/knowledge", tags=["Knowledge Repository & Evidence"])


@router.get("/search", response_model=KnowledgeSearchResponse)
def search_knowledge_repository(
    query: Optional[str] = Query(None, description="Search term across reports, descriptions, and actions"),
    well_id: Optional[str] = Query(None, description="Filter by well ID"),
    wellbore_id: Optional[str] = Query(None, description="Filter by wellbore ID"),
    formation: Optional[str] = Query(None, description="Filter by formation name"),
    event_type: Optional[str] = Query(None, description="Filter by hazard/event type, e.g. LOSS, KICK, STICKY_HOLE"),
    document_type: Optional[str] = Query(None, description="Filter by document type (DDR, REPORT, WCR)"),
    depth_min: Optional[float] = Query(None, description="Minimum depth (MD)"),
    depth_max: Optional[float] = Query(None, description="Maximum depth (MD)"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    reviewed_only: bool = Query(False, description="Filter only human-reviewed events"),
    provenance: Optional[str] = Query(None, description="Filter by provenance (REAL, DERIVED, SYNTHETIC)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Search across canonical drilling knowledge, historical events, DDR reports, and evidence spans.
    """
    return knowledge_service.search_knowledge(
        conn=db,
        query=query,
        well_id=well_id,
        wellbore_id=wellbore_id,
        formation=formation,
        event_type=event_type,
        document_type=document_type,
        depth_min=depth_min,
        depth_max=depth_max,
        date_from=date_from,
        date_to=date_to,
        reviewed_only=reviewed_only,
        provenance=provenance,
        limit=limit,
        offset=offset
    )


@router.get("/events/{event_id}", response_model=KnowledgeEventDetailResponse)
def get_event_detail(
    event_id: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Retrieve comprehensive knowledge detail, linked DDR report, and source evidence trace for a specific event.
    """
    detail = knowledge_service.get_knowledge_event_detail(db, event_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found in canonical repository.")
    return detail


@router.get("/reports/{report_id}", response_model=KnowledgeReportDetailResponse)
def get_report_detail(
    report_id: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Retrieve full document metadata, text, and extracted evidence spans for a Daily Drilling Report (DDR).
    """
    detail = knowledge_service.get_knowledge_report_detail(db, report_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found in canonical repository.")
    return detail


@router.get("/context", response_model=ActiveWellKnowledgeContextResponse)
def get_active_well_context(
    wellbore_id: str = Query("15/9-F-12-WB1", description="Target wellbore ID"),
    current_md: float = Query(2750.0, description="Current drilling measured depth in meters (MD)"),
    radius_km: float = Query(2.0, ge=0.1, le=50.0, description="Nearby search radius in km"),
    lookahead_m: float = Query(300.0, ge=10.0, le=2000.0, description="Look-ahead window in meters (MD)"),
    dataset: Optional[str] = Query("VOLVE_PUBLIC", description="Dataset scope (VOLVE_PUBLIC, ALL)"),
    include_unreviewed: bool = Query(False, description="Include unreviewed events in lookahead evaluation"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Aggregates active-well drilling position, nearby well coverage, historical events,
    Phase 4 K-of-N lookahead alerts, casing/mud records, and explicit data gaps into an engineer knowledge context.
    """
    return knowledge_service.get_active_well_knowledge_context(
        conn=db,
        wellbore_id=wellbore_id,
        current_md=current_md,
        radius_km=radius_km,
        lookahead_m=lookahead_m,
        dataset=dataset,
        include_unreviewed=include_unreviewed
    )


@router.get("/export/csv")
def export_knowledge_csv(
    query: Optional[str] = Query(None),
    well_id: Optional[str] = Query(None),
    formation: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    reviewed_only: bool = Query(False),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Download filtered knowledge events and historical practices as a CSV file.
    """
    csv_data = knowledge_service.export_knowledge_events_csv(
        conn=db,
        query=query,
        well_id=well_id,
        formation=formation,
        event_type=event_type,
        reviewed_only=reviewed_only
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nwis-knowledge-events.csv"}
    )
