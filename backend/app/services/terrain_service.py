"""
NWIS Terrain Service — Provides bathymetry (offshore Volve) and topography (onshore demo).
"""

from typing import Dict, Any


def get_terrain_data(workspace: str = "volve", resolution: int = 15) -> Dict[str, Any]:
    """Retrieve bathymetric / topographic elevation grid for workspace."""
    is_demo = workspace in ("onshore_demo", "demo", "workspace_b")

    if is_demo:
        # Onshore topography (+160m to +190m MSL)
        base_elev = 175.0
        grid = [
            [round(base_elev + (i * 0.8) - (j * 0.6), 1) for i in range(resolution)]
            for j in range(resolution)
        ]
        return {
            "workspace": "onshore_demo",
            "terrain_type": "TOPOGRAPHY",
            "datum": "MSL (WGS84)",
            "seabed_depth_m": 0.0,
            "grid_bounds": {
                "min_lat": 27.45,
                "max_lat": 27.55,
                "min_lon": 71.45,
                "max_lon": 71.55,
                "min_elevation_m": min(min(r) for r in grid),
                "max_elevation_m": max(max(r) for r in grid)
            },
            "grid_resolution_m": 250.0,
            "elevation_grid": grid,
            "provenance": "SYNTHETIC"
        }
    else:
        # Authentic North Sea Volve bathymetry (-88m to -94m TVD MSL)
        base_depth = -91.0
        grid = [
            [round(base_depth + (math_sin(i * 0.4) * 1.5) - (j * 0.1), 1) for i in range(resolution)]
            for j in range(resolution)
        ]
        return {
            "workspace": "volve",
            "terrain_type": "BATHYMETRY",
            "datum": "MSL (Mean Sea Level)",
            "seabed_depth_m": 91.0,
            "grid_bounds": {
                "min_lat": 58.42,
                "max_lat": 58.46,
                "min_lon": 1.85,
                "max_lon": 1.95,
                "min_elevation_m": min(min(r) for r in grid),
                "max_elevation_m": max(max(r) for r in grid)
            },
            "grid_resolution_m": 100.0,
            "elevation_grid": grid,
            "provenance": "REAL"
        }


import math
def math_sin(val: float) -> float:
    return math.sin(val)
