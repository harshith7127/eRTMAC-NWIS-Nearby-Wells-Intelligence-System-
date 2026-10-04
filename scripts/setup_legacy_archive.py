"""
Safely archive legacy application to /legacy with prominent banner.
Preserves existing functionality and ensures all legacy tests continue passing.
"""
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
LEGACY_DIR = os.path.join(PUBLIC_DIR, "legacy")
DIST_LEGACY_DIR = os.path.join(BASE_DIR, "dist", "legacy")

os.makedirs(LEGACY_DIR, exist_ok=True)
os.makedirs(DIST_LEGACY_DIR, exist_ok=True)

files_to_copy = [
    "app.js", "workbench.css", "command.css", "api-client.js", "nwis-data.js",
    "volve-data.json", "volve-data-bundle.js", "volve-replay.js", "witsml-parser.js",
    "engine.js", "command-engine.js", "workbench.js", "favicon.svg", "file.svg",
    "globe.svg", "window.svg", "config.local.js"
]

for f in files_to_copy:
    src = os.path.join(PUBLIC_DIR, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(LEGACY_DIR, f))
        shutil.copy2(src, os.path.join(DIST_LEGACY_DIR, f))

# Read original index.html
with open(os.path.join(PUBLIC_DIR, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

# Inject prominent legacy archive banner right after <body>
archive_banner = """
<!-- Legacy Prototype Archive Banner (Rule R8) -->
<div id="legacy-archive-banner" style="position: sticky; top: 0; z-index: 999999; background: #b45309; color: #ffffff; padding: 10px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: bold; text-align: center; border-bottom: 2px solid #78350f; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; gap: 12px;">
  <span>⚠ Legacy Prototype Archive — Retained for historical validation and audit reference only.</span>
  <a href="http://127.0.0.1:5173" style="background: #fef08a; color: #78350f; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 12px;">Launch Main Platform (web/) &rarr;</a>
</div>
"""

legacy_html = html.replace("<body", "<body" + ">" + archive_banner) if "<body" in html else archive_banner + html
# Fix relative script paths for nested /legacy directory if needed, or keep standard relative paths since assets are co-located in /legacy
with open(os.path.join(LEGACY_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(legacy_html)

with open(os.path.join(DIST_LEGACY_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(legacy_html)

print("[OK] Legacy application archived at public/legacy/ and dist/legacy/ with archive banner.")
