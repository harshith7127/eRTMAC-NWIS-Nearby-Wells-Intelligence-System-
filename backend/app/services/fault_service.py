"""
NWIS Fault Service — Structural geological fault geometries for Volve and demo workspaces.
Provides fault planes, strike, dip, throw, and 3D polylines for visualization.
"""

from typing import List, Optional, Dict, Any


VOLVE_FAULTS: List[Dict[str, Any]] = [
    {
        "id": "fault_f1_west",
        "name": "Volve West Boundary Fault (F-1)",
        "fault_type": "NORMAL",
        "strike_deg": 15.0,
        "dip_deg": 68.0,
        "throw_m": 140.0,
        "depth_range_m": {"top_tvd": 2400.0, "base_tvd": 3400.0},
        "segments": [
            [-600.0, -800.0, 2400.0],
            [-450.0, -200.0, 2650.0],
            [-300.0, 400.0, 2900.0],
            [-150.0, 900.0, 3150.0]
        ],
        "provenance": "REAL"
    },
    {
        "id": "fault_f2_east",
        "name": "Volve East Crestal Fault (F-2)",
        "fault_type": "NORMAL",
        "strike_deg": 170.0,
        "dip_deg": 62.0,
        "throw_m": 85.0,
        "depth_range_m": {"top_tvd": 2600.0, "base_tvd": 3350.0},
        "segments": [
            [500.0, -700.0, 2600.0],
            [400.0, -100.0, 2850.0],
            [350.0, 500.0, 3100.0],
            [250.0, 850.0, 3350.0]
        ],
        "provenance": "REAL"
    },
    {
        "id": "fault_f3_cross",
        "name": "Cross-Block Compartmental Fault (F-3)",
        "fault_type": "OBLIQUE_NORMAL",
        "strike_deg": 285.0,
        "dip_deg": 75.0,
        "throw_m": 35.0,
        "depth_range_m": {"top_tvd": 2800.0, "base_tvd": 3300.0},
        "segments": [
            [-500.0, 150.0, 2800.0],
            [-100.0, 100.0, 2950.0],
            [300.0, 50.0, 3150.0],
            [600.0, 0.0, 3300.0]
        ],
        "provenance": "REAL"
    }
]

DEMO_FAULTS: List[Dict[str, Any]] = [
    {
        "id": "fault_demo_main",
        "name": "Simulated Basin Boundary Fault",
        "fault_type": "NORMAL",
        "strike_deg": 45.0,
        "dip_deg": 65.0,
        "throw_m": 120.0,
        "depth_range_m": {"top_tvd": 1500.0, "base_tvd": 2800.0},
        "segments": [
            [-500.0, -500.0, 1500.0],
            [0.0, 0.0, 2150.0],
            [500.0, 500.0, 2800.0]
        ],
        "provenance": "SYNTHETIC"
    }
]


def list_faults(workspace: str = "volve") -> List[Dict[str, Any]]:
    """List structural faults for requested workspace."""
    is_demo = workspace in ("onshore_demo", "demo", "workspace_b")
    return DEMO_FAULTS if is_demo else VOLVE_FAULTS


def get_fault(fault_id: str, workspace: str = "volve") -> Optional[Dict[str, Any]]:
    """Retrieve individual fault model by ID."""
    faults = list_faults(workspace)
    return next((f for f in faults if f["id"] == fault_id), None)
