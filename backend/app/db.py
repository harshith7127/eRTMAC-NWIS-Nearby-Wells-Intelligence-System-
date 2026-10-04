"""
NWIS Database Module — Canonical SQLite Connection & Schema Management
Enforces foreign keys, WAL journaling, and strict indexing.
"""

import os
import sqlite3
from typing import Generator
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "data", "nwis.db")


def get_db_path() -> str:
    return os.environ.get("NWIS_DB_PATH", DEFAULT_DB_PATH)


def get_db_connection(db_path: str = None) -> sqlite3.Connection:
    target_path = db_path or get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    conn = sqlite3.connect(target_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_db_context(db_path: str = None) -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()


def init_db(db_path: str = None) -> None:
    """Initialize canonical NWIS schema and performance indexes."""
    conn = get_db_connection(db_path)
    try:
        with conn:
            # 1. Wells
            conn.execute("""
            CREATE TABLE IF NOT EXISTS wells (
                well_id TEXT PRIMARY KEY,
                well_name TEXT NOT NULL,
                field TEXT NOT NULL,
                operator TEXT NOT NULL,
                dataset TEXT NOT NULL,
                provenance TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                spud_date TEXT,
                completion_date TEXT,
                status TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # 2. Wellbores
            conn.execute("""
            CREATE TABLE IF NOT EXISTS wellbores (
                wellbore_id TEXT PRIMARY KEY,
                well_id TEXT NOT NULL REFERENCES wells(well_id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                purpose TEXT,
                status TEXT,
                md_start REAL,
                md_end REAL,
                tvd_start REAL,
                tvd_end REAL,
                trajectory_source TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 3. Surveys (Trajectory)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS surveys (
                survey_id TEXT PRIMARY KEY,
                wellbore_id TEXT NOT NULL REFERENCES wellbores(wellbore_id) ON DELETE CASCADE,
                md REAL NOT NULL,
                inclination REAL NOT NULL,
                azimuth REAL NOT NULL,
                tvd REAL,
                tvdss REAL,
                northing REAL,
                easting REAL,
                timestamp TEXT,
                source TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 4. Formation Tops
            conn.execute("""
            CREATE TABLE IF NOT EXISTS formation_tops (
                formation_top_id TEXT PRIMARY KEY,
                wellbore_id TEXT NOT NULL REFERENCES wellbores(wellbore_id) ON DELETE CASCADE,
                formation_name TEXT NOT NULL,
                formation_name_canonical TEXT,
                md REAL NOT NULL,
                tvd REAL,
                tvdss REAL,
                source TEXT,
                provenance TEXT NOT NULL,
                reviewed INTEGER NOT NULL DEFAULT 0
            );
            """)

            # 4b. Formation Aliases (Controlled Vocabulary)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS formation_aliases (
                alias TEXT PRIMARY KEY,
                canonical_name TEXT NOT NULL,
                source TEXT NOT NULL,
                provenance TEXT NOT NULL
            );
            """)

            # 5. Reports (DDRs, WCRs, Mud Logs)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                report_id TEXT PRIMARY KEY,
                wellbore_id TEXT REFERENCES wellbores(wellbore_id) ON DELETE SET NULL,
                report_type TEXT NOT NULL,
                title TEXT NOT NULL,
                report_date TEXT,
                source_file TEXT,
                source_uri TEXT,
                text TEXT NOT NULL,
                provenance TEXT NOT NULL,
                extraction_status TEXT,
                reviewed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """)

            # 6. Events (Losses, Kicks, Stuck Pipe, Influx, etc.)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                wellbore_id TEXT REFERENCES wellbores(wellbore_id) ON DELETE SET NULL,
                report_id TEXT REFERENCES reports(report_id) ON DELETE SET NULL,
                event_type TEXT NOT NULL,
                severity TEXT,
                md REAL,
                md_start REAL,
                md_end REAL,
                tvd REAL,
                formation_name TEXT,
                depth_basis TEXT NOT NULL DEFAULT 'MD',
                description TEXT NOT NULL,
                cause TEXT,
                action TEXT,
                outcome TEXT,
                reviewed INTEGER NOT NULL DEFAULT 0,
                excluded INTEGER NOT NULL DEFAULT 0,
                provenance TEXT NOT NULL,
                source_text TEXT,
                evidence_start INTEGER,
                evidence_end INTEGER,
                created_at TEXT NOT NULL
            );
            """)

            # 7. Casing Program
            conn.execute("""
            CREATE TABLE IF NOT EXISTS casings (
                casing_id TEXT PRIMARY KEY,
                wellbore_id TEXT NOT NULL REFERENCES wellbores(wellbore_id) ON DELETE CASCADE,
                hole_section TEXT,
                casing_size TEXT,
                setting_depth_md REAL,
                setting_depth_tvd REAL,
                cement_top REAL,
                cement_bottom REAL,
                source TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 8. Mud Program
            conn.execute("""
            CREATE TABLE IF NOT EXISTS mud_programs (
                mud_program_id TEXT PRIMARY KEY,
                wellbore_id TEXT NOT NULL REFERENCES wellbores(wellbore_id) ON DELETE CASCADE,
                md_start REAL,
                md_end REAL,
                mud_weight REAL,
                mud_type TEXT,
                viscosity REAL,
                source TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 9. Geological Horizons (Continuous 3D Surface Point Clouds)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS geological_horizons (
                point_id INTEGER PRIMARY KEY AUTOINCREMENT,
                horizon_id TEXT NOT NULL,
                horizon_name TEXT NOT NULL,
                group_name TEXT,
                easting REAL NOT NULL,
                northing REAL NOT NULL,
                tvd REAL NOT NULL,
                local_x REAL NOT NULL,
                local_y REAL NOT NULL,
                local_z REAL NOT NULL,
                lithology TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 10. Fault Segments (3D Fault Sticks and Polylines)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS fault_segments (
                segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                fault_id TEXT NOT NULL,
                fault_name TEXT NOT NULL,
                fault_type TEXT NOT NULL,
                stick_id INTEGER NOT NULL,
                top_easting REAL NOT NULL,
                top_northing REAL NOT NULL,
                top_tvd REAL NOT NULL,
                base_easting REAL NOT NULL,
                base_northing REAL NOT NULL,
                base_tvd REAL NOT NULL,
                strike_deg REAL,
                dip_deg REAL,
                throw_m REAL,
                provenance TEXT NOT NULL
            );
            """)

            # 11. Well Logs (Petrophysical Wireline/LWD Curves)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS well_logs (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                well_id TEXT NOT NULL,
                wellbore_id TEXT NOT NULL,
                depth_md REAL NOT NULL,
                depth_tvd REAL,
                depth_reference TEXT NOT NULL DEFAULT 'KB',
                curve_name TEXT NOT NULL,
                original_curve_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                source_file TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 12. Mud Logs (Surface Drilling Logging Telemetry)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS mud_logs (
                mud_id INTEGER PRIMARY KEY AUTOINCREMENT,
                well_id TEXT NOT NULL,
                wellbore_id TEXT NOT NULL,
                depth_md REAL NOT NULL,
                depth_tvd REAL,
                depth_reference TEXT NOT NULL DEFAULT 'KB',
                parameter_name TEXT NOT NULL,
                original_parameter_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                source_file TEXT,
                provenance TEXT NOT NULL
            );
            """)

            # 13. Well Data Availability (Truthful Multi-Category Status Matrix)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS well_data_availability (
                well_id TEXT PRIMARY KEY,
                trajectory TEXT NOT NULL,
                formation_tops TEXT NOT NULL,
                horizons TEXT NOT NULL,
                fault_context TEXT NOT NULL,
                reservoir_grid TEXT NOT NULL,
                gamma_ray TEXT NOT NULL,
                resistivity TEXT NOT NULL,
                density TEXT NOT NULL,
                neutron_porosity TEXT NOT NULL,
                sonic_dt TEXT NOT NULL,
                mud_log TEXT NOT NULL,
                ddr TEXT NOT NULL,
                casing TEXT NOT NULL,
                witsml TEXT NOT NULL,
                provenance TEXT NOT NULL
            );
            """)

            # Schema evolution / migration checks for existing tables
            cursor = conn.execute("PRAGMA table_info(formation_tops);")
            top_cols = [c["name"] if isinstance(c, sqlite3.Row) else c[1] for c in cursor.fetchall()]
            if "formation_name_canonical" not in top_cols:
                conn.execute("ALTER TABLE formation_tops ADD COLUMN formation_name_canonical TEXT;")

            # Indexes for Query Optimization
            conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_horizons_id ON geological_horizons(horizon_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_geo_horizons_spatial ON geological_horizons(easting, northing);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_fault_segments_id ON fault_segments(fault_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_wells_dataset ON wells(dataset);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_wells_provenance ON wells(provenance);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_wellbores_well_id ON wellbores(well_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_surveys_wellbore_md ON surveys(wellbore_id, md);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_formations_wellbore_md ON formation_tops(wellbore_id, md);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_formations_name ON formation_tops(formation_name);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_formations_name_canonical ON formation_tops(formation_name_canonical);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_formation_aliases_canonical ON formation_aliases(canonical_name);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_well_logs_well_curve ON well_logs(well_id, curve_name);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_well_logs_depth ON well_logs(well_id, depth_md);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mud_logs_well_param ON mud_logs(well_id, parameter_name);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mud_logs_depth ON mud_logs(well_id, depth_md);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_wellbore_date ON reports(wellbore_id, report_date);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_wellbore_md ON events(wellbore_id, md);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_formation ON events(formation_name);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_reviewed ON events(reviewed);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_excluded ON events(excluded);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_report ON events(report_id);")

            # Seed Default Formation Aliases (Controlled Vocabulary from Volve / NPD nomenclature)
            default_aliases = [
                ("Hugin", "Hugin", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Hugin Fm.", "Hugin", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Hugin Formation", "Hugin", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Skade", "Skade", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Skade Fm.", "Skade", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Skade Formation", "Skade", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Ty", "Ty", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Ty Fm.", "Ty", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Ty Formation", "Ty", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Heimdal", "Heimdal", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Heimdal Fm.", "Heimdal", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Heimdal Formation", "Heimdal", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Utsira", "Utsira", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Utsira Fm.", "Utsira", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Utsira Formation", "Utsira", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Upper Hordaland Shale", "Upper Hordaland Shale", "Volve Well Reports", "REAL"),
                ("Hordaland Gp.", "Hordaland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Hordaland Group", "Hordaland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Sleipner", "Sleipner", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Sleipner Fm.", "Sleipner", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Sleipner Formation", "Sleipner", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Nordland Gp.", "Nordland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Nordland Group", "Nordland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Rogaland Gp.", "Rogaland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Rogaland Group", "Rogaland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Shetland Gp.", "Shetland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Shetland Group", "Shetland Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Cromer Knoll Gp.", "Cromer Knoll Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Cromer Knoll Group", "Cromer Knoll Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Viking Gp.", "Viking Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Viking Group", "Viking Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Draupne", "Draupne", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Draupne Fm.", "Draupne", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Statfjord", "Statfjord", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Statfjord Gp.", "Statfjord Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Statfjord Group", "Statfjord Group", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Gassum", "Gassum", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Skagerrak", "Skagerrak", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Smith Bank", "Smith Bank", "Norwegian Offshore Directorate (NOD)", "REAL"),
                ("Jodhpur Sandstone", "Jodhpur Sandstone", "Synthetic Demo Nomenclature", "SYNTHETIC"),
                ("Lower Reactive Shale", "Lower Reactive Shale", "Synthetic Demo Nomenclature", "SYNTHETIC"),
                ("Basal Sandstone", "Basal Sandstone", "Synthetic Demo Nomenclature", "SYNTHETIC"),
                ("Basement Gneiss", "Basement Gneiss", "Synthetic Demo Nomenclature", "SYNTHETIC")
            ]

            for alias, canonical, src, prov in default_aliases:
                conn.execute("""
                INSERT OR IGNORE INTO formation_aliases (alias, canonical_name, source, provenance)
                VALUES (?, ?, ?, ?);
                """, (alias, canonical, src, prov))

            # Backfill any null formation_name_canonical in formation_tops
            conn.execute("""
            UPDATE formation_tops
            SET formation_name_canonical = COALESCE(
                (SELECT canonical_name FROM formation_aliases WHERE alias = formation_tops.formation_name),
                formation_tops.formation_name
            )
            WHERE formation_name_canonical IS NULL;
            """)

    finally:
        conn.close()
