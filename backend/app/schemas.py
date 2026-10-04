"""
NWIS Pydantic Schemas — Typed request/response models for Canonical Drilling Intelligence
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ----------------------------------------------------
# 1. Base / Enums
# ----------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "healthy"
    database: str = "connected"
    dataset: str = "VOLVE_PUBLIC"
    version: str = "1.0.0"


# ----------------------------------------------------
# 2. Well & Wellbore
# ----------------------------------------------------
class WellBase(BaseModel):
    well_id: str
    well_name: str
    field: str
    operator: str
    dataset: str = "VOLVE_PUBLIC"
    provenance: str = "REAL"
    latitude: float
    longitude: float
    spud_date: Optional[str] = None
    completion_date: Optional[str] = None
    status: Optional[str] = None
    total_depth_m: Optional[float] = None
    water_depth_m: Optional[float] = None
    utm_easting: Optional[float] = None
    utm_northing: Optional[float] = None
    npdid: Optional[int] = None


class WellCreate(WellBase):
    pass


class WellResponse(WellBase):
    created_at: str
    updated_at: str
    model_config = ConfigDict(from_attributes=True)


class NearbyWellResponse(BaseModel):
    well_id: str
    well_name: str
    distance_km: float
    latitude: float
    longitude: float
    dataset: str
    provenance: str


class WellboreBase(BaseModel):
    wellbore_id: str
    well_id: str
    name: str
    purpose: Optional[str] = None
    status: Optional[str] = None
    md_start: Optional[float] = None
    md_end: Optional[float] = None
    tvd_start: Optional[float] = None
    tvd_end: Optional[float] = None
    trajectory_source: Optional[str] = None
    provenance: str = "REAL"


class WellboreCreate(WellboreBase):
    pass


class WellboreResponse(WellboreBase):
    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 3. Trajectory Survey
# ----------------------------------------------------
class SurveyBase(BaseModel):
    survey_id: str
    wellbore_id: str
    md: float
    inclination: float
    azimuth: float
    tvd: Optional[float] = None
    tvdss: Optional[float] = None
    northing: Optional[float] = None
    easting: Optional[float] = None
    timestamp: Optional[str] = None
    source: Optional[str] = None
    provenance: str = "REAL"


class SurveyCreate(SurveyBase):
    pass


class SurveyResponse(SurveyBase):
    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 3b. Normalized Trajectory & Interpolation Models
# ----------------------------------------------------
class TrajectoryPoint(BaseModel):
    md: float
    inclination: float
    azimuth: float
    tvd: Optional[float] = None
    tvdss: Optional[float] = None
    northing: Optional[float] = None
    easting: Optional[float] = None
    dls: Optional[float] = None
    interpolation_basis: str = "RAW_SURVEY"
    provenance: str = "REAL"


class TrajectoryInterpolationResponse(BaseModel):
    wellbore_id: str
    target_md: float
    position: Optional[TrajectoryPoint] = None
    interpolation_basis: Optional[str] = None
    reason: Optional[str] = None


class WellboreTrajectoryResponse(BaseModel):
    wellbore_id: str
    min_md: Optional[float] = None
    max_md: Optional[float] = None
    station_count: int
    stations: List[TrajectoryPoint] = Field(default_factory=list)
    interpolated_point: Optional[TrajectoryPoint] = None
    data_gaps: List[str] = Field(default_factory=list)


# ----------------------------------------------------
# 4. Formation Top & Controlled Aliases
# ----------------------------------------------------
class FormationAliasBase(BaseModel):
    alias: str
    canonical_name: str
    source: str = "Norwegian Offshore Directorate (NOD)"
    provenance: str = "REAL"


class FormationAliasResponse(FormationAliasBase):
    model_config = ConfigDict(from_attributes=True)


class FormationTopBase(BaseModel):
    formation_top_id: str
    wellbore_id: str
    formation_name: str
    formation_name_canonical: Optional[str] = None
    md: float
    tvd: Optional[float] = None
    tvdss: Optional[float] = None
    source: Optional[str] = None
    provenance: str = "REAL"
    reviewed: bool = False


class FormationTopCreate(FormationTopBase):
    pass


class FormationTopResponse(FormationTopBase):
    formation_name_raw: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class FormationAtDepthResponse(BaseModel):
    wellbore_id: str
    md: float
    formation_name_raw: Optional[str] = None
    formation_name_canonical: Optional[str] = None
    formation_top_md: Optional[float] = None
    formation_bottom_md: Optional[float] = None
    depth_below_top_md: Optional[float] = None
    depth_basis: str = "MD"
    alignment_basis: str = "FORMATION_TOP_MD"
    source: Optional[str] = None
    provenance: str = "REAL"
    reason: Optional[str] = None


# ----------------------------------------------------
# 5. Events / Evidence & Stratigraphic Offset Queries
# ----------------------------------------------------
class OffsetEventResponse(BaseModel):
    event_id: str
    well_id: str
    well_name: str
    wellbore_id: str
    wellbore_name: str
    event_type: str
    severity: Optional[str] = None
    raw_md: Optional[float] = None
    raw_tvd: Optional[float] = None
    canonical_formation_name: str
    formation_top_md: Optional[float] = None
    depth_below_formation_top_md: Optional[float] = None
    depth_basis: str = "MD"
    alignment_basis: str = "FORMATION_TOP_MD"
    distance_km: Optional[float] = None
    reviewed: bool = False
    excluded: bool = False
    provenance: str = "REAL"
    description: str
    source_text: Optional[str] = None
    report_id: Optional[str] = None
    report_date: Optional[str] = None


class OffsetEventsQueryResponse(BaseModel):
    query: dict
    total_count: int
    events: List[OffsetEventResponse] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    provenance_breakdown: dict = Field(default_factory=dict)


class EventBase(BaseModel):
    event_id: str
    wellbore_id: Optional[str] = None
    report_id: Optional[str] = None
    event_type: str
    severity: Optional[str] = None
    md: Optional[float] = None
    md_start: Optional[float] = None
    md_end: Optional[float] = None
    tvd: Optional[float] = None
    formation_name: Optional[str] = None
    depth_basis: str = "MD"
    description: str
    cause: Optional[str] = None
    action: Optional[str] = None
    outcome: Optional[str] = None
    reviewed: bool = False
    excluded: bool = False
    provenance: str = "REAL"
    source_text: Optional[str] = None
    evidence_start: Optional[int] = None
    evidence_end: Optional[int] = None


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    created_at: str
    model_config = ConfigDict(from_attributes=True)


class EventReviewUpdate(BaseModel):
    reviewed: bool


class EventEvidenceSpan(BaseModel):
    event_id: str
    event_type: str
    severity: Optional[str] = None
    md: Optional[float] = None
    description: str
    evidence_start: Optional[int] = None
    evidence_end: Optional[int] = None
    reviewed: bool = False


# ----------------------------------------------------
# 6. Reports (DDRs)
# ----------------------------------------------------
class ReportBase(BaseModel):
    report_id: str
    wellbore_id: Optional[str] = None
    report_type: str
    title: str
    report_date: Optional[str] = None
    source_file: Optional[str] = None
    source_uri: Optional[str] = None
    text: str
    provenance: str = "REAL"
    extraction_status: Optional[str] = None
    reviewed: bool = False


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    created_at: str
    model_config = ConfigDict(from_attributes=True)


class ReportDetailResponse(ReportResponse):
    events: List[EventEvidenceSpan] = Field(default_factory=list)


# ----------------------------------------------------
# 7. Casing & Mud Programs
# ----------------------------------------------------
class CasingBase(BaseModel):
    casing_id: str
    wellbore_id: str
    hole_section: Optional[str] = None
    casing_size: Optional[str] = None
    setting_depth_md: Optional[float] = None
    setting_depth_tvd: Optional[float] = None
    cement_top: Optional[float] = None
    cement_bottom: Optional[float] = None
    source: Optional[str] = None
    provenance: str = "REAL"


class CasingCreate(CasingBase):
    pass


class CasingResponse(CasingBase):
    model_config = ConfigDict(from_attributes=True)


class MudProgramBase(BaseModel):
    mud_program_id: str
    wellbore_id: str
    md_start: Optional[float] = None
    md_end: Optional[float] = None
    mud_weight: Optional[float] = None
    mud_type: Optional[str] = None
    viscosity: Optional[float] = None
    source: Optional[str] = None
    provenance: str = "REAL"


class MudProgramCreate(MudProgramBase):
    pass


class MudProgramResponse(MudProgramBase):
    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 8. Phase 4 Lookahead & Offset Evidence Rule Engine
# ----------------------------------------------------
class AnalogueAttributeComparison(BaseModel):
    wellbore_id: str
    well_id: str
    well_name: str
    wellbore_name: str
    formation_match: bool
    relative_depth_coverage: bool
    trajectory_available: bool
    casing_available: bool
    mud_program_available: bool
    distance_m: Optional[float] = None
    distance_basis: str = "WELLHEAD_FALLBACK"
    explanation: str


class LookaheadEvidenceEvent(BaseModel):
    well_id: str
    wellbore_id: str
    well_name: str
    wellbore_name: str
    distance_m: Optional[float] = None
    distance_basis: str = "WELLHEAD_FALLBACK"
    formation: str
    event_type: str
    severity: Optional[str] = None
    event_md: Optional[float] = None
    event_tvd: Optional[float] = None
    relative_depth: Optional[float] = None
    current_relative_depth: float
    lookahead_end: float
    source_report_id: Optional[str] = None
    report_date: Optional[str] = None
    event_id: str
    reviewed: bool = False
    excluded: bool = False
    provenance: str = "REAL"
    description: str
    source_text: Optional[str] = None
    historical_action: Optional[str] = None


class LookaheadAlert(BaseModel):
    alert_id: str
    active_well_id: str
    active_wellbore_id: str
    event_type: str
    formation: str
    current_relative_depth: float
    lookahead_start: float
    lookahead_end: float
    k: int
    n: int
    severity: str  # NO_EVIDENCE, INSUFFICIENT_COVERAGE, OBSERVED, REPEATED
    status: str    # ACTIVE, CONFIRMED, UNREVIEWED_EVIDENCE
    trigger_reason: str
    offset_wells: List[str] = Field(default_factory=list)
    evidence_events: List[LookaheadEvidenceEvent] = Field(default_factory=list)
    created_at: str
    provenance: str = "DERIVED"
    telemetry_context: Optional[str] = None


class LookaheadCoverage(BaseModel):
    candidate_offset_wellbores: int
    covered_offset_wellbores: int
    candidate_wellbore_details: List[AnalogueAttributeComparison] = Field(default_factory=list)


class LookaheadResponse(BaseModel):
    active_well: dict
    query: dict
    alerts: List[LookaheadAlert] = Field(default_factory=list)
    coverage: LookaheadCoverage
    evidence: List[LookaheadEvidenceEvent] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    provenance_breakdown: dict = Field(default_factory=dict)


# ----------------------------------------------------
# 9. Phase 5 Canonical Telemetry & Replay Schemas
# ----------------------------------------------------
class CanonicalTelemetrySample(BaseModel):
    timestamp: Optional[str] = None
    well_id: str
    wellbore_id: str
    md: float
    depth_basis: str = "MD"
    tvd: Optional[float] = None
    rop: Optional[float] = None
    torque: Optional[float] = None
    hook_load: Optional[float] = None
    spp: Optional[float] = None
    wob: Optional[float] = None
    rpm: Optional[float] = None
    flow_in: Optional[float] = None
    flow_out: Optional[float] = None
    mud_weight: Optional[float] = None
    ecd: Optional[float] = None
    gas: Optional[float] = None
    formation: Optional[str] = None
    provenance: str = "REAL"
    source: str = "VOLVE_REPLAY"
    raw_index: Optional[int] = None


class ChannelInfo(BaseModel):
    name: str
    mnemonic: str
    unit: Optional[str] = None
    description: Optional[str] = None
    available: bool = True
    source: str = "VOLVE_REPLAY"


class TelemetryStatusResponse(BaseModel):
    source: str = "VOLVE_REPLAY"
    status: str = "IDLE"  # IDLE, RUNNING, PAUSED, COMPLETED, NOT_CONNECTED, ERROR
    well_id: Optional[str] = None
    wellbore_id: Optional[str] = None
    current_index: int = 0
    total_samples: int = 0
    last_md: Optional[float] = None
    last_timestamp: Optional[str] = None
    speed: float = 1.0
    channels: List[str] = Field(default_factory=list)
    provenance: str = "REAL"
    reason: Optional[str] = None


class ReplayControlRequest(BaseModel):
    well_id: Optional[str] = None
    speed: Optional[float] = None
    start_index: Optional[int] = None
    index: Optional[int] = None
    md: Optional[float] = None


class WitsmlValidationResponse(BaseModel):
    file: str
    file_type: str = "WITSML_LOG"
    well: Optional[str] = None
    wellbore: Optional[str] = None
    sample_count: int = 0
    channels: List[ChannelInfo] = Field(default_factory=list)
    depth_range: dict = Field(default_factory=dict)
    timestamp_range: dict = Field(default_factory=dict)
    unsupported_fields: List[str] = Field(default_factory=list)
    parse_warnings: List[str] = Field(default_factory=list)
    provenance: str = "REAL"
    log_type: str = "DEPTH_LOG"


# ----------------------------------------------------
# 11. Phase 6: ML Evaluation, Backtesting & Model Card
# ----------------------------------------------------
class FeatureLineageInfo(BaseModel):
    feature_name: str
    source: str
    calculation: str
    depth_basis: str = "MD"
    nullable: bool = False
    provenance: str = "REAL"
    leakage_guard: str
    test_coverage: str


class LeadDistanceStats(BaseModel):
    count: int = 0
    mean_m: Optional[float] = None
    median_m: Optional[float] = None
    min_m: Optional[float] = None
    max_m: Optional[float] = None
    depth_basis: str = "MD"
    computable: bool = True
    reason: Optional[str] = None


class ModelMetricScore(BaseModel):
    model_name: str
    pr_auc: Optional[float] = None
    roc_auc: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    alert_count: int = 0
    alerts_per_1000m: float = 0.0
    lead_distance: LeadDistanceStats = Field(default_factory=LeadDistanceStats)
    computable: bool = True
    reason: Optional[str] = None


class DatasetIntervalRow(BaseModel):
    well_id: str
    wellbore_id: str
    prediction_md: float
    prediction_tvd: Optional[float] = None
    formation: str
    relative_depth: float
    features: dict = Field(default_factory=dict)
    target_hazard_next_100m: int
    target_event_types: List[str] = Field(default_factory=list)
    provenance: str = "REAL"


class DatasetSummaryResponse(BaseModel):
    total_intervals: int = 0
    interval_size_m: float = 30.0
    prediction_horizon_m: float = 100.0
    wells_represented: List[str] = Field(default_factory=list)
    positive_samples: int = 0
    negative_samples: int = 0
    positive_rate_pct: float = 0.0
    target_event: str = "ANY_HAZARD"
    feature_names: List[str] = Field(default_factory=list)
    excluded_samples_count: int = 0
    excluded_reasons: List[str] = Field(default_factory=list)
    provenance: str = "REAL"


class MLStatusResponse(BaseModel):
    model_status: str = "NOT_SHIPPED"  # NOT_SHIPPED, EVALUATED_FOR_USE
    status_reason: str
    beats_rule_baseline: bool = False
    evaluation_method: str = "LEAVE_ONE_WELL_OUT"
    dataset_scope: str = "VOLVE_PUBLIC_PROTOTYPE"
    oil_india_transfer_limit: str = "Volve is a North Sea public prototype dataset and does not transfer to Oil India operational formations."
    timestamp: str


class MLEvaluationResponse(BaseModel):
    dataset: str = "VOLVE_PUBLIC"
    provenance: str = "REAL"
    evaluation_method: str = "LEAVE_ONE_WELL_OUT"
    target_event: str = "ANY_HAZARD"
    prediction_horizon_m: float = 100.0
    interval_size_m: float = 30.0
    evaluated_wells: List[str] = Field(default_factory=list)
    total_intervals: int = 0
    positive_samples: int = 0
    negative_samples: int = 0
    baselines: dict = Field(default_factory=dict)
    models: dict = Field(default_factory=dict)
    beats_rule_baseline: bool = False
    model_status: str = "NOT_SHIPPED"
    status_reason: str
    limitations: List[str] = Field(default_factory=list)
    timestamp: str


class ModelCardResponse(BaseModel):
    model_card_version: str = "1.0.0"
    model_name: str = "NWIS Phase 6 Hazard Look-Ahead Evaluator"
    dataset_identity: str = "Equinor Volve Field Open Data (Block 15/9)"
    provenance: str = "REAL"
    evaluated_wells: List[str] = Field(default_factory=list)
    target_definition: str = "Occurrence of drilling hazard event in upcoming (MD, MD + 100m]"
    interval_definition: str = "30-metre non-overlapping prediction points"
    cross_validation_scheme: str = "Leave-One-Well-Out Cross-Validation (LOWOCV)"
    leakage_safeguards: List[str] = Field(default_factory=list)
    features_documented: List[FeatureLineageInfo] = Field(default_factory=list)
    baselines_evaluated: List[str] = Field(default_factory=list)
    models_evaluated: List[str] = Field(default_factory=list)
    evaluation_summary: dict = Field(default_factory=dict)
    ship_decision: str = "NOT_SHIPPED"
    ship_decision_reason: str
    operational_limitations: List[str] = Field(default_factory=list)


# ----------------------------------------------------
# 12. Phase 7: Knowledge Repository & Engineer Dashboard
# ----------------------------------------------------
class EvidenceSpanDetail(BaseModel):
    evidence_id: str
    event_id: Optional[str] = None
    report_id: Optional[str] = None
    well_id: str
    well_name: str
    wellbore_id: Optional[str] = None
    formation: Optional[str] = None
    depth: Optional[float] = None
    depth_basis: str = "MD"
    page_or_section: Optional[str] = None
    source_text: str
    evidence_type: str = "DAILY_DRILLING_REPORT"
    historical_practice: Optional[str] = None
    reviewed: bool = False
    provenance: str = "REAL"


class KnowledgeSearchResultItem(BaseModel):
    result_type: str  # EVENT, REPORT, FORMATION_TOP, EVIDENCE
    event_id: Optional[str] = None
    report_id: Optional[str] = None
    evidence_id: Optional[str] = None
    well_id: Optional[str] = None
    well_name: Optional[str] = None
    wellbore_id: Optional[str] = None
    wellbore_name: Optional[str] = None
    formation: Optional[str] = None
    event_type: Optional[str] = None
    severity: Optional[str] = None
    depth: Optional[float] = None
    depth_basis: str = "MD"
    summary: str
    historical_practice: Optional[str] = None
    source_text: Optional[str] = None
    report_date: Optional[str] = None
    document_type: Optional[str] = None
    reviewed: bool = False
    provenance: str = "REAL"


class KnowledgeSearchResponse(BaseModel):
    query: dict
    total_count: int
    page: int = 1
    limit: int = 50
    results: List[KnowledgeSearchResultItem] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    provenance_breakdown: dict = Field(default_factory=dict)
    provenance_summary: dict = Field(default_factory=dict)


class KnowledgeEventDetailResponse(BaseModel):
    event: EventResponse
    well: Optional[dict] = None
    wellbore: Optional[dict] = None
    formation: Optional[str] = None
    depth_md: Optional[float] = None
    depth_basis: str = "MD"
    historical_practice: Optional[str] = None
    evidence: Optional[EvidenceSpanDetail] = None
    source_report: Optional[dict] = None
    reviewed: bool = False
    provenance: str = "REAL"
    data_gaps: List[str] = Field(default_factory=list)


class KnowledgeReportDetailResponse(BaseModel):
    report_id: str
    well_id: Optional[str] = None
    well_name: Optional[str] = None
    wellbore_id: Optional[str] = None
    report_type: str
    title: str
    report_date: Optional[str] = None
    source_file: Optional[str] = None
    text: str
    provenance: str = "REAL"
    reviewed: bool = False
    events: List[EventResponse] = Field(default_factory=list)
    evidence_spans: List[EvidenceSpanDetail] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)


class ActiveWellKnowledgeContextResponse(BaseModel):
    current_position: dict
    nearby_well_coverage: dict
    historical_events: List[dict] = Field(default_factory=list)
    lookahead: LookaheadResponse
    casings: List[dict] = Field(default_factory=list)
    mud_programs: List[dict] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    provenance_breakdown: dict = Field(default_factory=dict)
    disclaimer: str = "Volve is a public North Sea prototype dataset (Block 15/9) and is not operational evidence for Oil India formations. eRTMAC live rig telemetry is explicitly NOT CONNECTED."


# ----------------------------------------------------
# 13. Phase 2: Workspaces, Surfaces, Structures, Probe & Analysis
# ----------------------------------------------------
class WorkspaceResponse(BaseModel):
    id: str
    name: str
    type: str  # REAL_VOLVE or DEMO_ONSHORE
    description: str
    crs: str
    center: dict
    bounds: dict
    provenance: str  # REAL or SYNTHETIC
    well_count: int
    formation_count: int
    disclaimer: Optional[str] = None


class SurfaceSummaryResponse(BaseModel):
    id: str
    name: str
    group_name: str
    age_era: str
    color: str
    average_tvd_m: float
    thickness_m: Optional[float] = None
    lithology: str
    provenance: str = "REAL"


class SurfaceGridResponse(BaseModel):
    id: str
    name: str
    group_name: str
    age_era: str
    color: str
    grid_dim_x: int
    grid_dim_y: int
    origin_x: float
    origin_y: float
    cell_size_m: float
    depth_values: List[List[float]]  # 2D array of TVD values (metric)
    bounds: dict
    lithology: str
    provenance: str = "REAL"


class FaultSegment(BaseModel):
    start: List[float]  # [x, y, z] or [lat, lon, depth]
    end: List[float]


class FaultResponse(BaseModel):
    id: str
    name: str
    fault_type: str = "NORMAL"
    strike_deg: float
    dip_deg: float
    throw_m: float
    depth_range_m: dict
    segments: List[List[float]]  # List of [easting, northing, depth] or [lon, lat, depth]
    provenance: str = "REAL"


class ReservoirResponse(BaseModel):
    id: str
    name: str
    formation: str
    top_tvd_m: float
    base_tvd_m: float
    net_pay_m: float
    avg_porosity_fraction: float
    permeability_md: float
    fluid_type: str = "OIL"
    oil_water_contact_tvd_m: float
    polygon: List[List[float]]  # [lon, lat] or [x, y]
    provenance: str = "REAL"


class TerrainResponse(BaseModel):
    workspace: str
    terrain_type: str  # BATHYMETRY or TOPOGRAPHY
    datum: str
    seabed_depth_m: float
    grid_bounds: dict
    grid_resolution_m: float
    elevation_grid: List[List[float]]
    provenance: str = "REAL"


class GeologyProbeResponse(BaseModel):
    latitude: float
    longitude: float
    depth_m: float
    depth_basis: str = "TVD"
    formation: Optional[str] = None
    group_name: Optional[str] = None
    depth_below_top_m: Optional[float] = None
    lithology: Optional[str] = None
    rock_type: Optional[str] = None
    pore_pressure_emw: Optional[float] = None
    confidence: str = "HIGH"  # HIGH, MODERATE, LOW, UNKNOWN
    data_availability: str = "MEASURED"  # MEASURED, INTERPOLATED, UNKNOWN
    nearby_wells: List[str] = Field(default_factory=list)
    provenance: str = "REAL"
    data_gaps: List[str] = Field(default_factory=list)


class LocationAnalysisFactor(BaseModel):
    factor: str
    status: str  # OK, UNKNOWN, CONCERN
    summary: str
    evidence: str
    source: str
    rule: Optional[str] = None
    provenance: str = "REAL"


class LocationAnalysisResponse(BaseModel):
    latitude: float
    longitude: float
    target_depth_m: float
    target_formation: Optional[str] = None
    workspace: str
    factors: List[LocationAnalysisFactor]
    overall_confidence: str  # HIGH, MEDIUM, MODERATE, LOW, UNKNOWN
    nearby_wells: List[Dict[str, Any]] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    provenance: str = "REAL"
    disclaimer: str


class HorizonPointResponse(BaseModel):
    point_id: int
    horizon_id: str
    horizon_name: str
    group_name: Optional[str] = None
    easting: float
    northing: float
    tvd: float
    local_x: float
    local_y: float
    local_z: float
    lithology: Optional[str] = None
    provenance: str = "REAL"


class FaultStickResponse(BaseModel):
    segment_id: int
    fault_id: str
    fault_name: str
    fault_type: str
    stick_id: int
    top_easting: float
    top_northing: float
    top_tvd: float
    base_easting: float
    base_northing: float
    base_tvd: float
    strike_deg: Optional[float] = None
    dip_deg: Optional[float] = None
    throw_m: Optional[float] = None
    provenance: str = "REAL"


class WellLogCurveSummary(BaseModel):
    curve_name: str
    original_curve_name: str
    unit: Optional[str] = None
    point_count: int
    min_depth_md: float
    max_depth_md: float
    min_value: float
    max_value: float
    provenance: str = "REAL"


class WellLogPoint(BaseModel):
    depth_md: float
    depth_tvd: Optional[float] = None
    value: float
    unit: Optional[str] = None
    quality: str = "VERIFIED_ORIGINAL"


class WellLogCurveResponse(BaseModel):
    well_id: str
    curve_name: str
    original_curve_name: str
    unit: Optional[str] = None
    point_count: int
    points: List[WellLogPoint]
    provenance: str = "REAL"


class MudLogPoint(BaseModel):
    depth_md: float
    depth_tvd: Optional[float] = None
    parameter_name: str
    value: float
    unit: Optional[str] = None


class MudLogResponse(BaseModel):
    well_id: str
    parameter_count: int
    point_count: int
    parameters_available: List[str]
    points: List[MudLogPoint]
    provenance: str = "REAL"


class CasingStringResponse(BaseModel):
    casing_id: str
    wellbore_id: str
    hole_section: Optional[str] = None
    casing_size: Optional[str] = None
    setting_depth_md: Optional[float] = None
    setting_depth_tvd: Optional[float] = None
    cement_top: Optional[float] = None
    source: Optional[str] = None
    provenance: str = "REAL"


class ReservoirPropertyLayer(BaseModel):
    layer: int
    depth_tvd_z: float
    thickness_m: float
    porosity: float
    permeability_md: float
    water_saturation: float
    oil_saturation: float
    facies: str
    provenance: str = "REAL"


class WellReservoirPropertiesResponse(BaseModel):
    well_id: str
    formation: str
    status: str
    average_porosity: Optional[float] = None
    average_permeability_md: Optional[float] = None
    average_oil_saturation: Optional[float] = None
    average_water_saturation: Optional[float] = None
    layers: List[ReservoirPropertyLayer]
    source_file: str
    provenance: str = "REAL"


class WellDataAvailabilityResponse(BaseModel):
    well_id: str
    trajectory: str
    formation_tops: str
    horizons: str
    fault_context: str
    reservoir_grid: str
    gamma_ray: str
    resistivity: str
    density: str
    neutron_porosity: str
    sonic_dt: str
    mud_log: str
    ddr: str
    casing: str
    witsml: str
    provenance: str = "REAL"





