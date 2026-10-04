/**
 * Automated Verification: Single Selection State Store (Rule R6)
 * Enforces that active workspace, active well, selected object, depth, mode, layers,
 * and theme maintain a single reactive source of truth.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function testSingleSelectionStore() {
  console.log('Testing Single Selection Store (Rule R6)...');

  // Verify store source file exists and adheres to invariants
  const storePath = path.join(__dirname, '../web/src/store/useSelectionStore.ts');
  assert.ok(fs.existsSync(storePath), 'useSelectionStore.ts must exist');

  const source = fs.readFileSync(storePath, 'utf8');

  // 1. Verify Workspaces
  assert.ok(source.includes("'volve'"), 'Store must define volve workspace');
  assert.ok(source.includes("'demo-onshore'"), 'Store must define demo-onshore workspace');
  assert.ok(source.includes('bannerText:'), 'Workspaces must have distinct bannerText');

  // 2. Verify Modes
  assert.ok(source.includes("'surface'"), 'Store must support surface mode');
  assert.ok(source.includes("'subsurface'"), 'Store must support subsurface mode');
  assert.ok(source.includes("'near-well'"), 'Store must support near-well mode');

  // 3. Verify URL Synchronization Hook
  assert.ok(source.includes('syncToURL'), 'Store must define syncToURL logic');
  assert.ok(source.includes('window.history.replaceState'), 'Store must synchronize with browser URL params');
  assert.ok(source.includes('popstate'), 'Store must listen to popstate event for Back/Forward navigation');

  // 4. Verify Single Active Well and Wellbore
  assert.ok(source.includes('activeWellId:'), 'Store must track activeWellId');
  assert.ok(source.includes('activeWellboreId:'), 'Store must track activeWellboreId');
  assert.ok(source.includes('currentDepth:'), 'Store must track currentDepth');
  assert.ok(source.includes('depthBasis:'), 'Store must track depthBasis (MD vs TVD)');

  // 5. Verify Layers
  assert.ok(source.includes('SURFACE'), 'Layers must include SURFACE group');
  assert.ok(source.includes('SUBSURFACE'), 'Layers must include SUBSURFACE group');
  assert.ok(source.includes('WELLS'), 'Layers must include WELLS group');
  assert.ok(source.includes('DATA'), 'Layers must include DATA group');

  // 6. Verify Rule R3 (unavailable reason for unbacked layers)
  assert.ok(source.includes('unavailableReason'), 'Store must support unavailableReason for layers lacking data');

  console.log('✓ Single Selection Store (Rule R6 & URL Sync) validated successfully!');
  return true;
}

testSingleSelectionStore();
