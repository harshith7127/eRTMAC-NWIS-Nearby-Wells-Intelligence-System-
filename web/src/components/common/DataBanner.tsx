import React from 'react';
import { useSelectionStore, WORKSPACES } from '../../store/useSelectionStore';

export const DataBanner: React.FC = () => {
  const workspaceId = useSelectionStore((s) => s.workspaceId);
  const ws = WORKSPACES[workspaceId] || WORKSPACES['volve'];

  return (
    <div
      role="alert"
      style={{
        width: '100%',
        backgroundColor: ws.defaultOrigin === 'SYNTHETIC' ? '#fff1f2' : 'var(--color-brand-primary)',
        color: ws.defaultOrigin === 'SYNTHETIC' ? '#9f1239' : '#ffffff',
        borderBottom: ws.defaultOrigin === 'SYNTHETIC' ? '1px solid #fecdd3' : '1px solid rgba(0, 0, 0, 0.1)',
        padding: '3px var(--space-4)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        letterSpacing: '0.01em',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: ws.defaultOrigin === 'SYNTHETIC' ? '#e11d48' : '#38bdf8'
          }}
        />
        <span>{ws.bannerText}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', opacity: 0.9 }}>
        <span>CRS: {ws.crs}</span>
        <span>•</span>
        <span>Oil India Subsurface Platform</span>
      </div>
    </div>
  );
};
