import React, { useState, useEffect } from 'react';
import { useSelectionStore, WORKSPACES } from '../../store/useSelectionStore';
import { ProvenanceChip } from '../common/ProvenanceChip';
import { Globe, MapPin, Compass, Clock } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const {
    workspaceId,
    mode,
    activeWellId,
    currentDepth,
    depthBasis,
    camera
  } = useSelectionStore();

  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ws = WORKSPACES[workspaceId] || WORKSPACES['volve'];

  return (
    <footer
      style={{
        height: 'var(--status-bar-height)',
        backgroundColor: 'var(--bg-surface-sunken)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        userSelect: 'none',
        zIndex: 50
      }}
    >
      {/* Left: Breadcrumbs & CRS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={12} color="var(--text-muted)" />
          <span>CRS: <strong>{ws.crs}</strong></span>
        </div>
        <span>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={12} color="var(--text-muted)" />
          <span>
            Lat: {camera.latitude.toFixed(5)}°N, Lon: {camera.longitude.toFixed(5)}°E
          </span>
        </div>
        <span>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Compass size={12} color="var(--text-muted)" />
          <span>Mode: <strong>{mode.toUpperCase()}</strong></span>
        </div>
      </div>

      {/* Middle: Selection Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Selection:</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
          {ws.id.toUpperCase()} &gt; {activeWellId || 'All Wells'} &gt; {currentDepth.toFixed(1)}m {depthBasis}
        </span>
      </div>

      {/* Right: Provenance, Latency & Live Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-family-mono, monospace)' }}>
          <Clock size={11} color="var(--text-muted)" />
          <span>
            {time.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </span>
        </div>
        <span>•</span>
        <span>Response: &lt;50ms</span>
        <span>•</span>
        <ProvenanceChip origin={ws.defaultOrigin} size="sm" />
      </div>
    </footer>
  );
};
