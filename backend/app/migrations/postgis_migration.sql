-- ==============================================================================
-- SIH-121 / NWIS PostGIS Migration Schema
-- Enterprise PostgreSQL + PostGIS spatial migration script
-- Preserves schema compatibility with SQLite while adding spatial indexing & GIS functions
-- ==============================================================================

-- 1. Initialize PostGIS Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 2. Wells Table with PostGIS Geography Point (WGS84 EPSG:4326)
CREATE TABLE IF NOT EXISTS wells (
    well_id VARCHAR(64) PRIMARY KEY,
    well_name VARCHAR(128) NOT NULL,
    field_name VARCHAR(64) DEFAULT 'Volve',
    operator VARCHAR(128) DEFAULT 'Equinor Energy AS',
    well_type VARCHAR(64) NOT NULL,
    status VARCHAR(64) DEFAULT 'Plugged & Abandoned',
    spud_date DATE,
    completion_date DATE,
    water_depth_m DOUBLE PRECISION DEFAULT 91.0,
    total_depth_m DOUBLE PRECISION NOT NULL,
    easting_ed50 DOUBLE PRECISION,
    northing_ed50 DOUBLE PRECISION,
    utm_zone VARCHAR(16) DEFAULT '31N',
    datum VARCHAR(16) DEFAULT 'ED50',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    provenance VARCHAR(32) DEFAULT 'REAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST Index for Sub-Millisecond Spatial Offset Proximity Queries
CREATE INDEX IF NOT EXISTS idx_wells_geom ON wells USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_wells_operator ON wells(operator);
CREATE INDEX IF NOT EXISTS idx_wells_field ON wells(field_name);

-- 3. Wellbores Table
CREATE TABLE IF NOT EXISTS wellbores (
    wellbore_id VARCHAR(64) PRIMARY KEY,
    well_id VARCHAR(64) REFERENCES wells(well_id) ON DELETE CASCADE,
    wellbore_name VARCHAR(128) NOT NULL,
    purpose VARCHAR(64),
    kickoff_depth_m DOUBLE PRECISION,
    total_depth_md DOUBLE PRECISION NOT NULL,
    total_depth_tvd DOUBLE PRECISION NOT NULL,
    geom_path GEOMETRY(LineStringZ, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wellbores_geom_path ON wellbores USING GIST(geom_path);

-- 4. Trajectory Survey Stations Table
CREATE TABLE IF NOT EXISTS trajectory_stations (
    station_id BIGSERIAL PRIMARY KEY,
    wellbore_id VARCHAR(64) REFERENCES wellbores(wellbore_id) ON DELETE CASCADE,
    md_m DOUBLE PRECISION NOT NULL,
    tvd_m DOUBLE PRECISION NOT NULL,
    inclination_deg DOUBLE PRECISION NOT NULL,
    azimuth_deg DOUBLE PRECISION NOT NULL,
    dx_m DOUBLE PRECISION NOT NULL,
    dy_m DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom_point GEOMETRY(PointZ, 4326)
);
CREATE INDEX IF NOT EXISTS idx_traj_wellbore_md ON trajectory_stations(wellbore_id, md_m);
CREATE INDEX IF NOT EXISTS idx_traj_geom ON trajectory_stations USING GIST(geom_point);

-- 5. Formation Picks / Horizons Table
CREATE TABLE IF NOT EXISTS formation_picks (
    pick_id BIGSERIAL PRIMARY KEY,
    wellbore_id VARCHAR(64) REFERENCES wellbores(wellbore_id) ON DELETE CASCADE,
    formation_name VARCHAR(128) NOT NULL,
    top_md_m DOUBLE PRECISION NOT NULL,
    top_tvd_m DOUBLE PRECISION NOT NULL,
    base_md_m DOUBLE PRECISION,
    base_tvd_m DOUBLE PRECISION,
    lithology VARCHAR(128),
    confidence VARCHAR(32) DEFAULT 'HIGH',
    provenance VARCHAR(32) DEFAULT 'REAL',
    source VARCHAR(128) DEFAULT 'NPD Lithostratigraphic Tops'
);
CREATE INDEX IF NOT EXISTS idx_picks_wb_depth ON formation_picks(wellbore_id, top_md_m);
CREATE INDEX IF NOT EXISTS idx_picks_formation ON formation_picks(formation_name);

-- 6. Geological Faults Table
CREATE TABLE IF NOT EXISTS geological_faults (
    fault_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    workspace VARCHAR(64) DEFAULT 'volve',
    strike_deg DOUBLE PRECISION,
    dip_deg DOUBLE PRECISION,
    dip_direction VARCHAR(16),
    throw_m DOUBLE PRECISION,
    top_tvd_m DOUBLE PRECISION,
    base_tvd_m DOUBLE PRECISION,
    geom_surface GEOMETRY(PolygonZ, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_faults_geom ON geological_faults USING GIST(geom_surface);

-- 7. Reservoirs Table
CREATE TABLE IF NOT EXISTS reservoirs (
    reservoir_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    workspace VARCHAR(64) DEFAULT 'volve',
    formation VARCHAR(128) NOT NULL,
    top_tvd_m DOUBLE PRECISION,
    base_tvd_m DOUBLE PRECISION,
    net_pay_m DOUBLE PRECISION,
    avg_porosity DOUBLE PRECISION,
    permeability_md DOUBLE PRECISION,
    geom_poly GEOMETRY(Polygon, 4326)
);
CREATE INDEX IF NOT EXISTS idx_reservoirs_geom ON reservoirs USING GIST(geom_poly);

-- 8. Spatial Proximity Function (Replacement for sqlite Euclidean approximation)
CREATE OR REPLACE FUNCTION find_offset_wells_within_radius(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    well_id VARCHAR,
    well_name VARCHAR,
    distance_meters DOUBLE PRECISION,
    total_depth_m DOUBLE PRECISION,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.well_id,
        w.well_name,
        ST_Distance(w.geom::geography, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography) AS distance_meters,
        w.total_depth_m,
        w.status
    FROM wells w
    WHERE ST_DWithin(w.geom::geography, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography, p_radius_meters)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;
