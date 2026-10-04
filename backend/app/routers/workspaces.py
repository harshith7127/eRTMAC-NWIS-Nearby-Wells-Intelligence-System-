"""
NWIS Workspaces Router — Manages available workspaces (Workspace A: Volve, Workspace B: Demo Onshore).
"""

from typing import List
from fastapi import APIRouter, HTTPException

from ..schemas import WorkspaceResponse
from ..services import workspace_service

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
def get_workspaces():
    """Retrieve all available workspaces with boundary metadata and provenance status."""
    return workspace_service.list_workspaces()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str):
    """Retrieve specific workspace metadata."""
    ws = workspace_service.get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")
    return ws
