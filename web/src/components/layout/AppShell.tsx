import React from 'react';
import { DataBanner } from '../common/DataBanner';
import { Header } from './Header';
import { LayerManager } from './LayerManager';
import { DetailsPanel } from './DetailsPanel';
import { CenterCanvas } from './CenterCanvas';
import { BottomDock } from './BottomDock';
import { StatusBar } from './StatusBar';
import { useSelectionStore, normalizeMode } from '../../store/useSelectionStore';
import { MapViewer } from '../map/MapViewer';
import { Subsurface3DViewer } from '../subsurface/Subsurface3DViewer';
import { NearWellViewer } from '../nearwell/NearWellViewer';
import { WellComparisonFeature } from '../../features/wells/WellComparisonFeature';
import { SiteAnalysisFeature } from '../../features/analysis/SiteAnalysisFeature';
import { ReportFeature } from '../../features/reports/ReportFeature';
import { DashboardFeature } from '../../features/dashboard/DashboardFeature';

import { DashboardDrawer } from '../../features/dashboard/DashboardDrawer';

export const AppShell: React.FC = () => {
  const {
    mode,
    activeMode,
    isCanvasMaximized,
    showLayerManager,
    showDetailsPanel,
    showBottomDock
  } = useSelectionStore();
  const currentMode = normalizeMode(activeMode || mode);

  // Modes that use the 3-panel spatial GIS layout (Layer Manager + Canvas + Details Panel + Bottom Dock)
  const isSpatialMode = currentMode === 'MAP' || currentMode === 'SUBSURFACE' || currentMode === 'NEAR_WELL';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 1. Persistent Provenance / eRTMAC Status Banner (Rule R2) */}
      <DataBanner />

      {/* 2. Top Header Navigation */}
      <Header />

      {/* 3. Center Workspace Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Left: Collapsible Layer Manager (shown in spatial modes when not maximized) */}
        {isSpatialMode && !isCanvasMaximized && showLayerManager && <LayerManager />}

        {/* Center: Active Mode Viewport Canvas */}
        <CenterCanvas>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: currentMode === 'SUBSURFACE' ? '#0f172a' : 'var(--bg-app)',
              color: currentMode === 'SUBSURFACE' ? '#e2e8f0' : 'var(--text-primary)',
              transition: 'background-color var(--transition-normal)',
              overflow: 'hidden'
            }}
          >
            {currentMode === 'DASHBOARD' && <DashboardFeature />}

            {(currentMode === 'MAP' || mode === 'surface') && <MapViewer />}

            {mode === 'subsurface' && <Subsurface3DViewer />}
            {currentMode === 'SUBSURFACE' && mode !== 'subsurface' && <Subsurface3DViewer />}

            {mode === 'near-well' && <NearWellViewer />}
            {currentMode === 'NEAR_WELL' && mode !== 'near-well' && <NearWellViewer />}

            {currentMode === 'COMPARISON' && <WellComparisonFeature />}

            {currentMode === 'ANALYSIS' && <SiteAnalysisFeature />}

            {currentMode === 'REPORT' && <ReportFeature />}
          </div>
        </CenterCanvas>

        {/* Right: Well & Stratigraphy Details Panel (shown in spatial modes when not maximized) */}
        {isSpatialMode && !isCanvasMaximized && showDetailsPanel && <DetailsPanel />}
      </div>

      {/* 4. Linked Depth Ruler & Well-Log Dock (shown in spatial modes when not maximized) */}
      {isSpatialMode && !isCanvasMaximized && showBottomDock && <BottomDock />}

      {/* 5. Bottom System Status Bar */}
      <StatusBar />

      {/* 6. Slide-Over Dashboard & Features Toolbar from 3-dots on top left */}
      <DashboardDrawer />
    </div>
  );
};
