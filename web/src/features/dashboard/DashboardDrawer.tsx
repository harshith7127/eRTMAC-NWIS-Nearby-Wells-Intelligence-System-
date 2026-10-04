import React from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import {
  LayoutDashboard,
  Compass,
  ShieldCheck,
  Activity,
  List,
  Layers,
  Map,
  Box,
  GitCompare,
  Crosshair,
  FileText,
  X,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import type { CanonicalAppMode } from '../../types';

export const DashboardDrawer: React.FC = () => {
  const {
    isDashboardDrawerOpen,
    setDashboardDrawerOpen,
    setActiveMode,
    setDashboardTab,
    setCanvasMaximized
  } = useSelectionStore();

  if (!isDashboardDrawerOpen) return null;

  const handleSelectFeature = (
    mode: CanonicalAppMode,
    tab?: 'overview' | 'fleet' | 'stratigraphy' | 'lookahead' | 'telemetry',
    maximizeMap: boolean = false
  ) => {
    if (tab) {
      setDashboardTab(tab);
    }
    setActiveMode(mode);
    setCanvasMaximized(maximizeMap);
    setDashboardDrawerOpen(false);
  };

  const menuSections = [
    {
      title: 'OPERATIONS & DASHBOARDS',
      items: [
        {
          label: 'Main Dashboard (Combined Overview)',
          icon: LayoutDashboard,
          isHighlight: true,
          action: () => handleSelectFeature('DASHBOARD', 'overview', false)
        },
        {
          label: 'Well Fleet & Spatial Tracking',
          icon: List,
          action: () => handleSelectFeature('DASHBOARD', 'fleet', false)
        },
        {
          label: 'Geological Formations & Tops',
          icon: Compass,
          action: () => handleSelectFeature('DASHBOARD', 'stratigraphy', false)
        },
        {
          label: 'Look-Ahead & Hazard Assessment',
          icon: ShieldCheck,
          action: () => handleSelectFeature('DASHBOARD', 'lookahead', false)
        },
        {
          label: 'Drilling Telemetry & Sensors',
          icon: Activity,
          action: () => handleSelectFeature('DASHBOARD', 'telemetry', false)
        }
      ]
    },
    {
      title: '3D & SPATIAL WORKSPACES',
      items: [
        {
          label: '3D Subsurface Geological Viewer',
          icon: Layers,
          action: () => handleSelectFeature('SUBSURFACE', undefined, true)
        },
        {
          label: '2D Surface & Exploration Map',
          icon: Map,
          action: () => handleSelectFeature('MAP', undefined, true)
        },
        {
          label: 'Near-Well Geological Cross-Section',
          icon: Box,
          action: () => handleSelectFeature('NEAR_WELL', undefined, true)
        }
      ]
    },
    {
      title: 'ANALYTICS & REPORTS',
      items: [
        {
          label: 'Well Comparison & Correlation',
          icon: GitCompare,
          action: () => handleSelectFeature('COMPARISON', undefined, false)
        },
        {
          label: 'Site Clearance & Geohazards',
          icon: Crosshair,
          action: () => handleSelectFeature('ANALYSIS', undefined, false)
        },
        {
          label: 'Regulatory Operations Report',
          icon: FileText,
          action: () => handleSelectFeature('REPORT', undefined, false)
        }
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setDashboardDrawerOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 400,
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Slide-over Menu from Left (Clean, minimal, no weird boxes!) */}
      <aside
        aria-label="Features Menu"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'clamp(280px, 24vw, 340px)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.2)',
          zIndex: 410,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-medium)',
          animation: 'slideInLeft 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-brand-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MoreVertical size={16} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Features &amp; Workspaces
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDashboardDrawerOpen(false)}
            title="Close menu"
            style={{
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature List — Clean flat items with hover highlight */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 10px 20px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {menuSections.map((sec) => (
            <div key={sec.title}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.07em',
                  color: 'var(--text-muted)',
                  padding: '4px 10px 6px 10px',
                  textTransform: 'uppercase'
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        backgroundColor: item.isHighlight ? 'var(--bg-surface-raised)' : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-raised)';
                        e.currentTarget.style.color = 'var(--color-brand-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = item.isHighlight ? 'var(--bg-surface-raised)' : 'transparent';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <Icon
                          size={15}
                          style={{
                            color: item.isHighlight ? 'var(--color-brand-primary)' : 'var(--text-secondary)',
                            flexShrink: 0
                          }}
                        />
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: item.isHighlight ? 'bold' : '500',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.label}
                        </span>
                      </div>

                      <ChevronRight
                        size={13}
                        style={{
                          color: 'var(--text-muted)',
                          opacity: 0.6,
                          flexShrink: 0,
                          marginLeft: '6px'
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
export default DashboardDrawer;
