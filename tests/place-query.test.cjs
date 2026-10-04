const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadModule(name, extraContext = {}) {
  const candidatePaths = [
    path.join(__dirname, '../public/' + name),
    path.join(__dirname, '../dist/' + name),
    path.join(__dirname, '../dist/client/' + name)
  ];
  const targetPath = candidatePaths.find(p => fs.existsSync(p));
  if (!targetPath) throw new Error('Cannot find file: ' + name);
  const ctx = {
    module: { exports: {} },
    window: {},
    console: console,
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    },
    ...extraContext
  };
  vm.runInNewContext(fs.readFileSync(targetPath, 'utf8'), ctx);
  return { exports: ctx.module.exports, window: ctx.window };
}

// 1. Load NWIS Data & API Client
console.log('Loading NWIS Data & API Client modules...');
const nwis = loadModule('nwis-data.js').window.NWIS_DATA;
assert.ok(nwis, 'NWIS_DATA module must be defined on window');

const apiClientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwis } });
const apiClient = apiClientMod.window.NWIS_API || apiClientMod.exports;
assert.ok(apiClient, 'NWIS_API client must be available');
assert.ok(typeof apiClient.getPlaceQuery === 'function', 'getPlaceQuery must be a function on NWIS_API');

// 2. Test Offline Place Query Execution
console.log('Testing Offline Place Query default parameters...');
const defaultResult = apiClient._executeLocalPlaceQuery({});
assert.ok(defaultResult, 'Place query result must not be null');
assert.ok(defaultResult.query, 'Result must contain query echo');
assert.equal(typeof defaultResult.query.latitude, 'number');
assert.equal(typeof defaultResult.query.longitude, 'number');
assert.ok(defaultResult.query.radius_km > 0, 'Radius must be positive');
assert.ok(Array.isArray(defaultResult.nearby_wells), 'nearby_wells must be an array');
assert.ok(defaultResult.nearby_wells.length > 0, 'Should find nearby wells around default Volve coordinates');

// 3. Test Nearby Well Properties & Closest Approach
console.log('Testing Nearby Well properties & Trajectory Closest Approach...');
const firstWell = defaultResult.nearby_wells[0];
assert.ok(firstWell.well_id, 'Nearby well must have well_id');
assert.ok(firstWell.well_name, 'Nearby well must have well_name');
assert.ok(typeof firstWell.distance_km === 'number', 'distance_km must be numeric');
assert.ok(typeof firstWell.closest_approach_m === 'number', 'closest_approach_m must be numeric');
assert.ok(['SUBSURFACE_SURVEY', 'WELLHEAD_FALLBACK'].includes(firstWell.trajectory_basis),
  'trajectory_basis must be SUBSURFACE_SURVEY or WELLHEAD_FALLBACK');
assert.ok(firstWell.provenance, 'Nearby well must have provenance label');

// 4. Test Depth Window Event Matching
console.log('Testing Depth Window Event Filtering...');
const depthResult = apiClient._executeLocalPlaceQuery({
  latitude: 58.441636,
  longitude: 1.887483,
  radius_km: 5.0,
  depth_m: 3200
});
assert.ok(depthResult.drilling_events, 'Result must have drilling_events array');
if (depthResult.drilling_events.length > 0) {
  const ev = depthResult.drilling_events[0];
  assert.ok(ev.event_type, 'Event must have event_type');
  assert.ok(ev.wellbore_name || ev.well_name, 'Event must trace to wellbore');
  assert.equal(ev.reviewed, false, 'Event reviewed status must be explicit false');
}

// 5. Test Explicit Data Gaps (No Fake Scores)
console.log('Testing Explicit Data Gaps list...');
assert.ok(Array.isArray(defaultResult.data_gaps), 'data_gaps must be an array');
defaultResult.data_gaps.forEach(gap => {
  assert.ok(gap.well_name, 'Data gap must reference well_name');
  assert.ok(gap.gap_type, 'Data gap must state gap_type');
  assert.ok(gap.description, 'Data gap must explain gap description');
});

// 6. Test Radius Filtering Range
console.log('Testing Radius Filtering Range...');
const narrowResult = apiClient._executeLocalPlaceQuery({
  latitude: 58.441636,
  longitude: 1.887483,
  radius_km: 0.2
});
const wideResult = apiClient._executeLocalPlaceQuery({
  latitude: 58.441636,
  longitude: 1.887483,
  radius_km: 10.0
});
assert.ok(narrowResult.nearby_wells.length <= wideResult.nearby_wells.length,
  'Narrow radius must return fewer or equal wells than wide radius');

// 7. Test Provenance Breakdown Consistency
console.log('Testing Centralized Provenance Breakdown...');
assert.ok(defaultResult.provenance_breakdown, 'Result must include provenance_breakdown');
assert.ok(typeof defaultResult.provenance_breakdown.REAL === 'number', 'REAL count must exist');
assert.ok(typeof defaultResult.provenance_breakdown.SYNTHETIC === 'number', 'SYNTHETIC count must exist');

console.log('All Place Query JavaScript tests passed successfully!');
