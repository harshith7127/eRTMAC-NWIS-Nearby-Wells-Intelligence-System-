import React from 'react';
import { useSelectionStore, normalizeMode } from '../../store/useSelectionStore';
import {
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Layers,
  FileText,
  Activity
} from 'lucide-react';

interface CenterCanvasProps {
  children?: React.ReactNode;
}

export const CenterCanvas: React.FC<CenterCanvasProps> = ({ children }) => {
  const {
    mode,
    activeMode,
    camera,
    setCamera,
    isCanvasMaximized,
    toggleCanvasMaximized,
    showLayerManager,
    toggleLayerManager,
    showDetailsPanel,
    toggleDetailsPanel,
    showBottomDock,
    toggleBottomDock
  } = useSelectionStore();
  const currentMode = normalizeMode(activeMode || mode);
  const isSpatialMode = currentMode === 'MAP' || currentMode === 'SUBSURFACE' || currentMode === 'NEAR_WELL';

  const handleZoom = (delta: number) => {
    setCamera({ zoom: Math.max(1, Math.min(20, camera.zoom + delta)) });
  };

  const handleReset = () => {
    setCamera({ zoom: 13, pitch: 0, bearing: 0 });
  };

  return (
    <main
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Active Mode Visualization Surface */}
      <div id="visualization-viewport" style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        {children}

        {/* Floating Mode Indicator Badge (Only shown in 2D Map) */}
        {currentMode === 'MAP' && (
          <div
            style={{
              position: 'absolute',
              top: 'var(--space-3)',
              left: 'var(--space-3)',
              backgroundColor: 'var(--bg-surface)',
              opacity: 0.95,
              backdropFilter: 'blur(4px)',
              border: '1px solid var(--border-medium)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-brand-primary)',
              zIndex: 10
            }}
          >
            <Compass size={14} />
            <span>Active Viewport: {currentMode}</span>
          </div>
        )}

        {/* Floating Canvas Size & Panel Controls (Spatial 2D/3D Modes) */}
        {isSpatialMode && (
          <div
            style={{
              position: 'absolute',
              top: 'var(--space-3)',
              right: currentMode === 'MAP' ? '56px' : 'var(--space-3)',
              backgroundColor: 'var(--bg-surface)',
              opacity: 0.97,
              backdropFilter: 'blur(6px)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '3px 6px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 20
            }}
          >
            {/* Primary Enlarge / Maximize Map Button */}
            <button
              type="button"
              onClick={() => {
                toggleCanvasMaximized();
                requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
                setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
              }}
              title={isCanvasMaximized ? 'Restore normal panel layout' : 'Maximize Canvas (Full view)'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isCanvasMaximized ? '#0284c7' : 'var(--bg-surface-raised)',
                color: isCanvasMaximized ? '#ffffff' : 'var(--text-primary)',
                border: `1px solid ${isCanvasMaximized ? '#0284c7' : 'var(--border-medium)'}`,
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {isCanvasMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isCanvasMaximized ? 'Restore' : 'Maximize'}</span>
            </button>

            {/* Individual Panel Visibility Toggles when not fully maximized */}
            {!isCanvasMaximized && (
              <>
                <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} />
                
                <button
                  type="button"
                  onClick={() => {
                    toggleLayerManager();
                    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
                  }}
                  title={showLayerManager ? 'Hide Left Layer Panel' : 'Show Left Layer Panel'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: showLayerManager ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                    color: showLayerManager ? '#0284c7' : 'var(--text-secondary)',
                    border: `1px solid ${showLayerManager ? 'rgba(2, 132, 199, 0.3)' : 'var(--border-subtle)'}`,
                    fontSize: '11px',
                    fontWeight: showLayerManager ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  <Layers size={12} />
                  <span>Layers</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleDetailsPanel();
                    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
                  }}
                  title={showDetailsPanel ? 'Hide Right Details Panel' : 'Show Right Details Panel'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: showDetailsPanel ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                    color: showDetailsPanel ? '#0284c7' : 'var(--text-secondary)',
                    border: `1px solid ${showDetailsPanel ? 'rgba(2, 132, 199, 0.3)' : 'var(--border-subtle)'}`,
                    fontSize: '11px',
                    fontWeight: showDetailsPanel ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={12} />
                  <span>Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleBottomDock();
                    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
                  }}
                  title={showBottomDock ? 'Hide Bottom Well-Log Dock' : 'Show Bottom Well-Log Dock'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: showBottomDock ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                    color: showBottomDock ? '#0284c7' : 'var(--text-secondary)',
                    border: `1px solid ${showBottomDock ? 'rgba(2, 132, 199, 0.3)' : 'var(--border-subtle)'}`,
                    fontSize: '11px',
                    fontWeight: showBottomDock ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  <Activity size={12} />
                  <span>Logs Dock</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* 2D Map GIS Controls & Scale Bar */}
        {currentMode === 'MAP' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 'var(--space-3)',
                right: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '4px',
                boxShadow: 'var(--shadow-md)',
                zIndex: 10
              }}
            >
              <button
                type="button"
                onClick={() => handleZoom(1)}
                title="Zoom in (+)"
                style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-1)}
                title="Zoom out (-)"
                style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={16} />
              </button>
              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '2px 0' }} />
              <button
                type="button"
                onClick={handleReset}
                title="Reset camera (R)"
                style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setCamera({ zoom: 14, pitch: 45 })}
                title="Fit to active selection (F)"
                style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Maximize2 size={15} />
              </button>
              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '2px 0' }} />
              {/* North Arrow */}
              <div
                title="North Indicator"
                style={{
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `rotate(${-camera.bearing}deg)`,
                  transition: 'transform var(--transition-fast)'
                }}
              >
                <Navigation size={16} color="#dc2626" />
              </div>
            </div>

            {/* Floating Scale Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 'var(--space-3)',
                left: 'var(--space-3)',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid var(--border-medium)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 10
              }}
            >
              <div style={{ width: '40px', height: '3px', backgroundColor: 'var(--text-primary)' }} />
              <span>500 m</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
};
