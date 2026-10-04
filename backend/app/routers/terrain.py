"""
NWIS Terrain Router — Bathymetric seabed and topographic surface elevations.
"""

from fastapi import APIRouter, Query

from ..schemas import TerrainResponse
from ..services import terrain_service

router = APIRouter(prefix="/terrain", tags=["Terrain & Bathymetry"])


@router.get("", response_model=TerrainResponse)
@router.get("/bathymetry", response_model=TerrainResponse)
def get_terrain(
    workspace: str = Query("volve", description="Workspace identifier"),
    resolution: int = Query(15, ge=5, le=51, description="Grid resolution")
):
    """Retrieve bathymetric elevation grid and datum metadata."""
    return terrain_service.get_terrain_data(workspace=workspace, resolution=resolution)
