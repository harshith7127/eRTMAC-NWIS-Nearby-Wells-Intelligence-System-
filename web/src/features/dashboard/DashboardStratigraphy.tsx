import React, { useState } from 'react';
import { ProvenanceChip } from '../../components/common/ProvenanceChip';
import {
  Compass,
  Layers
} from 'lucide-react';
import type { FormationPick } from '../../types';

interface DashboardStratigraphyProps {
  formations: FormationPick[];
  activeWellId: string | null;
  currentDepth: number;
  onDepthChange: (depth: number) => void;
}

export const DashboardStratigraphy: React.FC<DashboardStratigraphyProps> = ({
  formations,
  activeWellId,
  currentDepth,
  onDepthChange
}) => {
  const [selectedFormationName, setSelectedFormationName] = useState<string | null>(null);

  // Chronostratigraphic color palette
  const getFmColor = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('nordland')) return '#bae6fd'; // Light cyan
    if (lower.includes('utsira')) return '#fed7aa';   // Warm sand
    if (lower.includes('up hordaland') || lower.includes('upper hordaland')) return '#e9d5ff'; // Pale purple
    if (lower.includes('low hordaland') || lower.includes('lower hordaland')) return '#fecaca'; // Soft red/pink
    if (lower.includes('rogaland')) return '#fef08a';  // Pale yellow
    if (lower.includes('shetland') || lower.includes('chalk')) return '#bbf7d0'; // Chalk green
    if (lower.includes('viking')) return '#ddd6fe';    // Deep lilac
    if (lower.includes('hugin')) return '#38bdf8';     // Reservoir blue
    if (lower.includes('sleipner')) return '#fbcfe8';  // Pinkish sand
    return '#cbd5e1';
  };

  const selectedFm = formations.find(f => (f.canonical_name || f.formation_name) === selectedFormationName) || formations[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Feature Banner & Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Stratigraphic Tops</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>{formations.length} Picked Tops</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>NPD Official Volve Biostratigraphy</div>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Primary Target Reservoir</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0284c7', marginTop: '2px' }}>Hugin Formation</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Middle Jurassic Marine Sandstone</div>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Column Span</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', marginTop: '2px' }}>
            {formations.length > 0 ? `${formations[0].top_md.toFixed(0)} - ${formations[formations.length - 1].top_md.toFixed(0)} m` : '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Total Stratigraphic Penetration</div>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Stratigraphic Datum</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>Kelly Bushing (KB)</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Elevation Reference: 25.0 m MSL</div>
        </div>
      </div>

      {/* 2. Interactive Split: Stratigraphic Column & Detailed Sequence Table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '16px'
        }}
      >
        {/* Table Column */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={16} color="var(--color-brand-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>
                Lithostratigraphic Tops Sequence ({activeWellId || '15/9-F-12'})
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Click any formation row to jump depth
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-sunken)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Formation Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Top MD</th>
                  <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Top TVD</th>
                  <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Est. Thickness</th>
                  <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Lithology Description</th>
                  <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Provenance</th>
                </tr>
              </thead>
              <tbody>
                {formations.map((f, i) => {
                  const name = f.canonical_name || f.formation_name;
                  const isSelected = selectedFm && (selectedFm.canonical_name || selectedFm.formation_name) === name;
                  const nextFm = formations[i + 1];
                  const thickness = nextFm ? (nextFm.top_md - f.top_md).toFixed(0) + ' m' : '—';
                  const isCurrentBit = currentDepth >= f.top_md && (!nextFm || currentDepth < nextFm.top_md);

                  return (
                    <tr
                      key={f.id || i}
                      onClick={() => {
                        setSelectedFormationName(name);
                        onDepthChange(f.top_md);
                      }}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isCurrentBit ? '#eff6ff' : isSelected ? 'var(--bg-surface-raised)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentBit && !isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-surface-raised)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentBit && !isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              backgroundColor: getFmColor(name),
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                          />
                          <span style={{ color: isCurrentBit ? '#0284c7' : 'var(--text-primary)' }}>{name}</span>
                          {isCurrentBit && (
                            <span style={{ padding: '1px 6px', fontSize: '10px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '4px', fontWeight: 'bold' }}>
                              BIT HERE
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>
                        {f.top_md.toFixed(1)} m
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
                        {f.top_tvd ? `${f.top_tvd.toFixed(1)} m` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
                        {thickness}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {f.lithology || 'Sedimentary sequence'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <ProvenanceChip origin={f.provenance} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stratigraphic Visualizer Column */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} color="var(--color-brand-primary)" />
            <span>Stratigraphic Column</span>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: '400px',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {formations.map((f, i) => {
              const name = f.canonical_name || f.formation_name;
              const nextFm = formations[i + 1];
              const interval = nextFm ? nextFm.top_md - f.top_md : 200;

              return (
                <div
                  key={f.id || i}
                  onClick={() => {
                    setSelectedFormationName(name);
                    onDepthChange(f.top_md);
                  }}
                  title={`${name}: ${f.top_md.toFixed(0)}m - ${f.lithology || ''}`}
                  style={{
                    flexGrow: Math.max(1, Math.min(10, Math.round(interval / 100))),
                    backgroundColor: getFmColor(name),
                    borderBottom: '1px solid rgba(0,0,0,0.15)',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'filter 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(0.95)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', fontFamily: 'var(--font-family-mono)' }}>
                    {f.top_md.toFixed(0)} m
                  </div>
                </div>
              );
            })}

            {/* Depth Cursor Indicator */}
            {formations.length > 0 && (() => {
              const minD = formations[0].top_md;
              const maxD = formations[formations.length - 1].top_md + 200;
              const pct = Math.max(0, Math.min(100, ((currentDepth - minD) / (maxD - minD)) * 100));
              return (
                <div
                  style={{
                    position: 'absolute',
                    top: `${pct}%`,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#dc2626',
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '4px'
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 'bold', backgroundColor: '#dc2626', color: '#ffffff', padding: '1px 4px', borderRadius: '2px' }}>
                    {currentDepth.toFixed(0)}m
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
