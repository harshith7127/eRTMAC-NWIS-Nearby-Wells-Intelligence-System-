"""
NWIS Reports Router — Retrieving Daily Drilling Reports and Evidence Highlights
"""

from typing import List, Optional
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import get_db
from ..schemas import ReportResponse, ReportDetailResponse
from ..services import report_service

router = APIRouter(tags=["Reports & DDRs"])


@router.get("/reports", response_model=List[ReportResponse])
def list_reports(
    wellbore_id: Optional[str] = Query(None, description="Filter reports by wellbore ID"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve list of drilling reports/DDRs."""
    return report_service.list_reports(db, wellbore_id=wellbore_id)


@router.get("/reports/{report_id:path}", response_model=ReportDetailResponse)
def get_report(report_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve single report with its verbatim text and associated event evidence spans."""
    report = report_service.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report with ID '{report_id}' not found")
    return report
