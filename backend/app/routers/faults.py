"""
NWIS Faults Router — Structural geological faults and 3D fault plane segments.
"""

from typing import List
from fastapi import APIRouter, HTTPException, Query

from ..schemas import FaultResponse
from ..services import fault_service

router = APIRouter(prefix="/faults", tags=["Structural Faults"])


@router.get("", response_model=List[FaultResponse])
def get_faults(workspace: str = Query("volve", description="Workspace identifier")):
    """List structural faults with strike, dip, throw, and 3D segment polylines."""
    return fault_service.list_faults(workspace)


@router.get("/{fault_id}", response_model=FaultResponse)
def get_fault(fault_id: str, workspace: str = Query("volve", description="Workspace identifier")):
    """Retrieve detailed fault model by ID."""
    fault = fault_service.get_fault(fault_id, workspace=workspace)
    if not fault:
        raise HTTPException(status_code=404, detail=f"Fault '{fault_id}' not found in workspace '{workspace}'.")
    return fault
