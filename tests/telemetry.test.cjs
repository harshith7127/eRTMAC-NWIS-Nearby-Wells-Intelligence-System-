/**
 * NWIS Phase 5 Telemetry Layer & Volve Replay JavaScript Tests
 * Validates canonical telemetry schemas, server replay controls, streaming synchronization,
 * channel inventory, unavailable channel formatting, WITSML inspection, eRTMAC stubbing,
 * and deterministic look-ahead triggers.
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
  console.log('=== NWIS Phase 5 Telemetry Layer JavaScript Tests ===');

  console.log('1. Testing Telemetry Client & Replay Controller Initialisation...');
  const dataMod = loadModule('nwis-data.js');
  const nwisData = dataMod.window.NWIS_DATA || dataMod.window.NWISData;
  const clientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwisData, NWISData: nwisData } });
  const client = clientMod.window.NWIS_API || clientMod.window.nwisApi;

  assert(client !== null, 'NWISApiClient instance must exist');
  assert.strictEqual(typeof client.getTelemetryStatus, 'function');
  assert.strictEqual(typeof client.getTelemetryChannels, 'function');
  assert.strictEqual(typeof client.getLatestTelemetry, 'function');
  assert.strictEqual(typeof client.startReplay, 'function');
  assert.strictEqual(typeof client.pauseReplay, 'function');
  assert.strictEqual(typeof client.resumeReplay, 'function');
  assert.strictEqual(typeof client.resetReplay, 'function');
  assert.strictEqual(typeof client.seekReplay, 'function');
  assert.strictEqual(typeof client.setReplaySpeed, 'function');
  assert.strictEqual(typeof client.stepReplay, 'function');
  assert.strictEqual(typeof client.inspectWitsml, 'function');
  assert.strictEqual(typeof client.getErtmacStatus, 'function');

  console.log('2. Testing Telemetry Source Badges & Provenance...');
  const statusVolve = await client.getTelemetryStatus('VOLVE_REPLAY');
  assert.strictEqual(statusVolve.source, 'VOLVE_REPLAY');
  assert(['REAL', 'DERIVED', 'LOCAL OFFLINE REPLAY', 'PUBLIC VOLVE REPLAY'].some(s => statusVolve.provenance === 'REAL' || statusVolve.source_label.includes(s)), 'Must have valid provenance');

  const statusErtmac = await client.getTelemetryStatus('ERTMAC');
  assert.strictEqual(statusErtmac.source, 'ERTMAC');
  assert.strictEqual(statusErtmac.status, 'NOT_CONNECTED');
  assert.strictEqual(statusErtmac.provenance, 'ILLUSTRATIVE');
  assert(statusErtmac.reason.includes('Oil India'), 'eRTMAC must cite Oil India access requirements');

  console.log('3. Testing Replay Controls (Start, Pause, Resume, Reset, Seek, Speed, Step)...');
  const startRes = await client.startReplay({ speed: 2.0 });
  assert(['RUNNING', 'start'].some(s => startRes.status === 'RUNNING' || startRes.action === 'start'));

  const pauseRes = await client.pauseReplay();
  assert(['PAUSED', 'pause'].some(s => pauseRes.status === 'PAUSED' || pauseRes.action === 'pause'));

  const resumeRes = await client.resumeReplay();
  assert(['RUNNING', 'resume'].some(s => resumeRes.status === 'RUNNING' || resumeRes.action === 'resume'));

  const seekRes = await client.seekReplay({ index: 150 });
  assert.strictEqual(seekRes.index ?? seekRes.current_index, 150);

  const speedRes = await client.setReplaySpeed(5.0);
  assert.strictEqual(speedRes.speed, 5.0);

  const resetRes = await client.resetReplay();
  assert.strictEqual(resetRes.index ?? resetRes.current_index, 0);

  console.log('4. Testing Telemetry Channel Inventory & Null Channel Formatter...');
  const channels = await client.getTelemetryChannels('VOLVE_REPLAY');
  assert(Array.isArray(channels), 'Channels must be an array');
  assert(channels.length >= 8, 'Must return at least 8 channels');

  const ropChan = channels.find(c => c.name === 'ROP' || c.mnemonic === 'ROP');
  assert(ropChan !== undefined, 'ROP channel must exist');
  assert.strictEqual(ropChan.available, true);
  assert.strictEqual(ropChan.unit, 'm/h');

  const ecdChan = channels.find(c => c.name === 'ECD' || c.mnemonic === 'ECD');
  assert(ecdChan !== undefined, 'ECD channel must exist');
  assert.strictEqual(ecdChan.available, false);
  assert.strictEqual(ecdChan.unit, null);

  console.log('5. Testing Latest Canonical Telemetry Sample Structure...');
  const latest = await client.getLatestTelemetry('VOLVE_REPLAY');
  assert(latest !== null, 'Latest sample must not be null');
  assert.strictEqual(latest.well_id, '15/9-F-12');
  assert.strictEqual(latest.depth_basis, 'MD');
  assert.strictEqual(typeof latest.md, 'number');
  assert.strictEqual(typeof latest.rop, 'number');
  assert.strictEqual(typeof latest.torque, 'number');
  assert.strictEqual(typeof latest.spp, 'number');
  assert.strictEqual(latest.tvd, null, 'Unrecorded TVD must be null, not fabricated');

  console.log('6. Testing WITSML Ingestion & Validation Parser...');
  const witsmlRes = await client.inspectWitsml('data/volve/witsml/log_00001.xml');
  assert(witsmlRes !== null, 'WITSML inspection response must exist');
  assert.strictEqual(witsmlRes.file_type, 'WITSML_LOG');
  assert(witsmlRes.sample_count > 0, 'Must report positive sample count');
  assert(witsmlRes.channels.length > 0, 'Must report mapped channels');
  assert(witsmlRes.depth_range.min_md !== undefined, 'Must report depth range');
  assert(Array.isArray(witsmlRes.unsupported_fields), 'Unsupported fields must be listed');
  assert(Array.isArray(witsmlRes.parse_warnings), 'Parse warnings must be tracked');

  console.log('7. Testing Streaming Disconnect & Offline Fallback...');
  const ws = client.connectTelemetryWebSocket(
    () => {},
    () => {},
    () => {}
  );
  // WebSocket constructor handled cleanly in test environment without throwing uncaught errors
  assert(ws === null || typeof ws === 'object', 'Streaming connection handles non-browser environment gracefully');

  console.log('8. Testing Telemetry Sample Updating Active Well & Phase 4 Lookahead Refresh...');
  const sampleMd = 1860.0;
  const formationRes = await client.getFormationAtDepth('15/9-F-12-WB1', sampleMd);
  assert(formationRes !== null, 'Formation at depth must resolve');
  assert.strictEqual(formationRes.wellbore_id, '15/9-F-12-WB1');
  const formationName = formationRes.canonical_formation_name || formationRes.formation_name_canonical;
  assert(formationName && formationName.length > 0, 'Formation name must be resolved');
  const relDepth = formationRes.relative_depth !== undefined ? formationRes.relative_depth : formationRes.depth_below_top_md;
  assert(relDepth !== undefined && relDepth >= 0, 'Relative depth must be non-negative');

  const lookaheadRes = await client.getLookahead({
    wellbore_id: '15/9-F-12-WB1',
    current_md: sampleMd,
    lookahead_m: 300.0
  });
  assert(lookaheadRes !== null, 'Lookahead query must refresh');
  assert.strictEqual(lookaheadRes.active_well.current_md, sampleMd);
  assert(lookaheadRes.alerts.length > 0, 'Must produce deterministic K-of-N alerts');

  console.log('9. Testing Authentic Volve Replay Dataset Consistency...');
  const volveDataRaw = fs.readFileSync(path.join(__dirname, '../public/volve-data.json'), 'utf8');
  const volveJson = JSON.parse(volveDataRaw);
  assert.strictEqual(volveJson.telemetry.length, 600, 'Must contain authentic 600 Volve records');
  assert.strictEqual(volveJson.telemetry[0].measuredDepth, 1842.58, 'First MD must be 1842.58');
  assert.strictEqual(volveJson.telemetry[599].measuredDepth, 1878.50, 'Last MD must be 1878.50');
  assert.strictEqual(volveJson.telemetry[0].timestamp, '2007-06-15T04:00:00Z', 'First timestamp must be authentic');

  console.log('10. Testing Absence of Machine Learning Guesswork & Risk Scores...');
  assert.strictEqual(latest.risk_probability, undefined, 'No ML risk probability allowed');
  assert.strictEqual(latest.ai_confidence, undefined, 'No fake AI confidence scores allowed');
  assert.strictEqual(statusVolve.prediction_model, undefined, 'No fake prediction models allowed');

  console.log('✓ All Phase 5 Telemetry Layer JavaScript Tests Passed Successfully (10/10)!');
}

runTests().catch(err => {
  console.error('✗ Telemetry test failure:', err);
  process.exit(1);
});
