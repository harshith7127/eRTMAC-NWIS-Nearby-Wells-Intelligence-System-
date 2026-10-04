"""
NWIS Workspace Service — Manages separated Workspace A (Real Volve) and Workspace B (Synthetic Demo).
Ensures strict quarantine between authentic research data and simulated demo data.
"""

from typing import List, Optional, Dict, Any


WORKSPACES: Dict[str, Dict[str, Any]] = {
    "volve": {
        "id": "volve",
        "name": "Volve Field (North Sea Block 15/9)",
        "type": "REAL_VOLVE",
        "description": "Equinor open benchmark dataset for North Sea Block 15/9. Authentic directional surveys, lithology tops, Daily Drilling Reports, and real-time WITSML logs.",
        "crs": "ED50 UTM Zone 31N (EPSG:23031) -> WGS84 (EPSG:4326)",
        "center": {"latitude": 58.441636, "longitude": 1.887483},
        "bounds": {
            "min_latitude": 58.4200,
            "max_latitude": 58.4600,
            "min_longitude": 1.8500,
            "max_longitude": 1.9500
        },
        "provenance": "REAL",
        "well_count": 6,
        "formation_count": 10,
        "disclaimer": "Volve is authentic open research data from Equinor / Norwegian Offshore Directorate."
    },
    "onshore_demo": {
        "id": "onshore_demo",
        "name": "Demo Onshore Exploration Block (Simulated)",
        "type": "DEMO_ONSHORE",
        "description": "Synthetic exploration sandbox modeling an onshore basin with simulated pore pressures, swelling shale risks, and prospective wells.",
        "crs": "WGS84 (EPSG:4326)",
        "center": {"latitude": 27.5000, "longitude": 71.5000},
        "bounds": {
            "min_latitude": 27.4000,
            "max_latitude": 27.6000,
            "min_longitude": 71.4000,
            "max_longitude": 71.6000
        },
        "provenance": "SYNTHETIC",
        "well_count": 4,
        "formation_count": 6,
        "disclaimer": "DEMO DATA: All geological structures and well trajectories in this workspace are simulated and NOT real-world measurements."
    }
}


def list_workspaces() -> List[Dict[str, Any]]:
    """Return all available workspaces with metadata."""
    return list(WORKSPACES.values())


def get_workspace(workspace_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve workspace metadata by ID with canonical fallback mapping."""
    if not workspace_id:
        return WORKSPACES["volve"]
    normalized = workspace_id.lower().strip()
    if normalized in ("volve", "workspace_a", "real_volve"):
        return WORKSPACES["volve"]
    if normalized in ("onshore_demo", "demo", "workspace_b", "synthetic"):
        return WORKSPACES["onshore_demo"]
    return WORKSPACES.get(normalized)
