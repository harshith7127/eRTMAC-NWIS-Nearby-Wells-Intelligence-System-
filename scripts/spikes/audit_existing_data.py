#!/usr/bin/env python3
"""
Inspect all existing datasets across data/, data/volve/, data/nwis.db, data/volve/witsml/
"""
import os
import json
import sqlite3
import pandas as pd
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
VOLVE_DIR = os.path.join(DATA_DIR, "volve")
DB_PATH = os.path.join(DATA_DIR, "nwis.db")
WITSML_DIR = os.path.join(VOLVE_DIR, "witsml")

print("=== 1. NWIS.DB AUDIT ===")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in cur.fetchall() if not r[0].startswith("sqlite_")]
print("Tables in nwis.db:", tables)

for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    cnt = cur.fetchone()[0]
    cur.execute(f"PRAGMA table_info({t});")
    cols = [r["name"] for r in cur.fetchall()]
    print(f"Table '{t}': {cnt} rows | cols: {cols}")

print("\n--- WELLS IN NWIS.DB ---")
cur.execute("SELECT well_id, well_name, field, operator, dataset, provenance, latitude, longitude, status FROM wells;")
for r in cur.fetchall():
    print(dict(r))

print("\n--- WELLBORES IN NWIS.DB ---")
cur.execute("SELECT wellbore_id, well_id, name, purpose, status, md_start, md_end, tvd_start, tvd_end FROM wellbores;")
for r in cur.fetchall():
    print(dict(r))

print("\n--- FORMATION TOPS SUMMARY IN NWIS.DB ---")
cur.execute("SELECT wellbore_id, COUNT(*), MIN(md), MAX(md) FROM formation_tops GROUP BY wellbore_id;")
for r in cur.fetchall():
    print(dict(r))

print("\n--- CASINGS SUMMARY IN NWIS.DB ---")
cur.execute("SELECT wellbore_id, COUNT(*), GROUP_CONCAT(casing_size || ' @ ' || setting_depth_md || 'm') FROM casings GROUP BY wellbore_id;")
for r in cur.fetchall():
    print(dict(r))

print("\n--- EVENTS SUMMARY IN NWIS.DB ---")
cur.execute("SELECT event_type, COUNT(*), provenance FROM events GROUP BY event_type, provenance;")
for r in cur.fetchall():
    print(dict(r))

print("\n--- REPORTS SUMMARY IN NWIS.DB ---")
cur.execute("SELECT wellbore_id, report_type, COUNT(*), MIN(report_date), MAX(report_date) FROM reports GROUP BY wellbore_id, report_type;")
for r in cur.fetchall():
    print(dict(r))

conn.close()

print("\n=== 2. CSV LOG DATA AUDIT (Norway-StatoilHydro-15_9-F-4_depth.csv) ===")
csv_path = os.path.join(VOLVE_DIR, "Norway-StatoilHydro-15_9-F-4_depth.csv")
if os.path.exists(csv_path):
    df_csv = pd.read_csv(csv_path, nrows=10)
    print("CSV columns:", df_csv.columns.tolist())
    # Count rows and check depth min/max
    df_csv_full = pd.read_csv(csv_path, usecols=[df_csv.columns[0]])
    print("CSV total rows:", len(df_csv_full))
    # Sample first non-null row
    df_sample = pd.read_csv(csv_path, nrows=50)
    print("Depth col:", df_csv.columns[0])
    for col in df_sample.columns:
        valid_cnt = df_sample[col].notna().sum()
        print(f"  {col}: {valid_cnt}/50 non-null, sample: {df_sample[col].dropna().iloc[0] if valid_cnt > 0 else 'all null'}")

print("\n=== 3. DDR PARQUET AUDIT (ddr_volve.parquet) ===")
ddr_path = os.path.join(VOLVE_DIR, "ddr_volve.parquet")
if os.path.exists(ddr_path):
    df_ddr = pd.read_parquet(ddr_path)
    print("DDR columns:", df_ddr.columns.tolist())
    print("DDR total rows:", len(df_ddr))
    if 'well' in df_ddr.columns or 'wellbore' in df_ddr.columns:
        well_col = 'well' if 'well' in df_ddr.columns else 'wellbore'
        print(f"DDR well coverage ({well_col}):", df_ddr[well_col].value_counts().to_dict())
    print("DDR sample row:")
    print(df_ddr.iloc[0].to_dict())

print("\n=== 4. WITSML XML AUDIT ===")
for fname in os.listdir(WITSML_DIR):
    fpath = os.path.join(WITSML_DIR, fname)
    if fname.endswith(".xml"):
        print(f"\n--- WITSML: {fname} (size {os.path.getsize(fpath)} bytes) ---")
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            print("Root tag:", root.tag)
            # Find log curves or data structure
            curves = []
            for elem in root.iter():
                if 'mnemonic' in elem.tag.lower() or 'curvename' in elem.tag.lower():
                    curves.append(elem.text)
                elif 'logcurveinfo' in elem.tag.lower():
                    m = elem.find('{*}mnemonic')
                    u = elem.find('{*}unit')
                    d = elem.find('{*}curveDescription')
                    curves.append(f"{m.text if m is not None else '?'}:{u.text if u is not None else '?'}")
            if curves:
                print(f"Discovered {len(curves)} curve entries, e.g.:", curves[:15])
            # Check for data records
            data_elems = [e for e in root.iter() if 'data' in e.tag.lower() and e.text and ',' in e.text]
            print("Data record elements found:", len(data_elems))
            if data_elems:
                sample_lines = data_elems[0].text.strip().split('\n')
                print(f"Sample data line count in first block: {len(sample_lines)}, first line: {sample_lines[0] if sample_lines else 'empty'}")
        except Exception as e:
            print("Error parsing XML:", e)
