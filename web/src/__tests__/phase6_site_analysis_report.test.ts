import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api/client';
import { useSelectionStore } from '../store/useSelectionStore';

describe('Phase 6: Site Analysis, Explainability & Reporting', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('analyzeLocation returns explainable factors without arbitrary scores (Rule R5)', async () => {
    const mockResponse = {
      latitude: 58.441636,
      longitude: 1.887483,
      target_depth_m: 3100.0,
      target_formation: 'Hugin Formation',
      workspace: 'volve',
      factors: [
        {
          factor: 'geographic_coverage',
          status: 'OK',
          rule: 'RULE_SPATIAL_DOMAIN_COVERAGE',
          summary: 'Location is within verified exploration survey domain.',
          evidence: 'Coordinates fall within licensed field survey bounds.',
          source: 'NWIS Geographic Survey Extent',
          provenance: 'REAL'
        },
        {
          factor: 'offset_well_control',
          status: 'OK',
          rule: 'RULE_OFFSET_DENSITY_TRIANGULATION',
          summary: '4 offset wells within 5.0 km provide robust multi-well correlation.',
          evidence: 'Verified nearby well control: 15/9-F-12, 15/9-F-15.',
          source: 'Volve Well Registry',
          provenance: 'REAL'
        },
        {
          factor: 'reservoir_intersection',
          status: 'OK',
          rule: 'RULE_RESERVOIR_PENETRATION',
          summary: 'Target depth directly intersects Middle Jurassic Hugin reservoir sandstone.',
          evidence: 'Verified reservoir interval in Vestland Group.',
          source: 'Volve 3D Static Reservoir Model',
          provenance: 'REAL'
        },
        {
          factor: 'structural_fault_proximity',
          status: 'OK',
          rule: 'RULE_FAULT_STANDOFF_CLEARANCE',
          summary: 'Adequate clearance from major mapped faults.',
          evidence: 'Nearest fault >300m away.',
          source: 'Volve Structural Fault Model',
          provenance: 'REAL'
        },
        {
          factor: 'well_log_availability',
          status: 'OK',
          rule: 'RULE_PETROPHYSICAL_LOG_CONTROL',
          summary: 'High-fidelity wireline/LWD petrophysical logs recorded in offset wells.',
          evidence: 'Available curves: GR, RES, RHOB, NPHI, DT.',
          source: 'Volve Wireline Petrophysical Database',
          provenance: 'REAL'
        }
      ],
      overall_confidence: 'HIGH',
      nearby_wells: [
        { well_id: '15/9-F-12', name: '15/9-F-12', dist_km: 0.05, td: 3520.0 }
      ],
      data_gaps: [],
      provenance: 'REAL',
      disclaimer: 'Deterministic evaluation based on verified offset evidence only.'
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const analysis = await api.analyzeLocation({
      latitude: 58.441636,
      longitude: 1.887483,
      target_depth_m: 3100.0,
      target_formation: 'Hugin Formation',
      radius_km: 5.0,
      workspace: 'volve'
    });

    // Rule R5 Anti-Hallucination: No arbitrary scores
    expect((analysis as any).score).toBeUndefined();
    expect((analysis as any).suitability).toBeUndefined();
    expect((analysis as any).suitability_percentage).toBeUndefined();
    expect((analysis as any).risk_score).toBeUndefined();

    // Check explainability structure
    expect(analysis.factors).toBeDefined();
    expect(Array.isArray(analysis.factors)).toBe(true);
    expect(analysis.factors.length).toBeGreaterThanOrEqual(5);

    const validStatuses = new Set(['OK', 'UNKNOWN', 'CONCERN']);
    for (const f of analysis.factors as any[]) {
      expect(validStatuses.has(f.status)).toBe(true);
      expect((f.summary || '').length).toBeGreaterThan(0);
      expect((f.evidence || '').length).toBeGreaterThan(0);
      expect((f.source || '').length).toBeGreaterThan(0);
      expect(['REAL', 'SYNTHETIC', 'DERIVED'].includes(f.provenance || f.origin)).toBe(true);
    }

    expect(['HIGH', 'MEDIUM', 'MODERATE', 'LOW', 'UNKNOWN'].includes(analysis.overall_confidence!)).toBe(true);
  });

  it('updates selection store with proposed location and switches to ANALYSIS/REPORT mode', () => {
    const store = useSelectionStore.getState();

    // Propose location coordinates
    store.setSelectedLocation({ lat: 58.442, lon: 1.889 });
    expect(useSelectionStore.getState().selectedLocation).toEqual({ lat: 58.442, lon: 1.889 });
    expect(useSelectionStore.getState().proposedLocation).toEqual({ lat: 58.442, lon: 1.889 });

    // Switch to ANALYSIS mode
    store.setActiveMode('ANALYSIS');
    expect(useSelectionStore.getState().activeMode).toBe('ANALYSIS');

    // Switch to REPORT mode
    store.setActiveMode('REPORT');
    expect(useSelectionStore.getState().activeMode).toBe('REPORT');
  });

  it('correctly handles network failure with safe offline fallback without fabricating data', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    const fallback = await api.analyzeLocation({
      latitude: 10.0,
      longitude: -10.0,
      target_depth_m: 3100.0,
      workspace: 'volve'
    });

    expect(fallback).toBeDefined();
    expect(fallback.factors.length).toBeGreaterThanOrEqual(1);
    expect(fallback.factors[0].status).toBe('UNKNOWN');
    expect(fallback.disclaimer).toContain('Zero composite scores');
  });
});
