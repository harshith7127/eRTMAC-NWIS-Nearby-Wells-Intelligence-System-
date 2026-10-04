import { describe, it, expect } from 'vitest';
import { safeValue, isUnavailable } from '../utils/provenance';
import { toLocalMetricFrame, formatCoordinates, VOLVE_ORIGIN } from '../utils/coordinates';
import { formatDepth, formatROP } from '../utils/formatters';
import { DATA_NOT_AVAILABLE, INSUFFICIENT_DATA } from '../types';

describe('Application Architecture, Utilities & Data Integrity', () => {
  it('safeValue returns exact string or DATA NOT AVAILABLE fallback', () => {
    expect(safeValue('Hugin Fm.')).toBe('Hugin Fm.');
    expect(safeValue(null)).toBe(DATA_NOT_AVAILABLE);
    expect(safeValue(undefined)).toBe(DATA_NOT_AVAILABLE);
    expect(safeValue('')).toBe(DATA_NOT_AVAILABLE);
    expect(safeValue(null, INSUFFICIENT_DATA)).toBe(INSUFFICIENT_DATA);
  });

  it('isUnavailable correctly detects missing values', () => {
    expect(isUnavailable(null)).toBe(true);
    expect(isUnavailable(undefined)).toBe(true);
    expect(isUnavailable(DATA_NOT_AVAILABLE)).toBe(true);
    expect(isUnavailable(INSUFFICIENT_DATA)).toBe(true);
    expect(isUnavailable('Valid Lithology')).toBe(false);
  });

  it('toLocalMetricFrame maps coordinates to local origin (Rule 8)', () => {
    const easting = 435100.0;
    const northing = 6478200.0;
    const tvd = 2000.0;

    const [lx, ly, lz] = toLocalMetricFrame(easting, northing, tvd, VOLVE_ORIGIN);
    expect(lx).toBe(100.0);
    expect(ly).toBe(200.0);
    expect(lz).toBe(-2000.0);
  });

  it('formatCoordinates handles north/south and east/west hemispheres', () => {
    const formatted = formatCoordinates(58.441636, 1.887483);
    expect(formatted).toContain('58.44164° N');
    expect(formatted).toContain('1.88748° E');
  });

  it('formatDepth formats depth with reference basis and handles invalid values', () => {
    expect(formatDepth(1842.54, 'MD')).toBe('1842.5 m MD');
    expect(formatDepth(2000.0, 'TVD')).toBe('2000.0 m TVD');
    expect(formatDepth(null)).toBe(DATA_NOT_AVAILABLE);
    expect(formatDepth(NaN)).toBe(DATA_NOT_AVAILABLE);
  });

  it('formatROP formats rate of penetration in m/hr', () => {
    expect(formatROP(25.4)).toBe('25.4 m/hr');
    expect(formatROP(null)).toBe(DATA_NOT_AVAILABLE);
  });
});
