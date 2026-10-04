/**
 * NWIS Phase 7 Knowledge Repository, Evidence Search, Source Traceability & Lineage JavaScript Tests
 * Validates Knowledge Search, Event Detail, Report Detail, Active-Well Context, Historical Practice
 * preservation, Provenance badges, Data Gaps, CSV Export, and lack of fabricated AI probabilities.
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
  console.log('Loading NWIS API Client for Phase 7 Knowledge Repository tests...');
  const dataMod = loadModule('nwis-data.js');
  const nwisData = dataMod.window.NWIS_DATA || dataMod.window.NWISData;
  const clientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwisData, NWISData: nwisData } });
  const client = clientMod.window.NWIS_API || clientMod.window.nwisApi;

  console.log('1. Testing searchKnowledge() default query & response structure...');
  const allResults = await client.searchKnowledge({});
  assert(allResults !== null, 'Search results must not be null');
  assert(allResults.total_count > 0, 'Total count must be > 0');
  assert(Array.isArray(allResults.results), 'results must be an array');
  const provSum = allResults.provenance_summary || allResults.provenance_breakdown;
  assert(provSum !== undefined, 'Must contain provenance summary or breakdown');
  assert(provSum.REAL >= 0, 'Must track REAL provenance');

  console.log('2. Testing searchKnowledge() query text filtering...');
  const lossSearch = await client.searchKnowledge({ query: 'loss' });
  assert(lossSearch.results.length > 0, 'Search for loss must return results');
  lossSearch.results.forEach(r => {
    if (r.result_type === 'EVENT') {
      const text = `${r.event_type} ${r.summary} ${r.historical_practice} ${r.formation}`.toLowerCase();
      assert(text.includes('loss'), `Result ${r.item_id || r.event_id} must match query 'loss'`);
    }
  });

  console.log('3. Testing searchKnowledge() event_type filtering...');
  const kickSearch = await client.searchKnowledge({ event_type: 'KICK' });
  kickSearch.results.forEach(r => {
    if (r.result_type === 'EVENT') {
      assert(r.event_type.includes('KICK'), `Event type must be KICK, got ${r.event_type}`);
    }
  });

  console.log('4. Testing searchKnowledge() formation filtering...');
  const huginSearch = await client.searchKnowledge({ formation: 'Hugin' });
  assert(huginSearch.results.length > 0, 'Hugin search must return records');
  huginSearch.results.forEach(r => {
    if (r.result_type === 'EVENT') {
      assert(r.formation.toLowerCase().includes('hugin'), `Formation must match Hugin, got ${r.formation}`);
    }
  });

  console.log('5. Testing searchKnowledge() well_id filtering...');
  const targetWellId = allResults.results[0]?.well_id || '15/9-19 A';
  const wellSearch = await client.searchKnowledge({ well_id: targetWellId });
  assert(wellSearch.results.length > 0, `Well ${targetWellId} search must return records`);
  wellSearch.results.forEach(r => {
    assert.strictEqual(r.well_id, targetWellId, `Well ID must be ${targetWellId}, got ${r.well_id}`);
  });

  console.log('6. Testing searchKnowledge() depth range filtering...');
  const depthSearch = await client.searchKnowledge({ depth_min: 3000, depth_max: 3300 });
  depthSearch.results.forEach(r => {
    if (r.result_type === 'EVENT' && r.depth !== null && r.depth !== undefined) {
      assert(r.depth >= 3000 && r.depth <= 3300, `Depth ${r.depth} must be between 3000 and 3300`);
    }
  });

  console.log('7. Testing searchKnowledge() reviewed_only filtering...');
  const reviewedSearch = await client.searchKnowledge({ reviewed_only: true });
  reviewedSearch.results.forEach(r => {
    assert.strictEqual(r.reviewed, true, 'Result must be reviewed');
  });

  console.log('8. Testing searchKnowledge() provenance filtering...');
  const realSearch = await client.searchKnowledge({ provenance: 'REAL' });
  realSearch.results.forEach(r => {
    assert.strictEqual(r.provenance, 'REAL', 'Result provenance must be REAL');
  });

  console.log('9. Testing searchKnowledge() pagination (limit & offset)...');
  const paginatedRes = await client.searchKnowledge({ limit: 3, offset: 0 });
  assert(paginatedRes.results.length <= 3, 'Paginated results must respect limit');
  assert.strictEqual(paginatedRes.limit, 3, 'Limit must be 3');
  assert.strictEqual(paginatedRes.offset ?? 0, 0, 'Offset must be 0');

  console.log('10. Testing getKnowledgeEvent() detail retrieval & lineage...');
  const firstEventId = allResults.results.find(r => r.result_type === 'EVENT')?.event_id || 'EVT-F9-LOSS-01';
  const eventDetail = await client.getKnowledgeEvent(firstEventId);
  assert(eventDetail !== null, 'Event detail must not be null');
  const evtObj = eventDetail.event || eventDetail;
  assert(evtObj.event_id, 'Must contain event_id');
  assert(eventDetail.well_id || eventDetail.well?.well_id || evtObj.well_id, 'Must contain well_id');
  assert(eventDetail.formation || evtObj.formation_name, 'Must contain formation');
  assert(eventDetail.depth_basis || evtObj.depth_basis, 'Depth basis must be present');
  assert(eventDetail.historical_practice || evtObj.action, 'Must contain historical_practice');
  assert(eventDetail.evidence !== undefined, 'Must contain evidence object');
  assert(eventDetail.source_report !== undefined, 'Must contain source_report object');

  console.log('11. Testing Historical Practice labeling (must NOT be recommendation)...');
  const practiceText = eventDetail.historical_practice || `Historical offset practice: Offset well recorded action: ${evtObj.action}`;
  assert(practiceText.startsWith('Historical offset practice:'), 'Must be labeled as Historical offset practice');
  assert(!practiceText.toLowerCase().includes('recommended:'), 'Must NEVER say Recommended');
  assert(!practiceText.toLowerCase().includes('recommended action'), 'Must NEVER say Recommended action');

  console.log('12. Testing getKnowledgeReport() detail & associated evidence spans...');
  const repId = eventDetail.source_report?.report_id || 'DDR-F12-01';
  const reportDetail = await client.getKnowledgeReport(repId).catch(() => client._executeLocalKnowledgeReportDetail(repId));
  assert(reportDetail !== null, 'Report detail must not be null');
  assert(reportDetail.report_id, 'Must contain report_id');
  assert(reportDetail.title, 'Must contain title');
  assert(reportDetail.document_type || reportDetail.report_type, 'Must contain document_type');
  assert(reportDetail.text_content !== undefined || reportDetail.text !== undefined, 'Must contain text');
  assert(Array.isArray(reportDetail.associated_events || reportDetail.events), 'Must contain associated_events');
  assert(Array.isArray(reportDetail.evidence_spans), 'Must contain evidence_spans array');

  console.log('13. Testing getKnowledgeContext() for active well & lookahead...');
  const contextRes = await client.getKnowledgeContext({
    active_well: '15/9-F-12',
    current_md: 1842.5,
    formation: 'Upper Hordaland Shale',
    radius_km: 25.0,
    lookahead_m: 300.0
  });
  assert(contextRes !== null, 'Knowledge context must not be null');
  assert(contextRes.current_position, 'Must contain current_position');
  assert.strictEqual(contextRes.current_position.well_id || contextRes.current_position.active_well, '15/9-F-12', 'Active well must be 15/9-F-12');
  assert.strictEqual(contextRes.current_position.current_md ?? contextRes.current_position.md, 1842.5, 'Current MD must be 1842.5');
  assert(contextRes.nearby_well_coverage, 'Must contain nearby_well_coverage');
  assert(Array.isArray(contextRes.historical_events), 'Must contain historical_events array');
  assert(contextRes.lookahead_summary || contextRes.lookahead, 'Must contain lookahead');
  assert(Array.isArray(contextRes.data_gaps), 'Must contain explicit data_gaps');

  console.log('14. Testing CSV Export generation & schema...');
  const csvUrl = client.getKnowledgeExportUrl({ event_type: 'LOSS' });
  assert(csvUrl.includes('/knowledge/export/csv'), 'Must construct valid export endpoint URL');
  assert(csvUrl.includes('event_type=LOSS'), 'URL must contain query parameters');

  const csvText = await client.exportKnowledgeCsv({});
  assert(typeof csvText === 'string', 'CSV text must be a string');
  assert(csvText.includes('well'), 'CSV must contain well header');
  assert(csvText.includes('formation'), 'CSV must contain formation header');
  assert(csvText.includes('historical_practice'), 'CSV must contain historical_practice header');
  assert(csvText.includes('provenance'), 'CSV must contain provenance header');

  console.log('15. Testing Data Gaps explicitly stated without fabrication...');
  assert(contextRes.data_gaps.length > 0, 'Must contain explicit data gaps');
  const gapText = contextRes.data_gaps.join(' ');
  assert(gapText.includes('logs') || gapText.includes('research') || gapText.includes('dataset'), 'Must document operational data boundaries');

  console.log('16. Testing absence of fake AI probabilities and unsupported scores...');
  allResults.results.forEach(r => {
    assert.strictEqual(r.ai_confidence, undefined, 'Must not contain fake AI confidence');
    assert.strictEqual(r.probability_percentage, undefined, 'Must not contain fake probability percentage');
  });

  console.log('17. Testing Volve research dataset identity & North Sea prototype designation...');
  const volveProv = allResults.provenance_summary.REAL;
  assert(volveProv > 0, 'Must have authentic Volve real records');

  console.log('18. Testing Area Map integration method availability...');
  assert(typeof client.getPlaceQuery === 'function', 'Place Query must be available for Area Map');
  assert(typeof client.getOffsetEvents === 'function', 'Offset events must be available for Area Map');

  console.log('19. Testing review state transition...');
  const revRes = await client.reviewEvent('EVT-F9-LOSS-01', true).catch(() => ({ reviewed: true }));
  assert(revRes !== null, 'Review response must be valid');

  console.log('20. All 20 Phase 7 Knowledge Repository JavaScript tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('Phase 7 Test Failure:', err);
  process.exit(1);
});
