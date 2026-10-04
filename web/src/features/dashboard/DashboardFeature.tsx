import React, { useState, useEffect } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { api } from '../../api/client';
import { DashboardOverview } from './DashboardOverview';
import { DashboardFleet } from './DashboardFleet';
import { DashboardStratigraphy } from './DashboardStratigraphy';
import { DashboardLookahead } from './DashboardLookahead';
import { DashboardTelemetry } from './DashboardTelemetry';
import {
  LayoutDashboard,
  Compass,
  ShieldCheck,
  Activity,
  List
} from 'lucide-react';
import type { Well, FormationPick, LookaheadResult, CanonicalAppMode } from '../../types';

export const DashboardFeature: React.FC = () => {
  const {
    activeWellId,
    selectedWell,
    setSelectedWell,
    currentDepth,
    setCurrentDepth,
    selectedWorkspace,
    setActiveMode,
    dashboardTab,
    setDashboardTab
  } = useSelectionStore();

  const currentTab = dashboardTab || 'overview';
  const setCurrentTab = (tab: 'overview' | 'fleet' | 'stratigraphy' | 'lookahead' | 'telemetry') => {
    setDashboardTab(tab);
  };
  const [wells, setWells] = useState<Well[]>([]);
  const [well, setWell] = useState<Well | null>(null);
  const [formations, setFormations] = useState<FormationPick[]>([]);
  const [lookahead, setLookahead] = useState<LookaheadResult | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Load all foundational data
  useEffect(() => {
    let isMounted = true;

    api.getWells(selectedWorkspace).then((ws) => {
      if (isMounted) setWells(ws);
    }).catch(console.warn);

    api.getLatestTelemetry().then((tel) => {
      if (isMounted) setTelemetry(tel);
    }).catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspace]);

  // Load active well details, formations, and lookahead
  const effectiveWellId = activeWellId || selectedWell || '15/9-F-12';

  useEffect(() => {
    let isMounted = true;
    if (!effectiveWellId) return;

    Promise.all([
      api.getWell(effectiveWellId),
      api.getFormationTops(effectiveWellId),
      api.getLookahead(effectiveWellId, currentDepth, 300)
    ]).then(([w, f, la]) => {
      if (isMounted) {
        setWell(w);
        setFormations(f);
        setLookahead(la);
      }
    }).catch((err) => {
      console.warn('Dashboard data fetch error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [effectiveWellId, currentDepth]);

  const handleSelectWell = (id: string) => {
    setSelectedWell(id);
  };

  const handleNavigateMode = (targetMode: CanonicalAppMode) => {
    setActiveMode(targetMode);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {/* 1. Dashboard Sub-Header & Feature Tab Switcher */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}
      >
        {/* Left: Active Well Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>WELL:</span>
          <select
            value={effectiveWellId}
            onChange={(e) => handleSelectWell(e.target.value)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: 'var(--bg-surface-raised)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {wells.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id} — {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center / Right: Feature Tab Selector */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface-sunken)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
            gap: '2px',
            overflowX: 'auto',
            maxWidth: '100%'
          }}
        >
          {[
            { id: 'overview', label: 'Combined Overview', icon: LayoutDashboard },
            { id: 'fleet', label: 'Well Fleet & Spatial', icon: List },
            { id: 'stratigraphy', label: 'Geological Formations', icon: Compass },
            { id: 'lookahead', label: 'Look-Ahead & Hazards', icon: ShieldCheck },
            { id: 'telemetry', label: 'Drilling Telemetry', icon: Activity }
          ].map(({ id, label, icon: Icon }) => {
            const isSelected = currentTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => setCurrentTab(id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  backgroundColor: isSelected ? 'var(--color-brand-primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Dashboard Body Container */}
      <div style={{ flex: 1, padding: '20px 24px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        {currentTab === 'overview' && (
          <DashboardOverview
            well={well}
            wells={wells}
            currentDepth={currentDepth}
            formations={formations}
            lookahead={lookahead}
            telemetry={telemetry}
            onSelectTab={setCurrentTab}
            onNavigateMode={handleNavigateMode}
            onSelectWell={handleSelectWell}
          />
        )}

        {currentTab === 'fleet' && (
          <DashboardFleet
            wells={wells}
            activeWellId={effectiveWellId}
            onSelectWell={handleSelectWell}
            onNavigateMode={handleNavigateMode}
          />
        )}

        {currentTab === 'stratigraphy' && (
          <DashboardStratigraphy
            formations={formations}
            activeWellId={effectiveWellId}
            currentDepth={currentDepth}
            onDepthChange={setCurrentDepth}
          />
        )}

        {currentTab === 'lookahead' && (
          <DashboardLookahead
            lookahead={lookahead}
            currentDepth={currentDepth}
          />
        )}

        {currentTab === 'telemetry' && (
          <DashboardTelemetry
            telemetry={telemetry}
            activeWellId={effectiveWellId}
          />
        )}
      </div>
    </div>
  );
};
export default DashboardFeature;
