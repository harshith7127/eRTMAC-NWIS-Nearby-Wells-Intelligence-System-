import React, { useState } from 'react';
import { ProvenanceChip } from '../../components/common/ProvenanceChip';
import { Search } from 'lucide-react';
import type { Well } from '../../types';

interface DashboardFleetProps {
  wells: Well[];
  activeWellId: string | null;
  onSelectWell: (wellId: string) => void;
  onNavigateMode: (mode: 'MAP' | 'SUBSURFACE' | 'NEAR_WELL') => void;
}

export const DashboardFleet: React.FC<DashboardFleetProps> = ({
  wells,
  activeWellId,
  onSelectWell,
  onNavigateMode
}) => {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredWells = wells.filter((w) => {
    const matchesText =
      w.name.toLowerCase().includes(filterText.toLowerCase()) ||
      w.id.toLowerCase().includes(filterText.toLowerCase()) ||
      w.operator.toLowerCase().includes(filterText.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PROD' && w.status.toLowerCase().includes('prod')) ||
      (statusFilter === 'PA' && w.status.toLowerCase().includes('abandoned'));

    return matchesText && matchesStatus;
  });

  // Calculate fleet statistics
  const totalWells = wells.length;
  const totalDepthSum = wells.reduce((acc, w) => acc + (w.total_depth_m || 0), 0);
  const avgDepth = totalWells > 0 ? (totalDepthSum / totalWells).toFixed(0) : '0';
  const deepestWell = wells.reduce(
    (max, w) => ((w.total_depth_m || 0) > (max.total_depth_m || 0) ? w : max),
    wells[0] || { total_depth_m: 0, name: '—' }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. Fleet Spatial & Geodetic Header KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Fleet Size</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>{totalWells} Wellbores</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Volve Field Open Repository</div>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Average Total Depth</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0284c7', marginTop: '2px' }}>{avgDepth} m</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Across all drilled intervals</div>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Deepest Wellbore</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {deepestWell?.name?.split(' ')[0]} ({deepestWell?.total_depth_m} m)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Deep exploration penetrations</div>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Geodetic Reference</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>ED50 / UTM 31N</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>WGS84 58.44°N, 1.88°E</div>
        </div>
      </div>

      {/* 2. Controls & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '220px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter wells by name, operator, or ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            <option value="ALL">All Statuses ({wells.length})</option>
            <option value="PROD">Production</option>
            <option value="PA">Plugged &amp; Abandoned</option>
          </select>
        </div>
      </div>

      {/* 3. Comprehensive Well Catalog Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-sunken)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Well Name / ID</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Operator</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>TD (m MD)</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Water Depth</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Coordinates</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Provenance</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWells.map((w) => {
                const isActive = (activeWellId || '15/9-F-12') === w.id;
                return (
                  <tr
                    key={w.id}
                    onClick={() => onSelectWell(w.id)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isActive ? 'var(--color-brand-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface-raised)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: isActive ? 'bold' : '500', color: isActive ? 'var(--color-brand-primary)' : 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? 'var(--color-brand-primary)' : '#94a3b8' }} />
                        <span>{w.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {w.operator}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          backgroundColor: w.status.includes('Prod') ? '#ecfdf5' : '#f1f5f9',
                          color: w.status.includes('Prod') ? '#065f46' : '#475569',
                          border: `1px solid ${w.status.includes('Prod') ? '#a7f3d0' : '#cbd5e1'}`
                        }}
                      >
                        {w.status.split('(')[0].trim()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>
                      {w.total_depth_m ? `${w.total_depth_m.toFixed(0)} m` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
                      {w.water_depth_m ? `${w.water_depth_m.toFixed(0)} m` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {w.lat.toFixed(4)}°N, {w.lon.toFixed(4)}°E
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <ProvenanceChip origin={w.provenance} size="sm" />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWell(w.id);
                          onNavigateMode('SUBSURFACE');
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-brand-primary)',
                          color: '#ffffff'
                        }}
                      >
                        3D View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
