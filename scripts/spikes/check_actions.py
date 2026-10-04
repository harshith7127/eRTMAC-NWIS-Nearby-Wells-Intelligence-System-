import os
import sys
import sqlite3
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.app.services.knowledge_service import search_knowledge

conn = sqlite3.connect('data/nwis.db')
conn.row_factory = sqlite3.Row
res = search_knowledge(conn, limit=50)
print('Total count:', res['total_count'])
print('Results length:', len(res['results']))
with_actions = [r for r in res['results'] if r.get('historical_practice')]
print('With actions count in top 50:', len(with_actions))

cur = conn.cursor()
cur.execute("SELECT count(*) FROM events WHERE action IS NOT NULL AND action != '';")
print('Events in DB with non-empty action:', cur.fetchone()[0])
cur.execute("SELECT event_id, action FROM events WHERE action IS NOT NULL LIMIT 5;")
for r in cur.fetchall():
    print(" ", r)
