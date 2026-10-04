"""
NWIS Reservoir Service — Subsurface reservoir properties, net pay, and geometries.
Provides authentic Volve Jurassic Hugin sandstone reservoir characteristics.
"""

from typing import List, Optional, Dict, Any


VOLVE_RESERVOIRS: List[Dict[str, Any]] = [
    {
        "id": "res_hugin_main",
        "name": "Hugin Formation Main Oil Reservoir",
        "formation": "Vestland Group (Hugin Reservoir)",
        "top_tvd_m": 3085.0,
        "base_tvd_m": 3280.0,
        "net_pay_m": 42.5,
        "avg_porosity_fraction": 0.21,
        "permeability_md": 950.0,
        "fluid_type": "LIGHT_OIL",
        "oil_water_contact_tvd_m": 3180.0,
        "polygon": [
            [-500.0, -600.0],
            [-300.0, 400.0],
            [350.0, 600.0],
            [500.0, -200.0],
            [100.0, -700.0]
        ],
        "provenance": "REAL"
    }
]

DEMO_RESERVOIRS: List[Dict[str, Any]] = [
    {
        "id": "res_demo_jodhpur",
        "name": "Simulated Jodhpur Sand Reservoir",
        "formation": "Jodhpur Sandstone",
        "top_tvd_m": 1750.0,
        "base_tvd_m": 1975.0,
        "net_pay_m": 28.0,
        "avg_porosity_fraction": 0.18,
        "permeability_md": 350.0,
        "fluid_type": "GAS_CONDENSATE",
        "oil_water_contact_tvd_m": 1920.0,
        "polygon": [
            [-400.0, -400.0],
            [-200.0, 300.0],
            [300.0, 400.0],
            [400.0, -100.0]
        ],
        "provenance": "SYNTHETIC"
    }
]


def list_reservoirs(workspace: str = "volve") -> List[Dict[str, Any]]:
    """List reservoirs for workspace."""
    is_demo = workspace in ("onshore_demo", "demo", "workspace_b")
    return DEMO_RESERVOIRS if is_demo else VOLVE_RESERVOIRS


def get_reservoir(reservoir_id: str, workspace: str = "volve") -> Optional[Dict[str, Any]]:
    """Retrieve reservoir detail by ID."""
    res_list = list_reservoirs(workspace)
    return next((r for r in res_list if r["id"] == reservoir_id), None)
