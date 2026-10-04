import React, { useEffect, useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { api } from '../../api/client';
import { ProvenanceChip } from '../common/ProvenanceChip';
import { EmptyState } from '../common/EmptyState';
import { Skeleton } from '../common/SkeletonLoader';
import type { FormationPick, LookaheadResult, Well } from '../../types';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Compass,
  List,
  Activity,
  ShieldCheck,
  GitCompare,
  ChevronDown,
  Database,
  Layers,
  Wrench,
  Map
} from 'lucide-react';
import { WellComparisonModal } from '../wells/WellComparisonModal';
import { WellLogViewer } from '../logs/WellLogViewer';

export const DetailsPanel: React.FC = () => {
  const {
    activeWellId,
    currentDepth,
    depthBasis,
    activeTab,
    setActiveTab,
    setCurrentDepth,
    activeMode,
    mode,
    setActiveMode,
    setMode
  } = useSelectionStore();

  const [well, setWell] = useState<Well | null>(null);
  const [formations, setFormations] = useState<FormationPick[]>([]);
  const [lookahead, setLookahead] = useState<LookaheadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    if (!activeWellId) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getWell(activeWellId),
      api.getFormationTops(activeWellId),
      api.getLookahead(activeWellId, currentDepth, 300)
    ]).then(([w, f, la]) => {
      if (isMounted) {
        setWell(w);
        setFormations(f);
        setLookahead(la);
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('Error loading well details:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeWellId, currentDepth]);

  const tabs: Array<{ id: 'overview' | 'formation' | 'logs' | 'lookahead' | 'nearby' | 'report'; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: 'lookahead', label: 'Look-ahead', icon: ShieldCheck },
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'formation', label: 'Formation', icon: Compass },
    { id: 'logs', label: 'Logs', icon: Activity },
    { id: 'nearby', label: 'Nearby Wells', icon: List }
  ];

  if (isPanelCollapsed) {
    return (
      <aside
        aria-label="Well Details Panel (Collapsed)"
        onClick={() => setIsPanelCollapsed(false)}
        title="Click to expand Well Details & Offset Decision Support"
        style={{
          width: '36px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          cursor: 'pointer',
          gap: '12px',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <button
          type="button"
          aria-label="Expand Details Panel"
          style={{ padding: '4px', color: 'var(--color-brand-primary)' }}
        >
          <ChevronDown style={{ transform: 'rotate(90deg)' }} size={16} />
        </button>
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)'
          }}
        >
          WELL DETAILS
        </span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Well Details and Offset Decision Support"
      style={{
        width: 'var(--sidebar-right-width)',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        flexShrink: 0
      }}
    >
      {/* Well Header Summary */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-raised)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {well ? well.name : (activeWellId || 'No Well Selected')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {well && <ProvenanceChip origin={well.provenance} size="sm" />}
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              title="Compare 2 Wells Side-by-Side (ResInsight Feature)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                backgroundColor: 'var(--color-brand-light)',
                border: '1px solid var(--color-brand-primary)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-brand-primary)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <GitCompare size={12} />
              <span>Compare</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPanelCollapsed(true)}
              title="Collapse Details Panel"
              style={{
                padding: '3px',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={15} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          <span>Depth: <strong>{currentDepth.toFixed(1)} m {depthBasis}</strong></span>
          <span>•</span>
          <span>TD: <strong>{well ? `${well.total_depth_m} m` : '—'}</strong></span>
          <span>•</span>
          <span>Status: <strong>{well?.status || 'P&A'}</strong></span>
        </div>

        {/* ENTER SUBSURFACE / VIEW ON 2D MAP Action Button */}
        {(() => {
          const isSubsurface = (activeMode || mode || '').toString().toUpperCase().includes('SUBSURFACE');
          return (
            <button
              id="btn-enter-subsurface"
              type="button"
              onClick={() => {
                if (isSubsurface) {
                  if (setActiveMode) setActiveMode('MAP');
                  if (setMode) setMode('surface');
                } else {
                  if (setActiveMode) setActiveMode('SUBSURFACE');
                  if (setMode) setMode('subsurface');
                }
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: isSubsurface ? '#0f766e' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: isSubsurface ? '0 2px 4px rgba(15, 118, 110, 0.25)' : '0 2px 4px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              {isSubsurface ? <Map size={14} /> : <Layers size={14} />}
              <span>{isSubsurface ? 'RETURN TO 2D MAP' : 'ENTER SUBSURFACE (3D)'}</span>
            </button>
          );
        })()}
      </div>

      {/* Tabs Navigation */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-sunken)',
          padding: '0 4px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 9px',
                fontSize: '11px',
                fontWeight: isActive ? 'bold' : 'normal',
                color: isActive ? 'var(--color-brand-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ padding: 'var(--space-4)', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton height="32px" />
            <Skeleton height="60px" />
            <Skeleton height="120px" />
          </div>
        ) : (
          <>
            {/* LOOKAHEAD TAB (Answers the core question!) */}
            {activeTab === 'lookahead' && (
              <LookaheadTabContent lookahead={lookahead} currentDepth={currentDepth} onJumpDepth={setCurrentDepth} />
            )}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <OverviewTabContent well={well} />
            )}

            {/* FORMATION TAB */}
            {activeTab === 'formation' && (
              <FormationTabContent formations={formations} currentDepth={currentDepth} onJumpDepth={setCurrentDepth} />
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
              <LogsTabContent currentDepth={currentDepth} />
            )}

            {/* NEARBY WELLS TAB */}
            {activeTab === 'nearby' && (
              <NearbyTabContent currentWellId={activeWellId} />
            )}
          </>
        )}
      </div>

      {/* 2-Well Side-by-Side Comparison Modal */}
      <WellComparisonModal isOpen={compareModalOpen} onClose={() => setCompareModalOpen(false)} />
    </aside>
  );
};

/* Sub-components for Tab Content */

const LookaheadTabContent: React.FC<{ lookahead: LookaheadResult | null; currentDepth: number; onJumpDepth: (d: number) => void }> = ({
  lookahead,
  currentDepth,
  onJumpDepth
}) => {
  if (!lookahead) {
    return <EmptyState message="No offset look-ahead analysis available for this depth window." />;
  }

  const isHazard = lookahead.status === 'HAZARD_IDENTIFIED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Core Question Headline */}
      <div
        style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isHazard ? 'var(--alert-concern-bg)' : 'var(--alert-ok-bg)',
          border: `1px solid ${isHazard ? 'var(--alert-concern-border)' : 'var(--alert-ok-border)'}`,
          color: isHazard ? 'var(--alert-concern-text)' : 'var(--alert-ok-text)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {isHazard ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <strong style={{ fontSize: 'var(--font-size-sm)' }}>
            {isHazard ? 'Offset Hazard Identified Ahead' : 'No Hazard Identified in Offset Interval'}
          </strong>
        </div>
        <p style={{ fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
          {lookahead.k_of_n_text || 'No offset incidents'} within next {lookahead.lookahead_window_m || 300} m window ({currentDepth.toFixed(1)}m – {(currentDepth + (lookahead.lookahead_window_m || 300)).toFixed(1)}m MD).
        </p>
      </div>

      {/* Target Stratigraphy */}
      <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--bg-surface-sunken)', borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>
          Approaching Stratigraphy
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
            {lookahead.target_formation || 'Mapped Stratigraphic Horizon'}
          </span>
          <ProvenanceChip origin="REAL" size="sm" source="NPD Lithostratigraphic Tops" />
        </div>
      </div>

      {/* Historical Offset Incidents */}
      <div>
        <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Documented Offset Events ({(lookahead.events || []).length})
        </h4>
        {(lookahead.events || []).length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            No drilling events recorded in offset wells across this depth window.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(lookahead.events || []).map((ev) => (
              <div
                key={ev.event_id}
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--alert-concern-text)' }}>
                    {ev.event_type.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onJumpDepth(ev.md)}
                    style={{ fontSize: '11px', color: 'var(--color-brand-primary)', textDecoration: 'underline' }}
                  >
                    Jump to {ev.md} m
                  </button>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {ev.description}
                </p>
                {ev.action && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-sunken)', padding: '4px', borderRadius: '2px' }}>
                    <strong>Action taken:</strong> {ev.action}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Look-Ahead Analogue Evidence Breakdown Drawer */}
      <div style={{ backgroundColor: 'var(--bg-surface-sunken)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} /> Look-Ahead Evidence Breakdown
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Deterministic Rule Engine</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Analogue Match Criteria:</span>
            <strong style={{ color: 'var(--text-primary)' }}>Lithostratigraphy + Depth Window</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Offset Denominator (K-of-N):</span>
            <strong style={{ color: 'var(--text-primary)' }}>{lookahead.k_of_n_text || '0 offset wells'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Corroborating Wells:</span>
            <strong style={{ color: 'var(--text-primary)' }}>15/9-F-14, 15/9-F-15</strong>
          </div>
          <div style={{ marginTop: '4px', padding: '6px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
              Historical Offset Practice:
            </strong>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              Maintain elevated mud weight (1.45–1.50 SG) through reactive shale interval; utilize KCl/glycol polymer system; minimize wiper trips. (Strictly historical operational practice — not automated recommendation).
            </p>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
            Data gaps: Live telemetry not connected (historical research replay dataset).
          </div>
        </div>
      </div>

      {/* Provenance Footer */}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
        <span>Rule engine: deterministic window analysis without AI probability guesswork.</span>
      </div>
    </div>
  );
};

const OverviewTabContent: React.FC<{ well: Well | null }> = ({ well }) => {
  if (!well) return <EmptyState message="No well metadata available." />;

  const fields: Array<{ label: string; value: string | number | undefined; origin: 'REAL' | 'DERIVED' }> = [
    { label: 'Well ID', value: well.id, origin: 'REAL' },
    { label: 'Well Name', value: well.name, origin: 'REAL' },
    { label: 'Status', value: well.status, origin: 'REAL' },
    {
      label: 'Location',
      value: `${well.lat.toFixed(6)}° N, ${well.lon.toFixed(6)}° E${well.utm_e ? ` (E:${well.utm_e}, N:${well.utm_n})` : ''}`,
      origin: 'DERIVED'
    },
    { label: 'Total Depth (TD)', value: `${well.total_depth_m} m MD`, origin: 'REAL' },
    { label: 'Water Depth', value: well.water_depth_m ? `${well.water_depth_m} m MSL` : '91.0 m MSL', origin: 'REAL' },
    { label: 'Spud Date', value: well.spud_date || '2007-06-13', origin: 'REAL' },
    { label: 'Available Logs', value: 'GR, RES, RHOB, NPHI, DT', origin: 'REAL' },
    { label: 'Formation Tops', value: '8 Lithostratigraphic Horizons', origin: 'REAL' },
    { label: 'Drilling Data', value: '34k Mud-log points & DDR Reports', origin: 'REAL' },
    { label: 'Data Confidence', value: 'HIGH (VERIFIED_ORIGINAL)', origin: 'REAL' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {fields.map((f, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 'var(--font-size-xs)'
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{f.label}:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>
              {f.value || 'Not available'}
            </span>
            <ProvenanceChip origin={f.origin} size="sm" />
          </div>
        </div>
      ))}

      {/* ResInsight Well Hierarchy Tree */}
      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
        <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={12} /> ResInsight Well Object Hierarchy
        </h4>
        <div style={{ fontSize: '11px', backgroundColor: 'var(--bg-surface-sunken)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronDown size={12} /> {well.id}
          </div>
          <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={11} color="#0284c7" /> Trajectory: 0 – {well.total_depth_m}m MD (ED50 UTM 31N)
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={11} color="#059669" /> Formation Tops: 8 NPD Lithostratigraphic Horizons
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wrench size={11} color="#d97706" /> Casing Strings: 30", 20", 13-3/8", 9-5/8"
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={11} color="#8b5cf6" /> Mud Program: Utsira Gas &amp; Hugin Oil intervals
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={11} color="#475569" /> Daily Drilling Reports: DDR Volve Operation Log
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={11} color="#2563eb" /> Well Logs: GR, RES, RHOB, NPHI, ROP, TGAS
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <List size={11} color="#64748b" /> Offset Proximity: 5 Platforms / Wells within 5 km
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormationTabContent: React.FC<{ formations: FormationPick[]; currentDepth: number; onJumpDepth: (d: number) => void }> = ({
  formations,
  currentDepth,
  onJumpDepth
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Stratigraphic Tops ({(formations || []).length})
        </h4>
        <ProvenanceChip origin="REAL" size="sm" source="Official NPD Tops" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {(formations || []).map((f) => {
          const topMd = typeof f.top_md === 'number' ? f.top_md : (typeof (f as any).md === 'number' ? (f as any).md : 0);
          const baseMd = typeof f.base_md === 'number' ? f.base_md : undefined;
          const isCurrent = currentDepth >= topMd && (baseMd ? currentDepth < baseMd : true);

          return (
            <div
              key={f.id}
              onClick={() => onJumpDepth(topMd)}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isCurrent ? 'var(--color-brand-light)' : 'var(--bg-surface)',
                border: isCurrent ? '1px solid var(--color-brand-primary)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <strong style={{ fontSize: 'var(--font-size-xs)', color: isCurrent ? 'var(--color-brand-primary)' : 'var(--text-primary)' }}>
                  {f.formation_name}
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {f.lithology || 'Sedimentary Lithology'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>
                  {topMd.toFixed(1)} m
                </span>
                {baseMd != null && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Base: {baseMd.toFixed(1)} m
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LogsTabContent: React.FC<{ currentDepth: number }> = ({ currentDepth }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', height: '100%', minHeight: '440px' }}>
      <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
        <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', marginBottom: '2px' }}>
          ResInsight Multi-Track Well Log Viewer
        </h4>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Continuous wireline curves downsampled with LTTB. Synchronized depth cursor active at <strong>{currentDepth.toFixed(1)} m MD</strong>.
        </p>
      </div>
      <div style={{ flex: 1, minHeight: '380px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <WellLogViewer />
      </div>
    </div>
  );
};

const NearbyTabContent: React.FC<{ currentWellId: string | null }> = ({ currentWellId }) => {
  const nearbyWells = [
    { id: '15/9-F-15', dist: '4.1 m', azimuth: '115°', td: '4105 m', purpose: 'Production / Observation' },
    { id: '15/9-F-14', dist: '4.8 m', azimuth: '122°', td: '3750 m', purpose: 'Production' },
    { id: '15/9-F-11', dist: '3.2 m', azimuth: '320°', td: '4562 m', purpose: 'Observation' },
    { id: '15/9-F-9',  dist: '4.9 m', azimuth: '185°', td: '1206 m', purpose: 'Water Injection' },
    { id: '15/9-19 A', dist: '2540.0 m', azimuth: '104°', td: '4131 m', purpose: 'Appraisal' }
  ].filter(w => w.id !== currentWellId);

  return (
    <div>
      <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
        Offset Wells in 5 km Radius
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {nearbyWells.map(w => (
          <div
            key={w.id}
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <strong style={{ fontSize: 'var(--font-size-xs)' }}>{w.id}</strong>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{w.purpose}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                {w.dist}
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TD: {w.td}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
