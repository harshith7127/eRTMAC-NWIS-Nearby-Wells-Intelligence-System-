import React, { useState, useEffect } from 'react';
import { useSelectionStore, WORKSPACES } from '../../store/useSelectionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ProvenanceChip } from '../common/ProvenanceChip';
import { SiteAnalysisModal } from '../analysis/SiteAnalysisModal';
import type { CanonicalAppMode } from '../../types';
import {
  Map,
  Layers,
  Compass,
  Sun,
  Moon,
  Search,
  ExternalLink,
  ShieldCheck,
  GitCompare,
  FileText,
  MoreVertical,
  Maximize2,
  Minimize2,
  LogOut,
  Activity,
  Clock
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    selectedWorkspace,
    setSelectedWorkspace,
    activeMode,
    setActiveMode,
    mode,
    setMode,
    theme,
    toggleTheme,
    selectedWell,
    setSelectedWell,
    isDashboardDrawerOpen,
    toggleDashboardDrawer,
    isCanvasMaximized,
    toggleCanvasMaximized
  } = useSelectionStore();

  const { user, logout } = useAuthStore();
  const [isSiteAnalysisModalOpen, setIsSiteAnalysisModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentWs = WORKSPACES[selectedWorkspace] || WORKSPACES['volve'];

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search')?.toString().trim();
    if (query) {
      setSelectedWell(query);
    }
  };

  const modes = [
    { id: 'MAP', name: 'Map', icon: Map },
    { id: 'SUBSURFACE', name: '3D', icon: Layers },
    { id: 'NEAR_WELL', name: 'Near-Well', icon: Compass },
    { id: 'COMPARISON', name: 'Compare', icon: GitCompare },
    { id: 'ANALYSIS', name: 'Analysis', icon: ShieldCheck },
    { id: 'REPORT', name: 'Report', icon: FileText }
  ] as const;

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 200,
        flexShrink: 0,
        gap: '6px',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}
    >
      {/* 1. Left Group: Dashboard Drawer Trigger & Brand & Workspace */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* 3-Dots Button */}
        <button
          type="button"
          onClick={toggleDashboardDrawer}
          title="Open Dashboard & Features Toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isDashboardDrawerOpen ? 'var(--color-brand-primary)' : 'var(--bg-surface-sunken)',
            color: isDashboardDrawerOpen ? '#ffffff' : 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all var(--transition-fast)'
          }}
        >
          <MoreVertical size={16} />
        </button>

        {/* Brand Logo & Compact Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              flexShrink: 0
            }}
          >
            OIL
          </div>
          <h1 style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            Oil India Intelligence
          </h1>
        </div>

        {/* Workspace Dropdown & Provenance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <select
            id="ws-select"
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            style={{
              padding: '2px 4px',
              fontSize: '11px',
              fontWeight: 600,
              maxWidth: '96px',
              height: '26px'
            }}
          >
            <option value="volve">Volve Field</option>
            <option value="demo-onshore">Demo Onshore</option>
          </select>
          <ProvenanceChip origin={currentWs.defaultOrigin} size="sm" />
        </div>
      </div>

      {/* 2. Responsive Search Input */}
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', position: 'relative', flexShrink: 1, minWidth: '80px', maxWidth: '115px' }}>
        <Search size={12} style={{ position: 'absolute', left: '7px', color: 'var(--text-muted)' }} />
        <input
          name="search"
          type="text"
          placeholder="Search well..."
          defaultValue={selectedWell || ''}
          style={{
            paddingLeft: '23px',
            width: '100%',
            fontSize: '11px',
            paddingTop: '3px',
            paddingBottom: '3px',
            height: '26px'
          }}
        />
      </form>

      {/* 3. Mode Switcher Segmented Controls */}
      <div
        role="group"
        aria-label="Visualization Mode"
        style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface-sunken)',
          padding: '2px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-medium)',
          gap: '2px',
          flexShrink: 0
        }}
      >
        {modes.map(({ id, name, icon: Icon }) => {
          const currentMode = (activeMode || mode || 'MAP').toString().toUpperCase().replace('-', '_');
          const isMatch =
            currentMode === id ||
            (id === 'MAP' && currentMode === 'SURFACE') ||
            (id === 'NEAR_WELL' && currentMode === 'NEARWELL');

          return (
            <button
              key={id}
              type="button"
              title={`Switch to ${name} mode`}
              onClick={() => {
                if (setActiveMode) setActiveMode(id as CanonicalAppMode);
                else if (setMode) setMode(id as any);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: isMatch ? 700 : 500,
                backgroundColor: isMatch ? 'var(--color-brand-primary)' : 'transparent',
                color: isMatch ? '#ffffff' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                height: '24px'
              }}
            >
              <Icon size={12} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Right Tools & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {/* Maximize / Restore Canvas Button (Icon + Tooltip) */}
        <button
          type="button"
          onClick={() => {
            toggleCanvasMaximized();
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
            setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
          }}
          title={isCanvasMaximized ? 'Restore sidebars and dock' : 'Maximize Canvas (Full view)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${isCanvasMaximized ? '#0284c7' : 'var(--border-medium)'}`,
            backgroundColor: isCanvasMaximized ? '#e0f2fe' : 'var(--bg-surface-sunken)',
            color: isCanvasMaximized ? '#0284c7' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          {isCanvasMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Live Operational Rig Date & Time Display */}
        <div
          id="header-live-clock"
          title={`Synchronized Field Time: ${currentTime.toISOString()}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: 'var(--bg-surface-sunken)',
            padding: '2px 5px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-medium)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            height: '24px'
          }}
        >
          <Clock size={11} color="#0284c7" />
          <span
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}
          >
            {currentTime.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </span>
          <span style={{ color: 'var(--border-strong)', opacity: 0.5 }}>•</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {currentTime.toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short'
            })}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          style={{
            width: '24px',
            height: '24px',
            padding: 0,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-surface-sunken)'
          }}
        >
          {theme === 'light' ? <Moon size={12} /> : <Sun size={12} />}
        </button>

        {/* Site Analysis & Report Trigger Button */}
        <button
          type="button"
          onClick={() => setIsSiteAnalysisModalOpen(true)}
          title="Site Analysis & Report"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 5px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-medium)',
            backgroundColor: 'var(--bg-surface-sunken)',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            height: '24px',
            whiteSpace: 'nowrap'
          }}
        >
          <Activity size={11} color="#0284c7" />
          <span>Site Analysis</span>
        </button>

        {/* Legacy Archive Link */}
        <a
          href="/legacy/index.html"
          target="_blank"
          rel="noreferrer"
          title="Open archived legacy prototype"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            padding: '3px 5px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            height: '26px',
            boxSizing: 'border-box'
          }}
        >
          <span>Legacy</span>
          <ExternalLink size={9} />
        </a>

        {/* Authenticated Officer Clearance & Secure Logout */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(15, 59, 96, 0.08)',
              border: '1px solid rgba(15, 59, 96, 0.2)',
              padding: '1px 5px',
              borderRadius: 'var(--radius-sm)',
              height: '26px',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold'
              }}
              title={`${user.fullName} • ${user.role} [${user.clearanceLevel}]`}
            >
              OA
            </div>
            <span
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}
              title={user.username}
            >
              {user.username}
            </span>
            <button
              type="button"
              id="header-logout-btn"
              onClick={logout}
              title="Sign out of secured session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '2px 4px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: '2px'
              }}
            >
              <LogOut size={10} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Site Analysis & Report Modal */}
      {isSiteAnalysisModalOpen && (
        <SiteAnalysisModal
          isOpen={isSiteAnalysisModalOpen}
          onClose={() => setIsSiteAnalysisModalOpen(false)}
        />
      )}
    </header>
  );
};
