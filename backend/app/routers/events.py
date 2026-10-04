"""
NWIS Events Router — Event Search, Evidence Retrieval, and Verification Workflow
"""

from typing import List, Optional
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import get_db
from ..schemas import EventResponse, EventReviewUpdate
from ..services import event_service

router = APIRouter(tags=["Events & Evidence"])


@router.get("/events/search", response_model=List[EventResponse])
def search_events(
    wellbore_id: Optional[str] = Query(None, description="Filter by wellbore ID"),
    well_id: Optional[str] = Query(None, description="Filter by well ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. LOSS, KICK, STICKY_HOLE)"),
    formation_name: Optional[str] = Query(None, description="Filter by formation name substring"),
    min_md: Optional[float] = Query(None, description="Minimum measured depth (m)"),
    max_md: Optional[float] = Query(None, description="Maximum measured depth (m)"),
    reviewed: Optional[bool] = Query(None, description="Filter by human review status"),
    excluded: Optional[bool] = Query(None, description="Filter by calculation exclusion status"),
    provenance: Optional[str] = Query(None, description="Filter by provenance (REAL, SYNTHETIC, etc.)"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Search drilling events/incidents across multiple dimensions."""
    return event_service.search_events(
        db,
        wellbore_id=wellbore_id,
        well_id=well_id,
        event_type=event_type,
        formation_name=formation_name,
        min_md=min_md,
        max_md=max_md,
        reviewed=reviewed,
        excluded=excluded,
        provenance=provenance
    )


@router.patch("/events/{event_id:path}/review", response_model=EventResponse)
def review_event(event_id: str, update: EventReviewUpdate, db: sqlite3.Connection = Depends(get_db)):
    """Update human verification status (reviewed: true/false) without altering provenance or lineage."""
    updated = event_service.update_event_review(db, event_id, update.reviewed)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Event with ID '{event_id}' not found")
    return updated


@router.get("/events/{event_id:path}", response_model=EventResponse)
def get_event(event_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve full event record with evidence references."""
    event = event_service.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event with ID '{event_id}' not found")
    return event
