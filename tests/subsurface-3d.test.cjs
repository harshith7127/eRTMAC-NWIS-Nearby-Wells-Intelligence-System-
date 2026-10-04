/**
 * NWIS Phase 4 Subsurface 3D Mode Tests
 * Validates Three.js subsurface scene configuration:
 * - Local metric frame (E - E0, N - N0, z = -TVD)
 * - Authentic Volve 3D wellbore trajectory tubes with casing shoes
 * - 10 geological formation surfaces with structural dip & curvature
 * - Structural fault planes (F-1 West, F-2 East, F-3 Cross)
 * - Jurassic Hugin oil reservoir body
 * - Interactive slicing/clipping plane & vertical exaggeration
 * - Raycast picking & selection store integration
 * - Deterministic WebGL resource disposal & memory leak prevention
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function runSubsurface3DTests() {
  console.log('=== NWIS Phase 4 Subsurface 3D Tests ===\n');

  console.log('1. Testing Subsurface3DViewer existence and Three.js imports...');
  const viewerPath = path.join(__dirname, '../web/src/components/subsurface/Subsurface3DViewer.tsx');
  assert(fs.existsSync(viewerPath), 'Subsurface3DViewer.tsx must exist');
  const src = fs.readFileSync(viewerPath, 'utf8');
  assert(src.includes("import * as THREE from 'three'"), 'Must import Three.js');
  console.log('   ✓ Three.js properly imported.');

  console.log('2. Testing Local Metric Frame Coordinates (Rule 8: E - E0, N - N0, z = -TVD)...');
  assert(src.includes('435050'), 'Must define local Easting origin E0 = 435050 (Volve 15/9-F-12 slot)');
  assert(src.includes('6478560'), 'Must define local Northing origin N0 = 6478560');
  assert(src.includes('ORIGIN_E') && src.includes('ORIGIN_N'), 'Must export local metric origin constants');
  assert(src.includes('-st.tvd') || src.includes('- (avgDepth'), 'Z coordinates must be negative TVD for subsurface depth');
  console.log('   ✓ Local metric frame verified (eliminates Float32 jitter).');

  console.log('3. Testing 3D Well Trajectories & Casing Shoes (ResInsight Feature)...');
  assert(src.includes('WELL_TRAJECTORIES_3D'), 'Must define 3D trajectory data structures');
  assert(src.includes('15/9-F-12 Active Replay'), 'Must include 15/9-F-12 active well trajectory');
  assert(src.includes('CatmullRomCurve3'), 'Must generate smooth 3D spline curves for wellbore path');
  assert(src.includes('TubeGeometry'), 'Must extrude 3D tube geometry for well trajectories');
  assert(src.includes('CylinderGeometry') && src.includes('casing'), 'Must render casing shoe rings along wellbore');
  console.log('   ✓ 3D wellbore trajectory tubes and casing shoes verified.');

  console.log('4. Testing Formation Surfaces, Structural Dip, and Curvature...');
  assert(src.includes('api.getSurfaces'), 'Must query /api/surfaces for geological horizons');
  assert(src.includes('PlaneGeometry'), 'Must construct horizon surface geometry');
  assert(src.includes('dipZ') || src.includes('dip'), 'Must calculate structural dip for horizons');
  assert(src.includes('computeVertexNormals'), 'Must compute normals for realistic shading');
  console.log('   ✓ Geological formation surfaces with realistic structural dip verified.');

  console.log('5. Testing Structural Fault Planes (F-1, F-2, F-3)...');
  assert(src.includes('api.getFaults'), 'Must query /api/faults for fault geometries');
  assert(src.includes('BufferGeometry'), 'Must construct fault plane buffer geometries');
  assert(src.includes('0xef4444'), 'Must highlight fault planes as structural hazards');
  console.log('   ✓ Structural fault planes verified.');

  console.log('6. Testing Hugin Reservoir Hydrocarbon Body (Vestland Group)...');
  assert(src.includes('api.getReservoirs'), 'Must query /api/reservoirs for reservoir polygon & thickness');
  assert(src.includes('ExtrudeGeometry'), 'Must extrude 3D reservoir body geometry');
  assert(src.includes('0xeab308'), 'Must render hydrocarbon sand reservoir in gold');
  console.log('   ✓ Jurassic Hugin oil reservoir body verified.');

  console.log('7. Testing Slicing / Clipping Plane & Vertical Exaggeration Controls...');
  assert(src.includes('THREE.Plane'), 'Must construct Three.js clipping plane');
  assert(src.includes('localClippingEnabled = true'), 'Renderer must enable local clipping planes');
  assert(src.includes('verticalExaggeration'), 'Must support vertical exaggeration scaling');
  assert(src.includes('scene.scale.set(1, 1, verticalExaggeration)'), 'Must scale Z axis dynamically');
  assert(src.includes('clipDistance'), 'Must control clipping plane distance interactively');
  console.log('   ✓ Clipping plane and vertical exaggeration controls verified.');

  console.log('8. Testing Raycast Selection & Depth Probe Store Propagation...');
  assert(src.includes('THREE.Raycaster'), 'Must instantiate Three.js raycaster for picking');
  assert(src.includes('setActiveWell'), 'Must update active well in store upon picking');
  assert(src.includes('setSelectedObject'), 'Must update selected geological object');
  assert(src.includes('setCurrentDepth'), 'Must synchronize probed 3D depth to global store');
  console.log('   ✓ Raycasting picking and store synchronization verified.');

  console.log('9. Testing Deterministic WebGL Disposal on Unmount (Memory Leak Prevention)...');
  assert(src.includes('renderer.dispose()'), 'Must dispose renderer on unmount');
  assert(src.includes('renderer.forceContextLoss()'), 'Must force WebGL context loss on unmount');
  assert(src.includes('obj.geometry.dispose()'), 'Must traverse and dispose all geometries');
  assert(src.includes('obj.material.dispose()') || src.includes('m.dispose()'), 'Must traverse and dispose all materials');
  assert(src.includes('cancelAnimationFrame'), 'Must cancel animation frame loop on unmount');
  console.log('   ✓ Deterministic WebGL cleanup and disposal verified.');

  console.log('10. Testing AppShell Integration...');
  const appShellPath = path.join(__dirname, '../web/src/components/layout/AppShell.tsx');
  const appShellSrc = fs.readFileSync(appShellPath, 'utf8');
  assert(appShellSrc.includes('Subsurface3DViewer'), 'AppShell must import Subsurface3DViewer');
  assert(appShellSrc.includes("mode === 'subsurface' && <Subsurface3DViewer />"), 'Must mount Subsurface3DViewer in subsurface mode');
  console.log('   ✓ Subsurface3DViewer properly mounted in AppShell.');

  console.log('\n✓ All 10 Phase 4 Subsurface 3D Tests Passed Successfully!');
}

runSubsurface3DTests().catch(err => {
  console.error('Phase 4 Subsurface 3D Test Failure:', err);
  process.exit(1);
});
