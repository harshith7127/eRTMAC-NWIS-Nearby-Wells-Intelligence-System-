/**
 * Provenance & Anti-Hallucination Utilities — SIH-121
 * Complies strictly with Rules R2, R4, R5:
 * - Real vs Derived vs Synthetic clearly distinguished
 * - No fake AI scores or arbitrary percentages
 * - Missing values explicitly marked as DATA NOT AVAILABLE or INSUFFICIENT DATA
 */

import { DATA_NOT_AVAILABLE, INSUFFICIENT_DATA, ProvenanceOrigin } from '../types';

export function getProvenanceLabel(origin: ProvenanceOrigin): string {
  switch (origin) {
    case 'REAL':
      return 'Real Historical (Volve)';
    case 'DERIVED':
      return 'Deterministic Derived (Physics)';
    case 'SYNTHETIC':
      return 'Simulated / Synthetic Demo';
    default:
      return 'Unknown Provenance';
  }
}

export function getProvenanceBadgeStyles(origin: ProvenanceOrigin): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  switch (origin) {
    case 'REAL':
      return {
        backgroundColor: 'var(--prov-real-bg)',
        borderColor: 'var(--prov-real-border)',
        color: 'var(--prov-real-text)'
      };
    case 'DERIVED':
      return {
        backgroundColor: 'var(--prov-derived-bg)',
        borderColor: 'var(--prov-derived-border)',
        color: 'var(--prov-derived-text)'
      };
    case 'SYNTHETIC':
      return {
        backgroundColor: 'var(--prov-synthetic-bg)',
        borderColor: 'var(--prov-synthetic-border)',
        color: 'var(--prov-synthetic-text)'
      };
    default:
      return {
        backgroundColor: 'var(--bg-surface-sunken)',
        borderColor: 'var(--border-medium)',
        color: 'var(--text-muted)'
      };
  }
}

export function safeValue<T>(val: T | null | undefined, fallback: string = DATA_NOT_AVAILABLE): string {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return fallback;
    return val.toString();
  }
  return String(val);
}

export function isUnavailable(val: any): boolean {
  return val === null || val === undefined || val === '' || val === DATA_NOT_AVAILABLE || val === INSUFFICIENT_DATA;
}
