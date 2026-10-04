import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api/client';
import { DATA_NOT_AVAILABLE, INSUFFICIENT_DATA } from '../types';

describe('Centralized Typed API Client (Phase 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes all 8 required endpoints with typed methods', () => {
    expect(typeof api.getWorkspaces).toBe('function');
    expect(typeof api.getWells).toBe('function');
    expect(typeof api.getSurfaces).toBe('function');
    expect(typeof api.getSurfaceGrid).toBe('function');
    expect(typeof api.getFaults).toBe('function');
    expect(typeof api.getReservoirs).toBe('function');
    expect(typeof api.getTerrain).toBe('function');
    expect(typeof api.probeGeology).toBe('function');
    expect(typeof api.analyzeLocation).toBe('function');
  });

  it('handles offline fallback for probeGeology without fabricating data', async () => {
    // Force network fetch failure
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const probe = await api.probeGeology(58.44, 1.88, 2100);
    expect(probe).toBeDefined();
    expect(probe.formation).toBe(DATA_NOT_AVAILABLE);
    expect(probe.lithology).toBe(INSUFFICIENT_DATA);
    expect(probe.data_availability).toBe('DATA_NOT_AVAILABLE');
  });

  it('handles offline fallback for analyzeLocation without fake scores', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const analysis = await api.analyzeLocation({
      latitude: 58.4416,
      longitude: 1.8875,
      target_depth_m: 3100
    });

    expect(analysis).toBeDefined();
    expect(analysis.factors.length).toBeGreaterThan(0);
    expect(analysis.disclaimer).toContain('Zero composite scores');
  });

  it('provides well-centric data methods for logs, mud logs, casings, and availability', () => {
    expect(typeof api.getWellLogs).toBe('function');
    expect(typeof api.getMudLogs).toBe('function');
    expect(typeof api.getCasings).toBe('function');
    expect(typeof api.getDataAvailability).toBe('function');
  });
});
