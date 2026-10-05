/**
 * Canonical TypeScript Interfaces for SIH-121 Exploration Intelligence Platform
 * UX4G / Geoscience Standards Compliance
 */

export type ProvenanceOrigin = 'REAL' | 'DERIVED' | 'SYNTHETIC';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'MODERATE' | 'LOW' | 'UNKNOWN';

// Canonical Exploration Application Modes (including Dashboard with legacy aliases)
export type CanonicalAppMode = 'DASHBOARD' | 'MAP' | 'SUBSURFACE' | 'NEAR_WELL' | 'COMPARISON' | 'ANALYSIS' | 'REPORT';
export type LegacyAppMode = 'dashboard' | 'surface' | 'subsurface' | 'near-well' | 'comparison' | 'analysis' | 'report';
export type AppMode = CanonicalAppMode | LegacyAppMode;

export type ThemeMode = 'light' | 'dark';
export type DepthBasis = 'MD' | 'TVD';

export const DATA_NOT_AVAILABLE = 'DATA NOT AVAILABLE';
export const INSUFFICIENT_DATA = 'INSUFFICIENT DATA';

export interface ProvenanceMetadata {
  data_origin: ProvenanceOrigin;
  source: string;
  method?: string;
  confidence?: ConfidenceLevel | number;
  as_of?: string;
}

export interface Workspace {
  id: string;
  name: string;
  crs: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lon, lat]
  description: string;
  defaultOrigin: ProvenanceOrigin;
  bannerText: string;
  type?: string;
}

export interface Well {
  id: string;
  name: string;
  workspace_id: string;
  lat: number;
  lon: number;
  utm_e?: number;
  utm_n?: number;
  elevation_m?: number;
  water_depth_m?: number;
  kb_elev_m?: number;
  type: string;
  status: string;
  total_depth_m: number;
  final_tvd_m?: number;
  operator: string;
  spud_date?: string;
  completion_date?: string;
  provenance: ProvenanceOrigin;
  dataset: string;
  has_surveys?: boolean;
  has_reports?: boolean;
  has_logs?: boolean;
}

export interface Wellbore {
  wellbore_id: string;
  well_id: string;
  name: string;
  purpose?: string;
  status?: string;
  md_start?: number;
  md_end?: number;
  tvd_start?: number;
  tvd_end?: number;
  trajectory_source?: string;
  provenance: ProvenanceOrigin;
}

export interface TrajectoryStation {
  station_id: string;
  wellbore_id: string;
  md: number;
  inclination: number;
  azimuth: number;
  tvd: number;
  tvdss?: number;
  northing: number;
  easting: number;
  provenance: ProvenanceOrigin;
}

export interface FormationPick {
  id: string;
  wellbore_id: string;
  formation_name: string;
  canonical_name?: string;
  top_md: number;
  base_md?: number;
  top_tvd?: number;
  base_tvd?: number;
  rock_type?: string;
  age?: string;
  lithology?: string;
  source: string;
  provenance: ProvenanceOrigin;
}

export interface DrillingEvent {
  event_id: string;
  wellbore_id: string;
  report_id?: string;
  event_type: string;
  severity?: string;
  md: number;
  tvd?: number;
  formation_name?: string;
  description: string;
  cause?: string;
  action?: string;
  outcome?: string;
  reviewed: boolean;
  excluded: boolean;
  source_text?: string;
  provenance: ProvenanceOrigin;
}

export interface DailyReport {
  report_id: string;
  wellbore_id: string;
  report_type: string;
  title: string;
  report_date: string;
  text: string;
  provenance: ProvenanceOrigin;
  extraction_status: string;
  reviewed: boolean;
}

export interface LookaheadResult {
  well_id: string;
  target_depth_md: number;
  lookahead_window_m: number;
  target_formation: string;
  status: 'NO_HAZARD_OBSERVED' | 'HAZARD_IDENTIFIED' | 'NO_DATA' | 'INSUFFICIENT_DATA';
  covered_offset_wells: number;
  offset_wells_with_events: number;
  k_of_n_text: string;
  events: DrillingEvent[];
  historical_practices: Array<{
    well_id: string;
    event_type: string;
    mitigation_action: string;
    source_report_id: string;
  }>;
  provenance: ProvenanceMetadata;
}

export interface SiteAnalysisFactor {
  factor: string;
  value?: string;
  unit?: string;
  source: string;
  origin?: ProvenanceOrigin;
  provenance?: ProvenanceOrigin;
  status: 'OK' | 'UNKNOWN' | 'CONCERN';
  rule_text?: string;
  rule?: string;
  evidence?: string;
  summary?: string;
}

export interface SiteAnalysisSummary {
  location: { lat: number; lon: number };
  factors: SiteAnalysisFactor[];
  completeness: { total: number; available: number };
  concerns_count: number;
  provenance: ProvenanceMetadata | ProvenanceOrigin;
  target_depth_m?: number;
  target_formation?: string;
  workspace?: string;
  overall_confidence?: ConfidenceLevel;
  disclaimer?: string;
  nearby_wells?: any[];
  data_gaps?: string[];
}

export type LocationAnalysisResponse = SiteAnalysisSummary;

export interface LayerConfig {
  id: string;
  name: string;
  group: 'SURFACE' | 'SUBSURFACE' | 'WELLS' | 'DATA';
  visible: boolean;
  opacity: number;
  origin: ProvenanceOrigin;
  available: boolean;
  unavailableReason?: string;
}

// Surfaces & Structural Horizons
export interface SurfaceSummary {
  surface_id: string;
  surface_name: string;
  formation_group?: string;
  avg_depth_tvd_m: number;
  thickness_m?: number;
  lithology?: string;
  provenance: ProvenanceOrigin;
}

export interface SurfaceGrid {
  surface_id: string;
  surface_name: string;
  crs: string;
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  resolution_x: number;
  resolution_y: number;
  depths_tvd: number[][]; // 2D regular grid
  provenance: ProvenanceOrigin;
}

// Faults
export interface FaultSegment {
  stick_id: string;
  top_easting: number;
  top_northing: number;
  top_tvd: number;
  base_easting: number;
  base_northing: number;
  base_tvd: number;
}

export interface Fault {
  fault_id: string;
  fault_name: string;
  fault_type: string;
  strike_deg: number;
  dip_deg: number;
  throw_m: number;
  provenance: ProvenanceOrigin;
  segments?: FaultSegment[];
}

// Reservoirs
export interface Reservoir {
  reservoir_id: string;
  reservoir_name: string;
  formation_name: string;
  top_tvd_m: number;
  base_tvd_m: number;
  porosity_avg: number;
  permeability_md_avg: number;
  oil_water_contact_tvd_m?: number;
  provenance: ProvenanceOrigin;
}

// Terrain & Bathymetry
export interface TerrainData {
  workspace: string;
  datum: string;
  min_elevation_m: number;
  max_elevation_m: number;
  water_depth_avg_m: number;
  grid_resolution: number;
  elevations: number[][];
  provenance: ProvenanceOrigin;
}

// Geology Probe
export interface GeologyProbeResult {
  latitude: number;
  longitude: number;
  depth_m: number;
  depth_basis: DepthBasis;
  workspace: string;
  formation: string;
  group_name?: string;
  formation_top_tvd_m?: number;
  formation_base_tvd_m?: number;
  lithology: string;
  data_availability: 'MEASURED' | 'INTERPOLATED' | 'EXTRAPOLATED' | 'MODELLED' | 'DATA_NOT_AVAILABLE';
  confidence: ConfidenceLevel;
  provenance: ProvenanceOrigin;
  nearby_wells: string[];
}

// Well Logs & Mud Logs Telemetry
export interface WellLogPoint {
  depth_md: number;
  depth_tvd?: number;
  gamma_ray?: number;
  resistivity_28in?: number;
  resistivity_40in?: number;
  bulk_density?: number;
  neutron_porosity?: number;
  sonic_dt?: number;
}

export interface MudLogSample {
  depth_md: number;
  rop_m_hr?: number;
  wob_kdn?: number;
  rpm?: number;
  torque_knm?: number;
  spp_kpa?: number;
  flow_in_lpm?: number;
  flow_out_pct?: number;
  ecd_sg?: number;
  total_gas_pct?: number;
  c1_methane_ppm?: number;
}

export interface CasingSection {
  casing_id: string;
  well_id: string;
  section_type: string;
  nominal_od_in: number;
  nominal_id_in?: number;
  top_md_m: number;
  shoe_depth_md_m: number;
  shoe_depth_tvd_m?: number;
  provenance: ProvenanceOrigin;
}

export interface DataAvailability {
  well_id: string;
  has_surveys: boolean;
  has_formation_tops: boolean;
  has_well_logs: boolean;
  has_mud_logs: boolean;
  has_casing: boolean;
  has_reservoir_props: boolean;
  has_ddr_reports: boolean;
  provenance: ProvenanceOrigin;
}
