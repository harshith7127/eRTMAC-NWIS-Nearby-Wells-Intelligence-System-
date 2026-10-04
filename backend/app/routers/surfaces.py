"""
NWIS Surfaces Router — Geological formation horizons and 3D regular metric grids.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from ..schemas import SurfaceSummaryResponse, SurfaceGridResponse
from ..services import surface_service

router = APIRouter(prefix="/surfaces", tags=["Geological Surfaces"])


@router.get("", response_model=List[SurfaceSummaryResponse])
def get_surfaces(workspace: str = Query("volve", description="Workspace identifier (volve or onshore_demo)")):
    """List available geological horizon surfaces with average depth, thickness, and lithology."""
    return surface_service.list_surfaces(workspace)


@router.get("/{surface_id}", response_model=SurfaceGridResponse)
def get_surface_grid(
    surface_id: str,
    workspace: str = Query("volve", description="Workspace identifier"),
    resolution: int = Query(21, ge=5, le=51, description="Grid resolution (points per dimension)")
):
    """Retrieve 2D regular metric depth grid for 3D visualization and clipping."""
    grid = surface_service.get_surface_grid(surface_id, workspace=workspace, resolution=resolution)
    if not grid:
        raise HTTPException(status_code=404, detail=f"Surface '{surface_id}' not found in workspace '{workspace}'.")
    return grid
