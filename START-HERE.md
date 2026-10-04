# NWIS — SIH26121 prototype

This is a browser-based evidence comparison prototype. The deployed application is in `dist/`; the older framework scaffold is not used by the static deployment.

## Run

Open `dist/index.html` in a modern browser, or run `python -m http.server 4174 --directory dist` from this folder and visit http://localhost:4174. No npm installation or API key is required.

## Demo journey

1. Set active well, depth, depth type (MD/TVD), radius, and depth window. Run comparison.
2. Open a signal to inspect its exact report line, correct its depth, record a note, and mark reviewed or exclude.
3. In Overview, use the 3D spatial workspace: drag to orbit, Shift-drag to pan, and scroll to zoom. Independent X/Y/Z sliders, camera presets, a depth scale, incident markers, and PNG export help explain the comparison. Switch to the 2D map when needed. Wells are vertical schematics; surveyed trajectories are still required for field use.
4. In Reports, import a TXT report, selectable-text PDF, or CSV well register. Scanned PDFs need OCR first. Download the CSV template for the expected columns.
5. In Data sources, export a team workspace JSON and import it on another device, or optionally enable local browser saving. Export matching signals CSV when needed.
6. Use the top controls to switch English, हिन्दी, or मराठी, choose System/Day/Night appearance, and open Help for keyboard shortcuts.
7. Click a depth-explorer interval to compare at its midpoint. Use Review next passage to verify evidence, then Create evidence brief to download an HTML summary with sources and review notes. Open it in a browser and Print to save as PDF. Some detailed workspace labels remain in English.

All starting data is synthetic. Imported data stays in the browser. Saving is opt-in and device-local. JSON is a portable team handoff; it is not a shared cloud database.

## Boundaries

The application uses deterministic keyword extraction and coordinate/depth/formation matching. It is not a trained predictor. PDF extraction reads selectable text only; OCR, semantic extraction, shared backend storage, real-time telemetry, survey-based MD/TVD conversion, stratigraphic alignment, and operational validation remain outside this static prototype. No invented confidence probabilities or live telemetry are shown.

## Validation

Run `node tests/engine.test.cjs`. The tests cover distance calculations, filtering boundaries, negation handling, missing depths, malformed CSV, and exclusion.
