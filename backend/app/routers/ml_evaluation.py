"""
NWIS ML Evaluation & Backtesting Router — Phase 6
Exposes read-only endpoints for offline ML evaluation, Leave-One-Well-Out backtesting metrics,
dataset inspection, feature lineage, and model cards.
"""

from typing import Optional, List, Dict, Any
import sqlite3
from fastapi import APIRouter, Depends, Query

from ..db import get_db
from ..schemas import (
    MLStatusResponse,
    DatasetSummaryResponse,
    MLEvaluationResponse,
    FeatureLineageInfo,
    ModelCardResponse
)
from ..services.ml_dataset_service import (
    build_evaluation_dataset,
    FEATURE_LINEAGE
)
from ..services.ml_evaluation_service import (
    run_full_ml_evaluation,
    get_model_card
)

router = APIRouter(prefix="/ml", tags=["ML Evaluation & Backtesting"])


@router.get("/status", response_model=MLStatusResponse)
def get_ml_status(
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns high-level status of the offline ML evaluation layer.
    Explicitly indicates whether models beat the Phase 4 rule baseline.
    """
    eval_res = run_full_ml_evaluation(db)
    return {
        "model_status": eval_res["model_status"],
        "status_reason": eval_res["status_reason"],
        "beats_rule_baseline": eval_res["beats_rule_baseline"],
        "evaluation_method": eval_res["evaluation_method"],
        "dataset_scope": "VOLVE_PUBLIC_PROTOTYPE",
        "oil_india_transfer_limit": "Volve is a North Sea public prototype dataset and does not transfer to Oil India operational formations.",
        "timestamp": eval_res["timestamp"]
    }


@router.get("/dataset", response_model=DatasetSummaryResponse)
def get_evaluation_dataset_summary(
    interval_size_m: float = Query(30.0, description="Interval discretization step in meters", ge=10.0, le=100.0),
    prediction_horizon_m: float = Query(100.0, description="Prediction horizon in meters ahead", ge=30.0, le=500.0),
    target_event_type: Optional[str] = Query(None, description="Optional hazard type filter"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns summary metadata of the tabular 30m discretization evaluation dataset.
    """
    _, metadata = build_evaluation_dataset(
        db,
        interval_size_m=interval_size_m,
        prediction_horizon_m=prediction_horizon_m,
        target_event_type=target_event_type
    )
    return metadata


@router.get("/dataset/rows")
def get_evaluation_dataset_rows(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    well_id: Optional[str] = Query(None, description="Filter by well ID"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns paginated tabular rows from the 30m discretized evaluation dataset.
    """
    rows, metadata = build_evaluation_dataset(db)
    if well_id:
        rows = [r for r in rows if r["well_id"] == well_id]
    
    total = len(rows)
    paged = rows[offset: offset + limit]
    return {
        "total_rows": total,
        "offset": offset,
        "limit": limit,
        "rows": paged,
        "provenance": "REAL"
    }


@router.get("/evaluation", response_model=MLEvaluationResponse)
def get_evaluation_results(
    interval_size_m: float = Query(30.0, description="Interval size in meters", ge=10.0, le=100.0),
    prediction_horizon_m: float = Query(100.0, description="Prediction horizon in meters", ge=30.0, le=500.0),
    target_event_type: Optional[str] = Query(None, description="Optional hazard target filter"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Executes full offline Leave-One-Well-Out Cross-Validation (LOWOCV) evaluation
    and returns comparative metrics for Baselines vs ML Models.
    """
    return run_full_ml_evaluation(
        db,
        interval_size_m=interval_size_m,
        prediction_horizon_m=prediction_horizon_m,
        target_event_type=target_event_type
    )


@router.get("/features", response_model=List[FeatureLineageInfo])
def get_feature_lineage():
    """
    Returns documented feature schema, calculation methods, depth basis, and leakage safeguards.
    """
    return FEATURE_LINEAGE


@router.get("/model-card", response_model=ModelCardResponse)
def get_model_card_document(
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns comprehensive Model Card document for Phase 6 evaluation.
    """
    return get_model_card(db)
