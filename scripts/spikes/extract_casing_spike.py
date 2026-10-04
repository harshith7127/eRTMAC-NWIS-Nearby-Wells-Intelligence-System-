import os
import re
import pandas as pd
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ddr_path = os.path.join(BASE_DIR, 'data', 'volve', 'ddr_volve.parquet')
df = pd.read_parquet(ddr_path)

casing_regex = re.compile(r'(\b\d{1,2}(?:[\s\-\/\.]*(?:3\/8|5\/8|1\/2|3\/4|1\/4))?[\"\s]*(?:casing|liner|csg))\b[^\.\n;]{0,60}?\b(?:at|to|depth|shoe|landed|set|m)\b[^\.\n;]{0,20}?(\d{3,4}(?:\.\d+)?)\s*m', re.IGNORECASE)

records = []
for idx, row in df.iterrows():
    text = (str(row['input']) + ' ' + str(row['output']))
    inst = row['instruction']
    m_well = re.search(r'well\s+(NO\s+15/[0-9]-[A-Z0-9\s_-]+?)\s+on\s+(\d{4}-\d{2}-\d{2})', inst, re.IGNORECASE)
    well_name = m_well.group(1).strip() if m_well else 'Unknown'
    date_str = m_well.group(2) if m_well else 'Unknown'
    
    matches = casing_regex.findall(text)
    for c_name, depth_str in matches:
        depth = float(depth_str)
        if 100.0 <= depth <= 5000.0:
            records.append((well_name, c_name.strip(), depth, date_str, text[:150]))

print(f"Total matching casing operations: {len(records)}")
grouped = defaultdict(list)
for w, c_name, depth, dt, snippet in records:
    grouped[w].append((c_name, depth, dt))

for w in sorted(grouped.keys()):
    print(f"\n=== WELL {w} ===")
    seen = set()
    for c_name, depth, dt in sorted(grouped[w], key=lambda x: x[1]):
        key = (c_name.lower(), round(depth, -1))
        if key not in seen:
            seen.add(key)
            print(f"   {c_name} @ {depth} m ({dt})")
