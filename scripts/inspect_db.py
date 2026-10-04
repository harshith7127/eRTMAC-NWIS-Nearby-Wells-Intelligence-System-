import sqlite3
import json

conn = sqlite3.connect('data/nwis.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in c.fetchall()]

stats = {}
for t in tables:
    if not t.startswith('sqlite_'):
        count = c.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        c.execute(f'PRAGMA table_info("{t}")')
        cols = [r[1] for r in c.fetchall()]
        stats[t] = {"count": count, "columns": cols}

print(json.dumps(stats, indent=2))
