"""
NWIS Reservoirs Router — Hydrocarbon reservoir bodies, net pay, and fluid contacts.
"""

from typing import List
from fastapi import APIRouter, HTTPException, Query

from ..schemas import ReservoirResponse
from ..services import reservoir_service

router = APIRouter(prefix="/reservoirs", tags=["Reservoirs"])


@router.get("", response_model=List[ReservoirResponse])
def get_reservoirs(workspace: str = Query("volve", description="Workspace identifier")):
    """List reservoir bodies with porosity, permeability, and oil-water contacts."""
    return reservoir_service.list_reservoirs(workspace)


@router.get("/{reservoir_id}", response_model=ReservoirResponse)
def get_reservoir(reservoir_id: str, workspace: str = Query("volve", description="Workspace identifier")):
    """Retrieve reservoir detail by ID."""
    res = reservoir_service.get_reservoir(reservoir_id, workspace=workspace)
    if not res:
        raise HTTPException(status_code=404, detail=f"Reservoir '{reservoir_id}' not found in workspace '{workspace}'.")
    return res
