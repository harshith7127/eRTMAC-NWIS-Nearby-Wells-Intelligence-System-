import React from 'react';
import type { ProvenanceOrigin, ConfidenceLevel } from '../../types';

interface ProvenanceChipProps {
  origin: ProvenanceOrigin;
  confidence?: ConfidenceLevel | number;
  source?: string;
  size?: 'sm' | 'md';
}

export const ProvenanceChip: React.FC<ProvenanceChipProps> = ({
  origin,
  confidence,
  source,
  size = 'sm'
}) => {
  const getColors = () => {
    switch (origin) {
      case 'REAL':
        return {
          bg: 'var(--prov-real-bg)',
          border: 'var(--prov-real-border)',
          text: 'var(--prov-real-text)',
          label: 'REAL DATA'
        };
      case 'DERIVED':
        return {
          bg: 'var(--prov-derived-bg)',
          border: 'var(--prov-derived-border)',
          text: 'var(--prov-derived-text)',
          label: 'DERIVED'
        };
      case 'SYNTHETIC':
        return {
          bg: 'var(--prov-synthetic-bg)',
          border: 'var(--prov-synthetic-border)',
          text: 'var(--prov-synthetic-text)',
          label: 'SYNTHETIC'
        };
      default:
        return {
          bg: 'var(--bg-surface-sunken)',
          border: 'var(--border-medium)',
          text: 'var(--text-muted)',
          label: 'UNKNOWN'
        };
    }
  };

  const style = getColors();
  const padding = size === 'sm' ? '2px 6px' : '4px 8px';
  const fontSize = size === 'sm' ? 'var(--font-size-xs)' : 'var(--font-size-sm)';

  return (
    <span
      title={source ? `Source: ${source}` : `Data origin: ${origin}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        fontSize,
        fontWeight: 'var(--font-weight-semibold)',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        borderRadius: 'var(--radius-sm)',
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        userSelect: 'none'
      }}
    >
      <span>{style.label}</span>
      {confidence && (
        <span style={{ opacity: 0.8, fontSize: '11px', fontWeight: 'normal' }}>
          • {typeof confidence === 'number' ? `${Math.round(confidence * 100)}%` : confidence}
        </span>
      )}
    </span>
  );
};
