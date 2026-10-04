"""
NWIS Health Router — System Status and DB Health Probe
"""

from fastapi import APIRouter, Depends
from ..db import get_db
from ..schemas import HealthResponse
import sqlite3

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health(db: sqlite3.Connection = Depends(get_db)):
    try:
        row = db.execute("SELECT COUNT(*) as count FROM wells").fetchone()
        well_count = row["count"] if row else 0
        return HealthResponse(
            status="healthy",
            database="connected",
            dataset="VOLVE_PUBLIC",
            version="1.0.0"
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            database=f"error: {str(e)}",
            dataset="UNKNOWN",
            version="1.0.0"
        )
