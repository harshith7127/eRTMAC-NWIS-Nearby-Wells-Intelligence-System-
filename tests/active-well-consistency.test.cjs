const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function load(name) {
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
    }
  };
  vm.runInNewContext(fs.readFileSync(targetPath, 'utf8'), ctx);
  return { exports: ctx.module.exports, window: ctx.window };
}

// 1. Load NWIS Data Module
const nwis = load('nwis-data.js').window.NWIS_DATA;
assert.ok(nwis, 'NWIS_DATA module must be defined on window');

// 2. Test Provenance System
console.log('Testing Centralized Provenance System...');
assert.ok(nwis.PROVENANCE, 'PROVENANCE object must exist');
assert.equal(nwis.PROVENANCE.REAL, 'REAL');
assert.equal(nwis.PROVENANCE.DERIVED, 'DERIVED');
assert.equal(nwis.PROVENANCE.SYNTHETIC, 'SYNTHETIC');
assert.equal(nwis.PROVENANCE.ILLUSTRATIVE, 'ILLUSTRATIVE');

assert.equal(nwis.getProvenanceLabel('REAL'), 'PUBLIC VOLVE DATA');
assert.equal(nwis.getProvenanceLabel('SYNTHETIC'), 'SYNTHETIC DEMO');
assert.equal(nwis.getProvenanceLabel('DERIVED'), 'DERIVED DATA');
assert.equal(nwis.getProvenanceLabel('ILLUSTRATIVE'), 'ILLUSTRATIVE / SIMULATED');

const realBadge = nwis.renderProvenanceBadge('REAL');
assert.ok(realBadge.includes('PUBLIC VOLVE DATA'), 'Real badge must label Volve honestly');
assert.ok(realBadge.includes('badge-provenance'), 'Real badge must have badge-provenance class');

const synBadge = nwis.renderProvenanceBadge('SYNTHETIC');
assert.ok(synBadge.includes('SYNTHETIC DEMO'), 'Synthetic badge must label Synthetic honestly');
assert.ok(synBadge.includes('badge-provenance'), 'Synthetic badge must have badge-provenance class');

// 3. Test Canonical Active-Well State
console.log('Testing Canonical Active-Well State...');
const seededData = nwis.seedRich();
assert.ok(seededData.activeWellState, 'Seed data must contain canonical activeWellState');

const active = seededData.activeWellState;
assert.ok(active.wellId, 'activeWellState must have wellId');
assert.ok(active.wellName, 'activeWellState must have wellName');
assert.ok(active.currentDepth !== undefined, 'activeWellState must have currentDepth');
assert.ok(active.depthBasis, 'activeWellState must have depthBasis (e.g. MD or TVD)');
assert.ok(active.formation, 'activeWellState must have formation');
assert.ok(active.dataset, 'activeWellState must have dataset identity');
assert.ok(active.provenance, 'activeWellState must have provenance');

// Check that active well corresponds to an existing well in the dataset
const matchingWell = seededData.wells.find(w => w.id === active.wellId);
assert.ok(matchingWell, 'Active well ID must exist in wells collection');
assert.equal(matchingWell.name, active.wellName, 'Active well name must match well record');

// 4. Test Synthetic Demo Data Isolation
console.log('Testing Synthetic Demo Data Isolation...');
assert.equal(seededData.dataset, 'SYNTHETIC_DEMO');
assert.equal(seededData.provenance, 'SYNTHETIC');
for (const well of seededData.wells) {
  assert.equal(well.provenance, 'SYNTHETIC', `Well ${well.id} must have SYNTHETIC provenance`);
  assert.equal(well.dataset, 'SYNTHETIC_DEMO', `Well ${well.id} must have SYNTHETIC_DEMO dataset`);
}

// 5. Test Incident Review Status & Verification Workflow
console.log('Testing Incident Review Status & Verification...');
assert.ok(seededData.incidents.length > 0, 'Incidents must be present in dataset');
for (const inc of seededData.incidents) {
  assert.strictEqual(typeof inc.reviewed, 'boolean', `Incident ${inc.id} must have reviewed boolean`);
  assert.strictEqual(inc.reviewed, false, `Auto-extracted incident ${inc.id} must default to reviewed: false`);
  assert.strictEqual(typeof inc.excluded, 'boolean', `Incident ${inc.id} must have distinct excluded boolean`);
}

// 6. Test Active-Well State Consistency Helper
console.log('Testing Active-Well Consistency Validation Helper...');
function validateActiveWellConsistency(state) {
  const currentActive = state.activeWellState;
  if (!currentActive) return { valid: false, error: 'Missing activeWellState' };
  
  const targetWell = state.wells.find(w => w.id === currentActive.wellId);
  if (!targetWell) return { valid: false, error: 'activeWellState.wellId not found in wells' };
  
  if (targetWell.name !== currentActive.wellName) {
    return { valid: false, error: `Name mismatch: ${targetWell.name} vs ${currentActive.wellName}` };
  }
  
  return { valid: true };
}

const initialValidation = validateActiveWellConsistency(seededData);
assert.equal(initialValidation.valid, true, 'Initial state must be consistent');

// Test switching active well
const targetSwitchWell = seededData.wells[1];
seededData.activeWellState = {
  wellId: targetSwitchWell.id,
  wellName: targetSwitchWell.name,
  wellboreId: targetSwitchWell.wellboreId || targetSwitchWell.id,
  currentDepth: targetSwitchWell.depth,
  depthBasis: targetSwitchWell.depthType || 'MD',
  formation: targetSwitchWell.formation,
  dataset: targetSwitchWell.dataset || 'SYNTHETIC_DEMO',
  provenance: targetSwitchWell.provenance || 'SYNTHETIC'
};

const switchedValidation = validateActiveWellConsistency(seededData);
assert.equal(switchedValidation.valid, true, 'Switched active well state must be consistent');
assert.equal(seededData.activeWellState.wellId, targetSwitchWell.id);

console.log('All Active-Well Consistency, Provenance, and Incident Verification checks passed successfully!');
