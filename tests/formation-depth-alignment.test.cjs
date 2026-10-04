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
console.log('Loading NWIS Data & API Client for Phase 3 tests...');
const nwis = loadModule('nwis-data.js').window.NWIS_DATA;
assert.ok(nwis, 'NWIS_DATA module must be defined on window');

const apiClientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwis } });
const apiClient = apiClientMod.window.NWIS_API || apiClientMod.window.nwisApi || apiClientMod.exports;
assert.ok(apiClient, 'NWIS_API client must be available');

// 2. Test Local Formation at Depth Retrieval
console.log('Testing Formation at Depth & Relative Depth below Top...');
assert.equal(typeof apiClient.getFormationAtDepth, 'function', 'getFormationAtDepth must exist');
const formRes = apiClient._executeLocalFormationAtDepth('15/9-F-12-WB1', 1842.5);
assert.ok(formRes, 'Formation at depth result must exist');
assert.equal(formRes.wellbore_id, '15/9-F-12-WB1');
assert.ok(formRes.formation_name_canonical, 'Must have canonical formation name');
assert.ok(formRes.depth_below_top_md >= 0, 'Depth below top must be non-negative');
assert.equal(formRes.depth_basis, 'MD');
assert.equal(formRes.alignment_basis, 'FORMATION_TOP_MD');
assert.equal(formRes.provenance, 'DERIVED');

// 3. Test Above First Formation Top
console.log('Testing Target Depth Above First Formation Top...');
const aboveRes = apiClient._executeLocalFormationAtDepth('15/9-F-12-WB1', -50.0);
assert.equal(aboveRes.formation_name_canonical, 'UNKNOWN');
assert.equal(aboveRes.alignment_basis, 'NOT_ALIGNED');
assert.ok(aboveRes.reason, 'Must contain explicit data gap reason');

// 4. Test Trajectory Service & Interpolation
console.log('Testing Trajectory Service & Minimum Curvature Stations...');
assert.equal(typeof apiClient.getWellboreTrajectory, 'function', 'getWellboreTrajectory must exist');
const trajRes = apiClient._executeLocalTrajectory('15/9-F-9-WB1', { md: 2500 });
assert.ok(trajRes, 'Trajectory result must exist');
assert.ok(trajRes.stations.length > 0, 'Must contain survey stations');
assert.ok(trajRes.interpolated_point, 'Must contain interpolated 3D point');
assert.equal(trajRes.interpolated_point.md, 2500);
assert.ok(trajRes.interpolated_point.tvd > 0, 'TVD must be positive');
assert.equal(trajRes.interpolated_point.provenance, 'DERIVED');

// 5. Test Cross-Well Offset Stratigraphic Query
console.log('Testing Cross-Well Offset Stratigraphic Alignment...');
assert.equal(typeof apiClient.getOffsetEvents, 'function', 'getOffsetEvents must exist');
const offsetRes = apiClient._executeLocalOffsetEvents({
  formation: 'Hugin Fm.',
  depth_below_top: 30.0,
  tolerance: 50.0
});
assert.ok(offsetRes, 'Offset query result must exist');
assert.equal(offsetRes.query.canonical_formation, 'Hugin');
assert.ok(Array.isArray(offsetRes.events), 'Events must be an array');
assert.ok(offsetRes.events.length > 0, 'Must retrieve matching offset events in Hugin');
const firstOffset = offsetRes.events[0];
assert.equal(firstOffset.canonical_formation_name, 'Hugin');
assert.ok(firstOffset.depth_below_formation_top_md !== undefined, 'Must contain depth_below_formation_top_md');
assert.equal(firstOffset.depth_basis, 'MD');
assert.equal(firstOffset.alignment_basis, 'FORMATION_TOP_MD');
assert.ok(firstOffset.source_text, 'Must retain verbatim source text evidence');
assert.equal(firstOffset.reviewed, false, 'Unreviewed status must be explicit false');

// 6. Test Tolerance Boundary Filtering
console.log('Testing Tolerance Boundaries in Offset Query...');
const narrowOffset = apiClient._executeLocalOffsetEvents({
  formation: 'Hugin',
  depth_below_top: 30.0,
  tolerance: 1.0
});
const wideOffset = apiClient._executeLocalOffsetEvents({
  formation: 'Hugin',
  depth_below_top: 30.0,
  tolerance: 100.0
});
assert.ok(narrowOffset.total_count <= wideOffset.total_count, 'Narrow tolerance must return <= wide tolerance');

// 7. Test Provenance Tracking
console.log('Testing Provenance Preservation...');
assert.ok(offsetRes.provenance_breakdown, 'Must contain provenance breakdown');
assert.ok(offsetRes.provenance_breakdown.REAL > 0, 'Must count REAL source data');
assert.ok(offsetRes.provenance_breakdown.DERIVED > 0, 'Must count DERIVED aligned depths');

console.log('All Phase 3 Formation, Depth & Trajectory Alignment JavaScript tests passed!');
