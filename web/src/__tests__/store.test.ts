import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore, normalizeMode } from '../store/useSelectionStore';

describe('Zustand Single Selection Store (Rule R6 & Phase 1)', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      selectedWorkspace: 'volve',
      workspaceId: 'volve',
      selectedWell: '15/9-F-12',
      activeWellId: '15/9-F-12',
      selectedFormation: null,
      selectedSurface: null,
      selectedFault: null,
      selectedReservoir: null,
      selectedDepth: 1842.5,
      currentDepth: 1842.5,
      selectedEvent: null,
      selectedLocation: null,
      proposedLocation: null,
      activeMode: 'MAP',
      mode: 'MAP'
    });
  });

  it('initializes with default workspace and well', () => {
    const state = useSelectionStore.getState();
    expect(state.selectedWorkspace).toBe('volve');
    expect(state.selectedWell).toBe('15/9-F-12');
    expect(state.activeMode).toBe('MAP');
    expect(state.selectedDepth).toBe(1842.5);
  });

  it('supports all 6 canonical application modes', () => {
    const modes = ['MAP', 'SUBSURFACE', 'NEAR_WELL', 'COMPARISON', 'ANALYSIS', 'REPORT'] as const;
    const store = useSelectionStore.getState();

    modes.forEach((m) => {
      store.setActiveMode(m);
      expect(useSelectionStore.getState().activeMode).toBe(m);
      expect(useSelectionStore.getState().mode).toBe(m);
    });
  });

  it('normalizes legacy mode names seamlessly', () => {
    expect(normalizeMode('surface')).toBe('MAP');
    expect(normalizeMode('subsurface')).toBe('SUBSURFACE');
    expect(normalizeMode('near-well')).toBe('NEAR_WELL');
    expect(normalizeMode('nearwell')).toBe('NEAR_WELL');
    expect(normalizeMode('comparison')).toBe('COMPARISON');
    expect(normalizeMode('analysis')).toBe('ANALYSIS');
    expect(normalizeMode('report')).toBe('REPORT');
    expect(normalizeMode(null)).toBe('MAP');

    useSelectionStore.getState().setActiveMode('near-well' as any);
    expect(useSelectionStore.getState().activeMode).toBe('NEAR_WELL');
  });

  it('updates selectedFormation and selectedSurface', () => {
    const store = useSelectionStore.getState();
    store.setSelectedFormation('Hugin Fm.');
    expect(useSelectionStore.getState().selectedFormation).toBe('Hugin Fm.');

    store.setSelectedSurface('top_hugin');
    expect(useSelectionStore.getState().selectedSurface).toBe('top_hugin');
  });

  it('updates selectedFault and selectedReservoir', () => {
    const store = useSelectionStore.getState();
    store.setSelectedFault('F-1');
    expect(useSelectionStore.getState().selectedFault).toBe('F-1');

    store.setSelectedReservoir('Hugin_Reservoir');
    expect(useSelectionStore.getState().selectedReservoir).toBe('Hugin_Reservoir');
  });

  it('updates selectedDepth and synchronizes currentDepth', () => {
    const store = useSelectionStore.getState();
    store.setSelectedDepth(2540.0);
    expect(useSelectionStore.getState().selectedDepth).toBe(2540.0);
    expect(useSelectionStore.getState().currentDepth).toBe(2540.0);
  });

  it('updates selectedLocation and proposedLocation', () => {
    const store = useSelectionStore.getState();
    store.setSelectedLocation({ lat: 58.4416, lon: 1.8875 });
    expect(useSelectionStore.getState().selectedLocation).toEqual({ lat: 58.4416, lon: 1.8875 });
    expect(useSelectionStore.getState().proposedLocation).toEqual({ lat: 58.4416, lon: 1.8875 });
  });

  it('maintains backward compatibility with legacy aliases', () => {
    const store = useSelectionStore.getState();
    store.setWorkspace('demo-onshore');
    expect(useSelectionStore.getState().selectedWorkspace).toBe('demo-onshore');
    expect(useSelectionStore.getState().workspaceId).toBe('demo-onshore');

    store.setActiveWell('15/9-F-15');
    expect(useSelectionStore.getState().selectedWell).toBe('15/9-F-15');
    expect(useSelectionStore.getState().activeWellId).toBe('15/9-F-15');

    store.setCurrentDepth(3000.5);
    expect(useSelectionStore.getState().selectedDepth).toBe(3000.5);
  });

  it('manages dashboard drawer and canvas enlargement controls', () => {
    const store = useSelectionStore.getState();

    // Initial drawer closed
    expect(store.isDashboardDrawerOpen).toBe(false);
    store.toggleDashboardDrawer();
    expect(useSelectionStore.getState().isDashboardDrawerOpen).toBe(true);
    store.setDashboardDrawerOpen(false);
    expect(useSelectionStore.getState().isDashboardDrawerOpen).toBe(false);

    // Initial canvas maximized false
    expect(store.isCanvasMaximized).toBe(false);
    store.toggleCanvasMaximized();
    expect(useSelectionStore.getState().isCanvasMaximized).toBe(true);
    store.setCanvasMaximized(false);
    expect(useSelectionStore.getState().isCanvasMaximized).toBe(false);

    // Individual panel toggles to increase 2D/3D map size
    expect(store.showLayerManager).toBe(true);
    expect(store.showDetailsPanel).toBe(true);
    expect(store.showBottomDock).toBe(true);

    store.toggleLayerManager();
    expect(useSelectionStore.getState().showLayerManager).toBe(false);

    store.toggleDetailsPanel();
    expect(useSelectionStore.getState().showDetailsPanel).toBe(false);

    store.toggleBottomDock();
    expect(useSelectionStore.getState().showBottomDock).toBe(false);
  });
});
