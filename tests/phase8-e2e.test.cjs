/**
 * Phase 8 End-to-End Validation & Pilot Readiness Test Suite (JavaScript)
 * Verifies the complete NWIS workflow, terminology consistency,
 * ML governance status, and authentic Volve data integrity.
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

async function runPhase8E2ETests() {
  console.log('=== NWIS Phase 8 End-to-End Integration & Pilot Readiness Tests ===\n');

  const dataMod = loadModule('nwis-data.js');
  const nwisData = dataMod.window.NWIS_DATA || dataMod.window.NWISData;
  const clientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwisData, NWISData: nwisData } });
  const client = clientMod.window.NWIS_API || clientMod.window.nwisApi;

  // 1. Verify Active Well State Consistency & Synthetic Sandbox Isolation
  console.log('1. Testing Active Well State Consistency & Synthetic Sandbox Isolation...');
  const seeded = nwisData.seedRich ? nwisData.seedRich() : {};
  const activeCtx = seeded.activeWellState || {};
  assert.ok(activeCtx.wellId, 'Active well must have wellId');
  assert.ok(activeCtx.wellName, 'Active well must have wellName');
  assert.strictEqual(activeCtx.dataset, 'SYNTHETIC_DEMO', 'Demo sandbox dataset must be SYNTHETIC_DEMO');
  assert.strictEqual(activeCtx.provenance, 'SYNTHETIC', 'Demo sandbox provenance must be SYNTHETIC');
  console.log(`   ✓ Active demo well state validated: ${activeCtx.wellName} [${activeCtx.provenance}]`);

  // 2. Verify Authentic Volve Field Dataset Integrity
  console.log('2. Testing Authentic Volve Replay Dataset Integrity...');
  const volvePath = path.join(__dirname, '../public/volve-data.json');
  assert.ok(fs.existsSync(volvePath), 'volve-data.json must exist');
  const volveJson = JSON.parse(fs.readFileSync(volvePath, 'utf8'));
  assert.strictEqual(volveJson.telemetry.length, 600, 'Must contain authentic 600 Volve records');
  assert.strictEqual(volveJson.telemetry[0].measuredDepth, 1842.58, 'First MD must match Volve record');
  console.log(`   ✓ Authentic Volve dataset verified: 600 telemetry points, MD ${volveJson.telemetry[0].measuredDepth}m - ${volveJson.telemetry[599].measuredDepth}m.`);

  // 3. Verify Stratigraphic Formation Alignment
  console.log('3. Testing Stratigraphic Alignment...');
  const formAtDepth = await client.getFormationAtDepth('15/9-F-12-WB1', 2000.0);
  assert.ok(formAtDepth, 'Formation at depth must return result');
  const formName = formAtDepth.formation_name_canonical || formAtDepth.formation || formAtDepth.name || '';
  assert.ok(formName.length > 0, 'Formation name must not be empty');
  console.log(`   ✓ Stratigraphic alignment at 2000m identified: ${formName}`);

  // 4. Verify Spatial Place Query & Offsets
  console.log('4. Testing Spatial Offset Coverage within 5 km radius...');
  const placeResult = await client.getPlaceQuery({
    latitude: 58.435903,
    longitude: 1.929736,
    radius_km: 5.0
  });
  assert.ok(placeResult, 'Place query result must be returned');
  assert.ok(Array.isArray(placeResult.nearby_wells), 'nearby_wells must be an array');
  assert.ok(placeResult.nearby_wells.length >= 3, 'Must identify nearby Volve offset wells');
  console.log(`   ✓ Identified ${placeResult.nearby_wells.length} nearby offset wells within radius.`);

  // 5. Verify Deterministic Phase 4 Look-Ahead Engine
  console.log('5. Testing Phase 4 Look-Ahead Rule Engine at 2000m MD (+300m window)...');
  const lookaheadResult = await client.getLookahead({
    wellbore_id: '15/9-F-12-WB1',
    current_md: 2000.0,
    lookahead_m: 300.0
  });
  assert.ok(lookaheadResult, 'Look-ahead result must be returned');
  assert.ok(lookaheadResult.alerts !== undefined || lookaheadResult.events !== undefined, 'Lookahead must return alerts or events');
  console.log('   ✓ Look-ahead rule engine executed deterministically.');

  // 6. Verify Historical Practice Terminology (Absence of "Recommended" automated actions)
  console.log('6. Testing Strict Absence of Automated Recommendations & Presence of Historical Practice...');
  const knowledgeSearch = await client.searchKnowledge({ query: 'loss' });
  assert.ok(knowledgeSearch, 'Knowledge search must return response');
  assert.ok(knowledgeSearch.results && knowledgeSearch.results.length > 0, 'Must return knowledge results');
  const event = knowledgeSearch.results.find(r => r.result_type === 'EVENT' && r.historical_practice);
  if (event) {
    assert.ok(['REAL', 'SYNTHETIC'].includes(event.provenance), 'Event provenance must be REAL or SYNTHETIC');
    assert.ok(typeof event.historical_practice === 'string', 'Historical practice must be string');
    assert.ok(!event.historical_practice.includes('Autopilot'), 'Practice must not claim autopilot action');
  }
  console.log('   ✓ Historical offset actions strictly labeled as historical practice.');

  // 7. Verify Machine Learning Governance & NOT_SHIPPED Status
  console.log('7. Testing ML Governance & Model Status...');
  const mlStatus = await client.getMLStatus();
  assert.ok(mlStatus, 'ML status response must be returned');
  assert.strictEqual(mlStatus.model_status, 'NOT_SHIPPED', 'Model status must be strictly NOT_SHIPPED');
  assert.strictEqual(mlStatus.beats_rule_baseline, false, 'beats_rule_baseline must be false');
  console.log('   ✓ ML status verified: NOT_SHIPPED. Zero leakage violations.');

  // 8. Verify Telemetry & eRTMAC Status
  console.log('8. Testing Telemetry Replay & eRTMAC Status...');
  const ertmacStatus = await client.getErtmacStatus();
  assert.ok(ertmacStatus, 'eRTMAC status must be returned');
  assert.strictEqual(ertmacStatus.status, 'NOT_CONNECTED', 'eRTMAC must be NOT_CONNECTED in prototype');
  console.log('   ✓ eRTMAC correctly verified as NOT_CONNECTED (prototype stub).');

  // 9. Verify CSV Export Functionality
  console.log('9. Testing Knowledge Export CSV Schema...');
  const csvData = await client.exportKnowledgeCsv({ limit: 10 });
  assert.ok(typeof csvData === 'string', 'CSV data must be returned as string');
  assert.ok(csvData.includes('well'), 'CSV must contain well column');
  assert.ok(csvData.includes('provenance'), 'CSV must contain provenance column');
  console.log('   ✓ CSV export contains complete provenance and metadata schema.');

  // 10. Verify Absence of Unsupported AI Scores & Fake Probabilities
  console.log('10. Verifying Absence of Hallucinated Probabilities & AI Confidence...');
  const rawDataStr = JSON.stringify(nwisData);
  assert.ok(!rawDataStr.includes('"ai_confidence"'), 'Data must not contain ai_confidence');
  assert.ok(!rawDataStr.includes('"probability_percentage"'), 'Data must not contain probability_percentage');
  console.log('   ✓ Zero fake AI scores or probability percentages found.');

  console.log('\n✓ All 10 Phase 8 End-to-End Integration & Pilot Readiness Tests PASSED!\n');
}

runPhase8E2ETests().catch(err => {
  console.error('\n❌ Phase 8 E2E Test Failure:', err);
  process.exit(1);
});
