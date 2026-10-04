/**
 * NWIS Phase 6 ML Evaluation, Leakage-Safe Backtesting & Rule-Baseline Comparison JavaScript Tests
 * Validates ML evaluation methods, Leave-One-Well-Out metric structures, NOT_SHIPPED status display,
 * feature lineage schemas, Oil India non-transferability disclaimers, and lack of fake AI probabilities.
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
  console.log('Loading NWIS API Client for Phase 6 ML Evaluation tests...');
  const dataMod = loadModule('nwis-data.js');
  const nwisData = dataMod.window.NWIS_DATA || dataMod.window.NWISData;
  const clientMod = loadModule('api-client.js', { window: { NWIS_DATA: nwisData, NWISData: nwisData } });
  const client = clientMod.window.NWIS_API || clientMod.window.nwisApi;

  console.log('1. Testing getMLStatus() API Method & Status Structure...');
  const statusRes = await client.getMLStatus();
  assert(statusRes !== null, 'Status response must not be null');
  assert.strictEqual(statusRes.model_status, 'NOT_SHIPPED', 'Model status must be NOT_SHIPPED');
  assert.strictEqual(statusRes.beats_rule_baseline, false, 'beats_rule_baseline must be false');
  assert.strictEqual(statusRes.evaluation_method, 'LEAVE_ONE_WELL_OUT', 'Must use Leave-One-Well-Out CV');
  assert(statusRes.oil_india_transfer_limit.includes('Volve is a North Sea public prototype dataset'), 'Must contain Oil India transfer limit');

  console.log('2. Testing getMLDatasetSummary() Discretization & Class Balance...');
  const datasetRes = await client.getMLDatasetSummary();
  assert.strictEqual(datasetRes.interval_size_m, 30.0, 'Discretization must be 30m');
  assert.strictEqual(datasetRes.prediction_horizon_m, 100.0, 'Horizon must be 100m');
  assert.strictEqual(datasetRes.wells_represented.length, 6, 'Must represent 6 Volve wells');
  assert(datasetRes.total_intervals > 600, 'Must have >600 intervals');
  assert(datasetRes.positive_samples > 0, 'Must have positive samples');
  assert(datasetRes.negative_samples > datasetRes.positive_samples, 'Must be a rare-event distribution');

  console.log('3. Testing getMLEvaluation() Metrics & Baselines...');
  const evalRes = await client.getMLEvaluation();
  assert(evalRes.baselines.always_negative, 'Must contain always_negative baseline');
  assert(evalRes.baselines.phase4_rule, 'Must contain phase4_rule baseline');
  assert(evalRes.models.logistic_regression, 'Must contain logistic_regression model');
  assert(evalRes.models.gradient_boosting, 'Must contain gradient_boosting model');

  // Baseline 1 (Always negative)
  assert.strictEqual(evalRes.baselines.always_negative.alert_count, 0);
  assert.strictEqual(evalRes.baselines.always_negative.alerts_per_1000m, 0.0);
  assert.strictEqual(evalRes.baselines.always_negative.precision, 0.0);

  // Baseline 2 (Phase 4 Rule)
  assert(evalRes.baselines.phase4_rule.pr_auc !== null, 'Phase 4 PR-AUC must be computable');
  assert(evalRes.baselines.phase4_rule.alerts_per_1000m >= 0.0, 'Alerts/1000m must be non-negative');

  // ML Models (LOWOCV)
  assert(evalRes.models.logistic_regression.pr_auc !== null, 'Logistic Regression PR-AUC must be computed');
  assert(evalRes.models.gradient_boosting.pr_auc !== null, 'Gradient Boosting PR-AUC must be computed');

  // Ship Decision
  assert.strictEqual(evalRes.model_status, 'NOT_SHIPPED');
  assert.strictEqual(evalRes.beats_rule_baseline, false);
  assert(evalRes.decision_details.length > 0, 'Must provide detailed mechanical comparison reason');

  console.log('4. Testing getMLFeatures() Feature Lineage & Safeguards...');
  const features = await client.getMLFeatures();
  assert(Array.isArray(features), 'Features must be an array');
  assert(features.length >= 10, 'Must have at least 10 documented features');
  features.forEach(f => {
    assert(f.feature_name, 'Feature name required');
    assert(f.source, 'Source required');
    assert(f.calculation, 'Calculation basis required');
    assert(f.depth_basis === 'MD', 'Depth basis must be MD');
    assert(f.leakage_guard.length > 0, 'Leakage guard description required');
    assert(['REAL', 'DERIVED', 'SYNTHETIC', 'ILLUSTRATIVE'].includes(f.provenance));
  });

  console.log('5. Testing getMLModelCard() Provenance & Governance Document...');
  const modelCard = await client.getMLModelCard();
  assert.strictEqual(modelCard.model_card_version, '1.0.0');
  assert(modelCard.dataset_identity.includes('Volve'));
  assert.strictEqual(modelCard.ship_decision, 'NOT_SHIPPED');
  assert(modelCard.leakage_safeguards.length >= 4, 'Must detail leakage safeguards');
  assert(modelCard.operational_limitations.length >= 3, 'Must detail operational limits and disclaimers');

  console.log('6. Verifying Absence of Fake AI Confidence & Unsupported Probabilities...');
  // Ensure that no fake percentage scores (e.g. "98.4% AI Accuracy") are fabricated in the client responses
  const jsonStr = JSON.stringify(evalRes);
  assert(!jsonStr.includes('AI confidence'), 'Must not fabricate AI confidence score');
  assert(!jsonStr.includes('production ready'), 'Must not claim model is production ready');

  console.log('All Phase 6 ML Evaluation JavaScript tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
