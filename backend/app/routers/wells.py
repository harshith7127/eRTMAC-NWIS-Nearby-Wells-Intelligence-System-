"""
NWIS Wells Router — Endpoints for Wells, Nearby Well Spatial Queries, Wellbores, Stratigraphy, and Surveys
Supports slashed well names/IDs (e.g. 15/9-F-12) via {well_id:path}.
"""

from typing import List, Optional
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import get_db
from ..schemas import (
    WellResponse,
    NearbyWellResponse,
    WellboreResponse,
    FormationTopResponse,
    FormationAtDepthResponse,
    SurveyResponse,
    WellboreTrajectoryResponse,
    FormationAliasResponse,
    EventResponse,
    WellLogCurveSummary,
    WellLogCurveResponse,
    MudLogResponse,
    CasingStringResponse,
    WellReservoirPropertiesResponse,
    WellDataAvailabilityResponse
)
from ..services import well_service, event_service

router = APIRouter(tags=["Wells & Wellbores"])


@router.get("/wells", response_model=List[WellResponse])
def get_wells(
    workspace: Optional[str] = Query(None, description="Workspace identifier (volve or onshore_demo)"),
    dataset: Optional[str] = Query(None, description="Dataset identifier, e.g. VOLVE_PUBLIC"),
    field: Optional[str] = Query(None, description="Field name, e.g. VOLVE"),
    provenance: Optional[str] = Query(None, description="Provenance type: REAL, DERIVED, SYNTHETIC, ILLUSTRATIVE"),
    status: Optional[str] = Query(None, description="Operational status"),
    search: Optional[str] = Query(None, description="Search term matching well ID, name, field, or NPDID"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve filtered list of canonical wells."""
    return well_service.list_wells(db, dataset=dataset, field=field, provenance=provenance, status=status, workspace=workspace, search=search)


@router.get("/wells/nearby", response_model=List[NearbyWellResponse])
def get_nearby_wells(
    latitude: float = Query(..., description="Surface latitude in decimal degrees"),
    longitude: float = Query(..., description="Surface longitude in decimal degrees"),
    radius_km: float = Query(25.0, description="Search radius in kilometers", ge=0.1, le=500.0),
    db: sqlite3.Connection = Depends(get_db)
):
    """Deterministic spatial search for offset wells within radius_km (Haversine calculation)."""
    return well_service.find_nearby_wells(db, latitude=latitude, longitude=longitude, radius_km=radius_km)


@router.get("/wells/{well_id:path}/wellbores", response_model=List[WellboreResponse])
def get_well_wellbores(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve all wellbores associated with a well."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return well_service.list_wellbores(db, well_id)


@router.get("/wells/{well_id:path}/events", response_model=List[EventResponse])
def get_well_events(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve all drilling events/incidents across wellbores of this well."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return event_service.list_events_by_well(db, well_id)


@router.get("/wells/{well_id:path}/logs", response_model=List[WellLogCurveSummary])
def get_well_logs(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve summary of all available petrophysical log curves for a well."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return well_service.get_well_log_curves(db, well_id)


@router.get("/wells/{well_id:path}/logs/{curve}", response_model=WellLogCurveResponse)
def get_well_log_curve(
    well_id: str,
    curve: str,
    start_md: Optional[float] = Query(None, description="Optional start MD boundary"),
    end_md: Optional[float] = Query(None, description="Optional end MD boundary"),
    limit: int = Query(2000, ge=1, le=10000, description="Max depth points to return"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve depth-indexed curve points for a specific curve."""
    curve_data = well_service.get_well_log_curve_data(db, well_id, curve, start_md=start_md, end_md=end_md, limit=limit)
    if not curve_data:
        raise HTTPException(status_code=404, detail=f"Curve '{curve}' not found for well '{well_id}'")
    return curve_data


@router.get("/wells/{well_id:path}/mudlog", response_model=MudLogResponse)
def get_well_mud_log(
    well_id: str,
    parameter: Optional[str] = Query(None, description="Optional parameter filter (e.g. rop, torque, spp, total_gas)"),
    start_md: Optional[float] = Query(None, description="Optional start MD boundary"),
    end_md: Optional[float] = Query(None, description="Optional end MD boundary"),
    limit: int = Query(1500, ge=1, le=10000, description="Max data points to return"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve mud logging drilling parameters and gas readings."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return well_service.get_well_mud_log(db, well_id, parameter=parameter, start_md=start_md, end_md=end_md, limit=limit)


@router.get("/wells/{well_id:path}/casing", response_model=List[CasingStringResponse])
def get_well_casing(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve casing and tubular program strings for a well."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return well_service.get_well_casings(db, well_id)


@router.get("/wells/{well_id:path}/reservoir-properties", response_model=WellReservoirPropertiesResponse)
def get_well_reservoir_properties(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve volumetric reservoir properties at well location from authoritative 3D reservoir model."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return well_service.get_well_reservoir_properties(db, well_id)


@router.get("/wells/{well_id:path}/data-availability", response_model=WellDataAvailabilityResponse)
def get_well_data_availability(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve multi-category data availability status matrix for a canonical well."""
    avail = well_service.get_well_data_availability(db, well_id)
    if not avail:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return avail


@router.get("/wells/{well_id:path}/surveys", response_model=List[SurveyResponse])
def get_well_surveys(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve trajectory directional survey stations for a well's primary wellbore."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    wb_row = db.execute("SELECT wellbore_id FROM wellbores WHERE well_id = ? ORDER BY wellbore_id LIMIT 1", (well_id,)).fetchone()
    if not wb_row:
        return []
    return well_service.list_surveys(db, wb_row["wellbore_id"])


@router.get("/wells/{well_id:path}/formation-tops", response_model=List[FormationTopResponse])
def get_well_formation_tops(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve formation tops for a well's primary wellbore."""
    from ..services import formation_service
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    wb_row = db.execute("SELECT wellbore_id FROM wellbores WHERE well_id = ? ORDER BY wellbore_id LIMIT 1", (well_id,)).fetchone()
    if not wb_row:
        return []
    return formation_service.get_wellbore_formation_tops(db, wb_row["wellbore_id"])


@router.get("/wells/{well_id:path}", response_model=WellResponse)
def get_well(well_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve single well by canonical well_id."""
    well = well_service.get_well(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with ID '{well_id}' not found")
    return well


@router.get("/wellbores/{wellbore_id:path}/formations", response_model=List[FormationTopResponse])
def get_wellbore_formations(wellbore_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve formation tops for a specific wellbore."""
    from ..services import formation_service
    formations = formation_service.get_wellbore_formation_tops(db, wellbore_id)
    if not formations:
        # Check if wellbore itself exists
        row = db.execute("SELECT wellbore_id FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Wellbore '{wellbore_id}' not found")
    return formations


@router.get("/wellbores/{wellbore_id:path}/formation-at-depth", response_model=FormationAtDepthResponse)
def get_wellbore_formation_at_depth(
    wellbore_id: str,
    md: float = Query(..., description="Target measured depth in meters"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Determine the containing formation and relative depth below top for an arbitrary measured depth."""
    from ..services import formation_service
    # Verify wellbore existence
    wb_row = db.execute("SELECT wellbore_id FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
    if not wb_row:
        raise HTTPException(status_code=404, detail=f"Wellbore '{wellbore_id}' not found")

    return formation_service.get_formation_at_depth(db, wellbore_id, md)


@router.get("/wellbores/{wellbore_id:path}/surveys", response_model=List[SurveyResponse])
def get_wellbore_surveys(wellbore_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve trajectory directional survey stations for a wellbore."""
    surveys = well_service.list_surveys(db, wellbore_id)
    if not surveys:
        row = db.execute("SELECT wellbore_id FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Wellbore '{wellbore_id}' not found")
    return surveys


@router.get("/wellbores/{wellbore_id:path}/trajectory", response_model=WellboreTrajectoryResponse)
def get_wellbore_trajectory(
    wellbore_id: str,
    md: Optional[float] = Query(None, description="Optional target MD to interpolate 3D position at"),
    start_md: Optional[float] = Query(None, description="Optional start MD boundary"),
    end_md: Optional[float] = Query(None, description="Optional end MD boundary"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Retrieve normalized Minimum Curvature 3D trajectory stations and optional interpolated point at arbitrary MD.
    """
    from ..services import trajectory_service
    wb_row = db.execute("SELECT wellbore_id FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
    if not wb_row:
        raise HTTPException(status_code=404, detail=f"Wellbore '{wellbore_id}' not found")

    raw_surveys = well_service.list_surveys(db, wellbore_id)
    computed_stations, gaps = trajectory_service.compute_wellbore_trajectory(raw_surveys)

    filtered_stations = computed_stations
    if start_md is not None:
        filtered_stations = [s for s in filtered_stations if s["md"] >= start_md]
    if end_md is not None:
        filtered_stations = [s for s in filtered_stations if s["md"] <= end_md]

    interpolated = None
    if md is not None and raw_surveys:
        interp_res = trajectory_service.interpolate_trajectory_at_md(raw_surveys, md)
        if interp_res.get("position"):
            interpolated = interp_res["position"]
        elif interp_res.get("reason"):
            gaps.append(interp_res["reason"])

    min_md = computed_stations[0]["md"] if computed_stations else None
    max_md = computed_stations[-1]["md"] if computed_stations else None

    return {
        "wellbore_id": wellbore_id,
        "min_md": min_md,
        "max_md": max_md,
        "station_count": len(filtered_stations),
        "stations": filtered_stations,
        "interpolated_point": interpolated,
        "data_gaps": gaps
    }


@router.get("/formations/aliases", response_model=List[FormationAliasResponse])
def get_formation_aliases(db: sqlite3.Connection = Depends(get_db)):
    """Retrieve controlled vocabulary of geological formation aliases."""
    from ..services import formation_service
    return formation_service.list_formation_aliases(db)


@router.get("/wellbores/{wellbore_id:path}/events", response_model=List[EventResponse])
def get_wellbore_events(wellbore_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve all drilling events recorded in a specific wellbore."""
    events = event_service.list_events_by_wellbore(db, wellbore_id)
    if not events:
        row = db.execute("SELECT wellbore_id FROM wellbores WHERE wellbore_id = ?", (wellbore_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Wellbore '{wellbore_id}' not found")
    return events

