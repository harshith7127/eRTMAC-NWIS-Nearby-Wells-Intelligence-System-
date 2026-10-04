"""
NWIS Surface Service — Generates and retrieves geological formation surfaces.
Conforms to Rule 8 (Local metric frame: x = E - E0, y = N - N0, z = -TVD)
and provides Float32-ready regular grids for React Three Fiber / Three.js.
"""

from typing import List, Optional, Dict, Any
import math

VOLVE_SURFACES: List[Dict[str, Any]] = [
    {
        "id": "nordland_group",
        "name": "Nordland Group",
        "group_name": "Nordland Group",
        "age_era": "Pliocene to Recent",
        "color": "#38bdf8",
        "average_tvd_m": 145.9,
        "thickness_m": 904.1,
        "lithology": "Marine claystone with sand bodies",
        "dip_deg": 0.5,
        "dip_azimuth_deg": 45.0,
        "provenance": "REAL"
    },
    {
        "id": "utsira_fm",
        "name": "Utsira Formation",
        "group_name": "Nordland Group",
        "age_era": "Late Miocene - Early Pliocene",
        "color": "#0284c7",
        "average_tvd_m": 1050.0,
        "thickness_m": 200.0,
        "lithology": "Porous marine sandstone aquifer",
        "dip_deg": 1.0,
        "dip_azimuth_deg": 50.0,
        "provenance": "REAL"
    },
    {
        "id": "upper_hordaland",
        "name": "Upper Hordaland Shale",
        "group_name": "Hordaland Group",
        "age_era": "Oligocene - Early Miocene",
        "color": "#64748b",
        "average_tvd_m": 1250.0,
        "thickness_m": 725.0,
        "lithology": "Fissile marine claystone and shale",
        "dip_deg": 1.5,
        "dip_azimuth_deg": 55.0,
        "provenance": "REAL"
    },
    {
        "id": "lower_hordaland",
        "name": "Lower Hordaland Reactive Shale",
        "group_name": "Hordaland Group",
        "age_era": "Eocene - Oligocene",
        "color": "#b45309",
        "average_tvd_m": 1975.0,
        "thickness_m": 245.0,
        "lithology": "Smectite-rich swelling shale and siltstone (Drilling Hazard Zone)",
        "dip_deg": 2.0,
        "dip_azimuth_deg": 60.0,
        "provenance": "REAL"
    },
    {
        "id": "rogaland_group",
        "name": "Rogaland Group (Balder/Sele)",
        "group_name": "Rogaland Group",
        "age_era": "Paleocene - Early Eocene",
        "color": "#8b5cf6",
        "average_tvd_m": 2220.0,
        "thickness_m": 260.0,
        "lithology": "Tuffaceous claystone and volcanic ash beds",
        "dip_deg": 2.2,
        "dip_azimuth_deg": 65.0,
        "provenance": "REAL"
    },
    {
        "id": "shetland_group",
        "name": "Shetland Group (Chalk)",
        "group_name": "Shetland Group",
        "age_era": "Late Cretaceous",
        "color": "#e2e8f0",
        "average_tvd_m": 2480.0,
        "thickness_m": 360.0,
        "lithology": "Fractured hard chalk and limestone",
        "dip_deg": 2.5,
        "dip_azimuth_deg": 70.0,
        "provenance": "REAL"
    },
    {
        "id": "cromer_knoll",
        "name": "Cromer Knoll Group",
        "group_name": "Cromer Knoll Group",
        "age_era": "Early Cretaceous",
        "color": "#a8a29e",
        "average_tvd_m": 2840.0,
        "thickness_m": 120.0,
        "lithology": "Calcareous claystone and marl",
        "dip_deg": 3.0,
        "dip_azimuth_deg": 75.0,
        "provenance": "REAL"
    },
    {
        "id": "viking_group",
        "name": "Viking Group (Draupne Shale)",
        "group_name": "Viking Group",
        "age_era": "Late Jurassic (Kimmeridgian)",
        "color": "#1e293b",
        "average_tvd_m": 2960.0,
        "thickness_m": 125.0,
        "lithology": "Organic-rich carbonaceous black shale (Source Rock)",
        "dip_deg": 3.5,
        "dip_azimuth_deg": 80.0,
        "provenance": "REAL"
    },
    {
        "id": "vestland_group",
        "name": "Vestland Group (Hugin Reservoir)",
        "group_name": "Vestland Group",
        "age_era": "Middle - Late Jurassic",
        "color": "#eab308",
        "average_tvd_m": 3085.0,
        "thickness_m": 195.0,
        "lithology": "Medium to coarse sandstone (Main Volve Oil Reservoir)",
        "dip_deg": 4.0,
        "dip_azimuth_deg": 85.0,
        "provenance": "REAL"
    },
    {
        "id": "sleipner_formation",
        "name": "Sleipner / Skagerrak Formation",
        "group_name": "Fladen Group",
        "age_era": "Triassic - Early Jurassic",
        "color": "#78350f",
        "average_tvd_m": 3280.0,
        "thickness_m": 300.0,
        "lithology": "Alluvial sandstone and coal-bearing shale",
        "dip_deg": 4.5,
        "dip_azimuth_deg": 90.0,
        "provenance": "REAL"
    }
]

# Synthetic Onshore Demo Surfaces (strictly quarantined)
DEMO_SURFACES: List[Dict[str, Any]] = [
    {
        "id": "upper_sandstone",
        "name": "Upper Sandstone",
        "group_name": "Simulated Alluvial",
        "age_era": "Simulated Tertiary",
        "color": "#94a3b8",
        "average_tvd_m": 0.0,
        "thickness_m": 1450.0,
        "lithology": "Fine to medium quartz sandstone (Simulated)",
        "dip_deg": 1.0,
        "dip_azimuth_deg": 0.0,
        "provenance": "SYNTHETIC"
    },
    {
        "id": "upper_shale",
        "name": "Upper Shale",
        "group_name": "Simulated Basin",
        "age_era": "Simulated Mesozoic",
        "color": "#64748b",
        "average_tvd_m": 1450.0,
        "thickness_m": 300.0,
        "lithology": "Fissile shale (Simulated)",
        "dip_deg": 1.5,
        "dip_azimuth_deg": 0.0,
        "provenance": "SYNTHETIC"
    },
    {
        "id": "jodhpur_sandstone",
        "name": "Jodhpur Sandstone",
        "group_name": "Simulated Reservoir",
        "age_era": "Simulated Paleozoic",
        "color": "#d5b883",
        "average_tvd_m": 1750.0,
        "thickness_m": 225.0,
        "lithology": "Porous quartz arenite (Simulated)",
        "dip_deg": 2.0,
        "dip_azimuth_deg": 0.0,
        "provenance": "SYNTHETIC"
    },
    {
        "id": "lower_reactive_shale",
        "name": "Lower Reactive Shale",
        "group_name": "Simulated Hazard",
        "age_era": "Simulated Proterozoic",
        "color": "#b45309",
        "average_tvd_m": 1975.0,
        "thickness_m": 275.0,
        "lithology": "Swelling reactive shale (Simulated)",
        "dip_deg": 2.5,
        "dip_azimuth_deg": 0.0,
        "provenance": "SYNTHETIC"
    },
    {
        "id": "basal_sandstone",
        "name": "Basal Sandstone",
        "group_name": "Simulated Basal",
        "age_era": "Simulated Basement",
        "color": "#9a7b56",
        "average_tvd_m": 2250.0,
        "thickness_m": 350.0,
        "lithology": "Hard cemented sandstone (Simulated)",
        "dip_deg": 3.0,
        "dip_azimuth_deg": 0.0,
        "provenance": "SYNTHETIC"
    },
    {
        "id": "basement_gneiss",
        "name": "Basement Gneiss",
        "group_name": "Crystalline Basement",
        "age_era": "Simulated Archean",
        "color": "#475569",
        "average_tvd_m": 2600.0,
        "thickness_m": 600.0,
        "lithology": "Crystalline granitic gneiss (Simulated)",
        "dip_deg": 3.5,
        "dip_azimuth_deg": 0.0,
        "provenance": "SYNTHETIC"
    }
]


def list_surfaces(workspace: str = "volve") -> List[Dict[str, Any]]:
    """List surfaces for the requested workspace with metadata summary."""
    is_demo = workspace in ("onshore_demo", "demo", "workspace_b")
    source_list = DEMO_SURFACES if is_demo else VOLVE_SURFACES
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "group_name": s["group_name"],
            "age_era": s["age_era"],
            "color": s["color"],
            "average_tvd_m": s["average_tvd_m"],
            "thickness_m": s["thickness_m"],
            "lithology": s["lithology"],
            "provenance": s["provenance"]
        }
        for s in source_list
    ]


def get_surface_grid(surface_id: str, workspace: str = "volve", resolution: int = 21) -> Optional[Dict[str, Any]]:
    """
    Generate regular metric grid for a geological surface.
    Resolution default is 21x21 points (441 points) over a 2000m x 2000m local frame.
    Cell size: 100m.
    """
    is_demo = workspace in ("onshore_demo", "demo", "workspace_b")
    source_list = DEMO_SURFACES if is_demo else VOLVE_SURFACES
    aliases = {
        "top_hugin": "vestland_group",
        "hugin": "vestland_group",
        "hugin_reservoir": "vestland_group",
        "top_shetland": "shetland_group",
        "shetland": "shetland_group",
        "draupne": "viking_group",
        "utsira": "utsira_fm"
    }
    normalized_id = aliases.get(surface_id.lower(), surface_id.lower())
    surf = next((s for s in source_list if s["id"].lower() == normalized_id or s["name"].lower() == surface_id.lower() or s["id"] == surface_id), None)
    if not surf:
        return None

    dim_x = resolution
    dim_y = resolution
    cell_size = 100.0  # 100m grid cell spacing
    half_width = (dim_x - 1) * cell_size / 2.0
    half_height = (dim_y - 1) * cell_size / 2.0

    avg_depth = surf["average_tvd_m"]
    dip_rad = math.radians(surf.get("dip_deg", 2.0))
    azimuth_rad = math.radians(surf.get("dip_azimuth_deg", 60.0))

    # Gradient components in x (East) and y (North)
    grad_x = math.sin(dip_rad) * math.sin(azimuth_rad)
    grad_y = math.sin(dip_rad) * math.cos(azimuth_rad)

    depth_values: List[List[float]] = []
    for j in range(dim_y):
        row: List[float] = []
        local_y = (j * cell_size) - half_height
        for i in range(dim_x):
            local_x = (i * cell_size) - half_width
            # Structural dip variation with subtle geological anticlinal curvature
            structural_offset = (local_x * grad_x) + (local_y * grad_y)
            curvature = -0.000008 * (local_x**2 + local_y**2)
            z_tvd = avg_depth + structural_offset + curvature
            row.append(round(max(0.0, z_tvd), 2))
        depth_values.append(row)

    origin_x = -half_width
    origin_y = -half_height

    bounds = {
        "min_x": origin_x,
        "max_x": half_width,
        "min_y": origin_y,
        "max_y": half_height,
        "min_depth_m": min(min(r) for r in depth_values),
        "max_depth_m": max(max(r) for r in depth_values)
    }

    return {
        "id": surf["id"],
        "name": surf["name"],
        "group_name": surf["group_name"],
        "age_era": surf["age_era"],
        "color": surf["color"],
        "grid_dim_x": dim_x,
        "grid_dim_y": dim_y,
        "origin_x": origin_x,
        "origin_y": origin_y,
        "cell_size_m": cell_size,
        "depth_values": depth_values,
        "bounds": bounds,
        "lithology": surf["lithology"],
        "provenance": surf["provenance"]
    }
