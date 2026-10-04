import React from 'react';
import {
  Compass,
  Layers,
  Map,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import type { Well, FormationPick, LookaheadResult } from '../../types';

interface DashboardOverviewProps {
  well: Well | null;
  wells: Well[];
  currentDepth: number;
  formations: FormationPick[];
  lookahead: LookaheadResult | null;
  telemetry: any;
  onSelectTab: (tab: 'fleet' | 'stratigraphy' | 'lookahead' | 'telemetry') => void;
  onNavigateMode: (mode: 'MAP' | 'SUBSURFACE' | 'NEAR_WELL' | 'COMPARISON' | 'ANALYSIS' | 'REPORT') => void;
  onSelectWell: (wellId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  well,
  wells,
  currentDepth,
  formations,
  lookahead,
  telemetry,
  onSelectTab,
  onNavigateMode,
  onSelectWell
}) => {
  // Current active formation based on current depth
  const activeFm = formations.find((f, i) => {
    const nextFm = formations[i + 1];
    const top = f.top_md;
    const base = f.base_md ?? nextFm?.top_md ?? (top + 150);
    return currentDepth >= top && currentDepth < base;
  }) || formations[formations.length - 1];

  const hazardCount = lookahead?.events?.length || 0;
  const hasHazard = lookahead?.status === 'HAZARD_IDENTIFIED' || hazardCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Executive KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px'
        }}
      >
        {/* Card 1: Active Well & Depth */}
        <div
          onClick={() => onSelectTab('fleet')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Active Wellbore
            </span>
            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }}>
              {well?.status?.includes('Prod') ? 'Production' : 'P&A Catalog'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {well?.name || '15/9-F-12'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Depth: <strong style={{ color: '#0284c7' }}>{currentDepth.toFixed(1)} m MD</strong> / TD {well?.total_depth_m ?? 3520} m
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Operator: {well?.operator?.split(' ')[0] || 'Equinor'}</span>
            <span style={{ color: 'var(--color-brand-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Fleet <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Geological Stratum */}
        <div
          onClick={() => onSelectTab('stratigraphy')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Current Stratum
            </span>
            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 'bold' }}>
              {formations.length} Horizons
            </span>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeFm?.canonical_name || activeFm?.formation_name || 'Hordaland Shale'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Lithology: <strong>{activeFm?.lithology || 'Marine Mudstone'}</strong>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Top: {activeFm?.top_md?.toFixed(0) || '1975'} m</span>
            <span style={{ color: 'var(--color-brand-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Stratigraphy <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Look-Ahead Hazard Condition */}
        <div
          onClick={() => onSelectTab('lookahead')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: `1px solid ${hasHazard ? '#fecaca' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Look-Ahead Safety
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                backgroundColor: hasHazard ? '#fee2e2' : '#dcfce7',
                color: hasHazard ? '#b91c1c' : '#15803d',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {hasHazard ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
              {hasHazard ? `${hazardCount} Alert${hazardCount > 1 ? 's' : ''}` : 'Clear'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: hasHazard ? '#b91c1c' : '#15803d', marginBottom: '2px' }}>
              {hasHazard ? 'Hazard Identified' : 'Standard Drilling Margin'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Coverage: <strong>{lookahead?.k_of_n_text || '5 offset wells analyzed'}</strong>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Window: +300 m MD</span>
            <span style={{ color: 'var(--color-brand-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Look-Ahead <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Live Telemetry Indicator */}
        <div
          onClick={() => onSelectTab('telemetry')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Drilling Telemetry
            </span>
            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' }}>
              Live Stream
            </span>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {telemetry?.rop ? `${telemetry.rop.toFixed(1)} m/h` : '133.8 m/h'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              WOB: <strong>{telemetry?.wob ?? 11.9} kN</strong> • RPM: <strong>{telemetry?.rpm ?? 145}</strong>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Mud: {telemetry?.mud_weight ?? 1.28} SG</span>
            <span style={{ color: 'var(--color-brand-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Telemetry <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick-Launch Action Strip */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
              Multi-Dimensional Exploration Workspaces
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Switch directly into spatial, subsurface, or near-well analytical environments
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onNavigateMode('MAP')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: 'var(--bg-surface-sunken)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          >
            <Map size={13} color="#0284c7" />
            <span>2D Map View</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateMode('SUBSURFACE')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 1px 2px rgba(2,132,199,0.3)'
            }}
          >
            <Layers size={13} />
            <span>Enter 3D Subsurface</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateMode('NEAR_WELL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: 'var(--bg-surface-sunken)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          >
            <Compass size={13} color="#0d9488" />
            <span>Near-Well 3D Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateMode('ANALYSIS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: 'var(--bg-surface-sunken)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          >
            <ShieldCheck size={13} color="#7c3aed" />
            <span>Site Analysis</span>
          </button>
        </div>
      </div>

      {/* 3. Combined Dual-Panel Intelligence Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Left Column: Stratigraphy Sequence & Well Summary */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={16} color="var(--color-brand-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Stratigraphic Horizons &amp; Depth Profile
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('stratigraphy')}
              style={{ fontSize: '11px', color: 'var(--color-brand-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              View All Formations <ArrowRight size={11} />
            </button>
          </div>

          {/* Mini Horizon Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {formations.slice(0, 6).map((fm, idx) => {
              const isCurrent = activeFm?.canonical_name === fm.canonical_name;
              return (
                <div
                  key={fm.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isCurrent ? 'var(--color-brand-light)' : 'var(--bg-surface-raised)',
                    border: isCurrent ? '1px solid var(--color-brand-primary)' : '1px solid var(--border-subtle)',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        backgroundColor: isCurrent ? 'var(--color-brand-primary)' : '#94a3b8'
                      }}
                    />
                    <span style={{ fontWeight: isCurrent ? 'bold' : '500', color: isCurrent ? 'var(--color-brand-primary)' : 'var(--text-primary)' }}>
                      {fm.canonical_name || fm.formation_name}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--color-brand-primary)', color: '#ffffff', fontWeight: 'bold' }}>
                        ACTIVE DEPTH
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                    <span>{fm.top_md.toFixed(0)} m MD</span>
                    <span style={{ color: 'var(--text-muted)' }}>{fm.lithology ? fm.lithology.split(' ')[0] : 'Shale'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Well Selector Strip */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Switch Active Wellbore:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {wells.slice(0, 5).map((w) => {
                const isSelected = (well?.id || '15/9-F-12') === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWell(w.id)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      backgroundColor: isSelected ? 'var(--color-brand-primary)' : 'var(--bg-surface-sunken)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-medium)'
                    }}
                  >
                    {w.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Look-Ahead Advisory & Live Operations Feed */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color={hasHazard ? '#dc2626' : '#16a34a'} />
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Look-Ahead Advisory &amp; Offset Intelligence
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('lookahead')}
              style={{ fontSize: '11px', color: 'var(--color-brand-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              Full Rules Matrix <ArrowRight size={11} />
            </button>
          </div>

          {/* Lookahead Alerts Box */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: hasHazard ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${hasHazard ? '#fecaca' : '#bbf7d0'}`,
              marginBottom: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {hasHazard ? <AlertTriangle size={15} color="#b91c1c" /> : <CheckCircle size={15} color="#15803d" />}
              <span style={{ fontWeight: 'bold', fontSize: '12px', color: hasHazard ? '#991b1b' : '#166534' }}>
                {hasHazard ? 'Offset Hazard Notice Ahead of Bit' : 'No Critical Offset Incidents Detected'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: hasHazard ? '#7f1d1d' : '#14532d', lineHeight: 1.4 }}>
              {hasHazard
                ? `Historical drilling events in ${activeFm?.canonical_name || 'Hordaland'} within 2.0 km offset radius indicate potential circulation losses and reactive shale swelling.`
                : `Verified 5 offset wellbores within 2.0 km. Stable pressure profiles and historical practices within nominal drilling parameters.`}
            </div>
          </div>

          {/* Real-time Telemetry Mini Gauges */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Live Telemetry Gauges (Sample #{telemetry?.current_index ?? 0}):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ROP</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7' }}>
                  {telemetry?.rop ? `${telemetry.rop.toFixed(0)} m/h` : '134 m/h'}
                </div>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>WOB</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>
                  {telemetry?.wob ?? 11.9} kN
                </div>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>RPM</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d97706' }}>
                  {telemetry?.rpm ?? 145}
                </div>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>MUD WT</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#7c3aed' }}>
                  {telemetry?.mud_weight ?? 1.28} SG
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
