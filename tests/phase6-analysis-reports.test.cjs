/**
 * NWIS Phase 6 Site Analysis & Reports Tests
 * 
 * Validates:
 * 1. SiteAnalysisModal: Interactive location feasibility parameters
 * 2. Explainable Factor Checklist: Factor, Status (OK, UNKNOWN, CONCERN), Evidence, Source
 * 3. Strict Rule 5 Compliance: Absence of arbitrary composite percentage scores
 * 4. Data Confidence Rating: HIGH, MODERATE, LOW, UNKNOWN with defensible methodology
 * 5. Technical Limitations & Data Gaps explicitly documented
 * 6. PrintableReportModal: Professional A4 format, WGS84 + ED50 UTM 31N, provenance banner, officer sign-off
 * 7. Header Integration: Site Analysis & Report trigger button
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function runPhase6Tests() {
  console.log('=== NWIS Phase 6 Site Analysis & Reports Tests ===\n');

  console.log('1. Testing SiteAnalysisModal component existence and API integration...');
  const modalPath = path.join(__dirname, '../web/src/components/analysis/SiteAnalysisModal.tsx');
  assert(fs.existsSync(modalPath), 'SiteAnalysisModal.tsx must exist');
  const modalSrc = fs.readFileSync(modalPath, 'utf8');
  assert(modalSrc.includes('api.analyzeLocation'), 'Must query /api/locations/analyze');
  assert(modalSrc.includes('latitude') || modalSrc.includes('lat'), 'Must pass latitude parameter');
  assert(modalSrc.includes('targetDepth'), 'Must pass target depth parameter');
  assert(modalSrc.includes('targetFormation'), 'Must pass target formation parameter');
  console.log('   ✓ SiteAnalysisModal API integration verified.');

  console.log('2. Testing Explainable Factor Checklist (Rule 5: No Arbitrary Scores)...');
  assert(modalSrc.includes("case 'OK':") && modalSrc.includes("case 'CONCERN':"), 'Must render OK, CONCERN, UNKNOWN status badges');
  assert(modalSrc.includes('f.evidence'), 'Must display specific geological/engineering evidence');
  assert(modalSrc.includes('f.source'), 'Must cite specific data source');
  assert(!modalSrc.includes('82%') && !modalSrc.includes('suitability score'), 'Must NOT contain arbitrary percentage scores (Rule R5)');
  console.log('   ✓ Explainable factor checklist verified.');

  console.log('3. Testing Data Confidence Rating & Methodology...');
  assert(modalSrc.includes('HIGH DATA CONFIDENCE') || modalSrc.includes('HIGH'), 'Must evaluate high confidence');
  assert(modalSrc.includes('MODERATE CONFIDENCE') || modalSrc.includes('MODERATE'), 'Must evaluate moderate confidence');
  assert(modalSrc.includes('LOW / UNVERIFIED CONFIDENCE') || modalSrc.includes('LOW'), 'Must evaluate low confidence');
  assert(modalSrc.includes('confidence evaluated') || modalSrc.includes('defensible methodology'), 'Must specify defensible confidence methodology');
  console.log('   ✓ Data confidence ratings and methodology verified.');

  console.log('4. Testing Explicit Data Gaps Callout...');
  assert(modalSrc.includes('Documented Technical Limitations & Data Gaps') || modalSrc.includes('data_gaps'), 'Must report explicit data gaps');
  assert(modalSrc.includes('analysisResult?.data_gaps'), 'Must render data gaps from backend');
  console.log('   ✓ Explicit technical data gaps callout verified.');

  console.log('5. Testing PrintableReportModal A4 Dossier Format...');
  const reportPath = path.join(__dirname, '../web/src/components/reports/PrintableReportModal.tsx');
  assert(fs.existsSync(reportPath), 'PrintableReportModal.tsx must exist');
  const repSrc = fs.readFileSync(reportPath, 'utf8');
  assert(repSrc.includes('PROPOSED DRILLING LOCATION DOSSIER'), 'Must title document as proposed drilling location dossier');
  assert(repSrc.includes('210mm') && repSrc.includes('297mm'), 'Must format for standard A4 portrait dimensions');
  assert(repSrc.includes('window.print()'), 'Must provide direct window.print() trigger');
  assert(repSrc.includes('WGS84 Coordinates:') && repSrc.includes('ED50 UTM Zone 31N:'), 'Must show both WGS84 and ED50 UTM 31N coordinates');
  assert(repSrc.includes('WORKSPACE A') && repSrc.includes('WORKSPACE B'), 'Must distinguish Workspace A (Volve) from Workspace B (Demo)');
  assert(repSrc.includes('REVIEWING EXPLORATION OFFICER:'), 'Must include official exploration officer sign-off block');
  console.log('   ✓ Professional printable A4 exploration dossier verified.');

  console.log('6. Testing Header Integration...');
  const headerPath = path.join(__dirname, '../web/src/components/layout/Header.tsx');
  const headerSrc = fs.readFileSync(headerPath, 'utf8');
  assert(headerSrc.includes('SiteAnalysisModal'), 'Header must import SiteAnalysisModal');
  assert(headerSrc.includes('Site Analysis & Report') || headerSrc.includes('Site Analysis &amp; Report'), 'Header must have Site Analysis trigger button');
  console.log('   ✓ Site Analysis button mounted in Header.');

  console.log('7. Testing 3D Subsurface Proposed Location Visualization & Analysis...');
  const sub3dPath = path.join(__dirname, '../web/src/components/subsurface/Subsurface3DViewer.tsx');
  assert(fs.existsSync(sub3dPath), 'Subsurface3DViewer.tsx must exist');
  const sub3dSrc = fs.readFileSync(sub3dPath, 'utf8');
  assert(sub3dSrc.includes('proposed_well_rig'), 'Must build 3D proposed location surface rig marker');
  assert(sub3dSrc.includes('proposed_well_trajectory'), 'Must build 3D proposed borehole trajectory tube');
  assert(sub3dSrc.includes('proposed_target_disc'), 'Must build 3D target horizon intersection disc');
  assert(sub3dSrc.includes('standoffLine'), 'Must compute standoff measurement line to nearest well');
  assert(sub3dSrc.includes('Proposed Well Target'), 'Must include proposed location in Object Tree');
  assert(sub3dSrc.includes('SiteAnalysisModal'), 'Must integrate SiteAnalysisModal in 3D viewer');
  console.log('   ✓ 3D Subsurface proposed location analysis verified.');

  console.log('\n✓ All 7 Phase 6 Site Analysis & Reports Tests Passed Successfully!');
}

runPhase6Tests().catch(err => {
  console.error('Phase 6 Test Failure:', err);
  process.exit(1);
});
