/**
 * NWIS Phase 4 Look-Ahead Rule Engine & Offset Evidence Decision Support JavaScript Tests
 * Validates deterministic K-of-N calculations, stratigraphic alignment lookahead, analogue attribute comparisons,
 * review filtering, and provenance preservation.
 */

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
    URLSearchParams: globalThis.URLSearchParams,
    AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    fetch: globalThis.fetch || (() => Promise.reject(new Error('Fetch disabled in unit test'))),
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    },
    ...extraContext
  };
  vm.runInNewContext(fs.readFileSync(targetPath, 'utf8'), ctx);
  return { exports: ctx.module.exports, window: ctx.window };
}

async function runTests() {
  console.log('Loading NWIS API Client for Phase 4 Look-Ahead Rule Engine tests...');
  const dataMod = loadModule('nwis-data.js');
  const nwisData = dataMod.window.NWIS_DATA || dataMod.window.NWISData;
  const clientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwisData, NWISData: nwisData } });
  const client = clientMod.window.NWIS_API || clientMod.window.nwisApi;

  console.log('Testing Default 300m Look-Ahead Window & Active Well Context...');
  const resDefault = await client.getLookahead({
    wellbore_id: '15/9-F-12-WB1',
    current_md: 2750.0
  });

  assert(resDefault !== null, 'Response should not be null');
  assert.strictEqual(resDefault.active_well.wellbore_id, '15/9-F-12-WB1');
  assert.strictEqual(resDefault.active_well.current_md, 2750.0);
  assert.strictEqual(resDefault.query.lookahead_m, 300.0);
  assert(resDefault.active_well.canonical_formation_name, 'Canonical formation must be populated');
  assert(resDefault.active_well.current_relative_depth !== null, 'Current relative depth must be calculated');

  console.log('Testing Configurable Look-Ahead Window Presets (100m, 200m, 500m, 1000m)...');
  for (const windowM of [100.0, 200.0, 500.0, 1000.0]) {
    const resPreset = await client.getLookahead({
      wellbore_id: '15/9-F-12-WB1',
      current_md: 2750.0,
      lookahead_m: windowM
    });
    assert.strictEqual(resPreset.query.lookahead_m, windowM);
  }

  console.log('Testing Multi-Attribute Analogue Match Breakdown...');
  assert(resDefault.coverage.candidate_wellbore_details.length > 0, 'Must have candidate wellbore comparisons');
  resDefault.coverage.candidate_wellbore_details.forEach(comp => {
    assert.strictEqual(typeof comp.formation_match, 'boolean');
    assert.strictEqual(typeof comp.relative_depth_coverage, 'boolean');
    assert.strictEqual(typeof comp.trajectory_available, 'boolean');
    assert.strictEqual(typeof comp.casing_available, 'boolean');
    assert.strictEqual(typeof comp.mud_program_available, 'boolean');
    assert(comp.explanation.length > 0, 'Must provide deterministic explanation string');
  });

  console.log('Testing Covered Offset Denominator (N) & K-of-N Calculation...');
  const coveredCount = resDefault.coverage.covered_offset_wellbores;
  assert(coveredCount <= resDefault.coverage.candidate_offset_wellbores, 'Covered N must be <= candidate count');
  assert(resDefault.alerts.length > 0, 'Must generate alert objects');

  resDefault.alerts.forEach(alert => {
    assert.strictEqual(alert.n, coveredCount, 'Alert N must match covered count');
    assert(alert.k <= alert.n, 'Alert K must be <= N');
    assert(['NO_EVIDENCE', 'INSUFFICIENT_COVERAGE', 'OBSERVED', 'REPEATED'].includes(alert.severity), `Valid severity required: ${alert.severity}`);
    assert(alert.trigger_reason.includes('reviewed offset wellbore'), 'Trigger reason must explain K of N rule');
    assert.strictEqual(alert.provenance, 'DERIVED', 'Alerts must have DERIVED provenance');
    assert(alert.telemetry_context.includes('historical offset evidence'), 'Telemetry context must be explicit');
  });

  console.log('Testing Historical Offset Practice (Mitigation Actions Preservation)...');
  const resWithEvidence = await client.getLookahead({
    wellbore_id: '15/9-F-12-WB1',
    current_md: 2750.0,
    lookahead_m: 500.0,
    include_unreviewed: true
  });
  resWithEvidence.evidence.forEach(ev => {
    if (ev.historical_action) {
      assert(ev.historical_action.startsWith('Historical offset practice: Offset well'), 'Mitigation action must preserve historical prefix');
    }
    assert(['REAL', 'DERIVED', 'SYNTHETIC', 'ILLUSTRATIVE'].includes(ev.provenance));
  });

  console.log('Testing Provenance Breakdown Summary...');
  assert(resDefault.provenance_breakdown !== undefined);
  assert(resDefault.provenance_breakdown.REAL >= 0);
  assert(resDefault.provenance_breakdown.DERIVED >= 1);

  console.log('All Phase 4 Look-Ahead Rule Engine JavaScript tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
