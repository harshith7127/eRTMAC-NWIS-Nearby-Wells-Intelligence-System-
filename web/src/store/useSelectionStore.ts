/**
 * Single Selection Store with URL Synchronization — SIH-121
 * Enforces Rule R6: Exactly one active selection state read by all components.
 * Backward-compatible single source of truth for both store/ and stores/.
 */

import { create } from 'zustand';
import type {
  AppMode,
  CanonicalAppMode,
  DepthBasis,
  LayerConfig,
  ThemeMode,
  Workspace
} from '../types';

export const WORKSPACES: Record<string, Workspace> = {
  'volve': {
    id: 'volve',
    name: 'Volve Field (Real Public Data)',
    crs: 'WGS84 (EPSG:4326) / ED50 UTM 31N',
    bbox: [1.80, 58.40, 1.98, 58.48],
    center: [1.8875, 58.4416],
    description: 'Equinor Volve North Sea Open Dataset (Production 2008-2016)',
    defaultOrigin: 'REAL',
    bannerText: 'Demonstration data. Real Volve Field (North Sea). Not Oil India data. eRTMAC not connected.'
  },
  'demo-onshore': {
    id: 'demo-onshore',
    name: 'Demo Onshore Block (Synthetic Subsurface)',
    crs: 'WGS84 (EPSG:4326) / UTM Zone 43N',
    bbox: [71.40, 27.40, 71.60, 27.60],
    center: [71.5000, 27.5000],
    description: 'Onshore Exploration Block (Real Surface DEM / Synthetically Seeded Subsurface)',
    defaultOrigin: 'SYNTHETIC',
    bannerText: 'Demonstration data. Synthetic Subsurface Model (Fixed Seed v1.0). Not Oil India data. eRTMAC not connected.'
  }
};

export const DEFAULT_LAYERS: LayerConfig[] = [
  // SURFACE GROUP
  { id: 'surf_terrain', name: 'Terrain / Bathymetry', group: 'SURFACE', visible: true, opacity: 0.85, origin: 'REAL', available: true },
  { id: 'surf_blocks', name: 'Exploration Blocks', group: 'SURFACE', visible: true, opacity: 0.6, origin: 'REAL', available: true },
  { id: 'surf_roads', name: 'Roads & Infrastructure', group: 'SURFACE', visible: false, opacity: 0.7, origin: 'REAL', available: false, unavailableReason: 'No offshore roads in Volve workspace' },
  { id: 'surf_rivers', name: 'Rivers & Water Bodies', group: 'SURFACE', visible: false, opacity: 0.7, origin: 'REAL', available: false, unavailableReason: 'Offshore North Sea marine environment' },
  
  // SUBSURFACE GROUP
  { id: 'sub_formations', name: 'Formation Tops & Surfaces', group: 'SUBSURFACE', visible: true, opacity: 0.75, origin: 'DERIVED', available: true },
  { id: 'sub_faults', name: 'Fault Planes', group: 'SUBSURFACE', visible: true, opacity: 0.8, origin: 'DERIVED', available: true },
  { id: 'sub_reservoir', name: 'Hugin Reservoir Interval', group: 'SUBSURFACE', visible: true, opacity: 0.9, origin: 'REAL', available: true },
  
  // WELLS GROUP
  { id: 'wells_existing', name: 'Existing Wellbores', group: 'WELLS', visible: true, opacity: 1.0, origin: 'REAL', available: true },
  { id: 'wells_trajectories', name: '3D Trajectory Paths', group: 'WELLS', visible: true, opacity: 0.9, origin: 'REAL', available: true },
  { id: 'wells_proposed', name: 'Proposed Well Targets', group: 'WELLS', visible: true, opacity: 1.0, origin: 'SYNTHETIC', available: true },

  // DATA GROUP
  { id: 'data_mudlogs', name: 'Mud Logging Shows', group: 'DATA', visible: true, opacity: 0.8, origin: 'REAL', available: true },
  { id: 'data_wireline', name: 'Wireline Log Curves', group: 'DATA', visible: true, opacity: 0.85, origin: 'REAL', available: true },
  { id: 'data_seismic', name: 'Demo Seismic Slice', group: 'DATA', visible: false, opacity: 0.5, origin: 'DERIVED', available: false, unavailableReason: 'Seismic demo volume offline' }
];

export interface CameraState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export function normalizeMode(rawMode?: string | null): CanonicalAppMode {
  if (!rawMode) return 'MAP';
  const upper = rawMode.toUpperCase().replace('-', '_');
  // Supported modes: 'dashboard', 'surface'/'map', 'subsurface', 'near-well', 'comparison', 'analysis', 'report'
  if (upper === 'DASHBOARD') return 'DASHBOARD';
  if (upper === 'MAP' || upper === 'SURFACE') return 'MAP';
  if (upper === 'SUBSURFACE') return 'SUBSURFACE';
  if (upper === 'NEAR_WELL' || upper === 'NEARWELL') return 'NEAR_WELL';
  if (upper === 'COMPARISON') return 'COMPARISON';
  if (upper === 'ANALYSIS') return 'ANALYSIS';
  if (upper === 'REPORT') return 'REPORT';
  return 'MAP';
}

export interface SelectionState {
  selectedWorkspace: string;
  selectedWell: string | null;
  selectedFormation: string | null;
  selectedSurface: string | null;
  selectedFault: string | null;
  selectedReservoir: string | null;
  selectedDepth: number;
  selectedEvent: string | null;
  selectedLocation: { lat: number; lon: number } | null;
  activeMode: CanonicalAppMode;

  depthBasis: DepthBasis;
  theme: ThemeMode;
  layers: LayerConfig[];
  camera: CameraState;
  activeTab: 'overview' | 'formation' | 'logs' | 'lookahead' | 'nearby' | 'report';

  // Dashboard Drawer & Canvas Sizing Controls
  isDashboardDrawerOpen: boolean;
  dashboardTab: 'overview' | 'fleet' | 'stratigraphy' | 'lookahead' | 'telemetry';
  isCanvasMaximized: boolean;
  showLayerManager: boolean;
  showDetailsPanel: boolean;
  showBottomDock: boolean;

  // Backward Compatible Aliases
  workspaceId: string;
  activeWellId: string | null;
  activeWellboreId: string | null;
  selectedObjectId: string | null;
  selectedObjectType: 'well' | 'formation' | 'fault' | 'reservoir' | 'proposed' | null;
  currentDepth: number;
  mode: AppMode;
  proposedLocation: { lat: number; lon: number } | null;
}

export interface SelectionActions {
  setSelectedWorkspace: (wsId: string) => void;
  setSelectedWell: (wellId: string | null, wellboreId?: string | null) => void;
  setSelectedFormation: (formation: string | null) => void;
  setSelectedSurface: (surfaceId: string | null) => void;
  setSelectedFault: (faultId: string | null) => void;
  setSelectedReservoir: (reservoirId: string | null) => void;
  setSelectedDepth: (depth: number) => void;
  setSelectedEvent: (eventId: string | null) => void;
  setSelectedLocation: (loc: { lat: number; lon: number } | null) => void;
  setActiveMode: (mode: AppMode) => void;

  setDepthBasis: (basis: DepthBasis) => void;
  toggleTheme: () => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  setActiveTab: (tab: 'overview' | 'formation' | 'logs' | 'lookahead' | 'nearby' | 'report') => void;

  // Dashboard Drawer & Sizing Actions
  setDashboardDrawerOpen: (open: boolean) => void;
  toggleDashboardDrawer: () => void;
  setDashboardTab: (tab: 'overview' | 'fleet' | 'stratigraphy' | 'lookahead' | 'telemetry') => void;
  setCanvasMaximized: (max: boolean) => void;
  toggleCanvasMaximized: () => void;
  setShowLayerManager: (show: boolean) => void;
  toggleLayerManager: () => void;
  setShowDetailsPanel: (show: boolean) => void;
  toggleDetailsPanel: () => void;
  setShowBottomDock: (show: boolean) => void;
  toggleBottomDock: () => void;

  setWorkspace: (wsId: string) => void;
  setActiveWell: (wellId: string | null, wellboreId?: string | null) => void;
  setCurrentDepth: (depth: number) => void;
  setMode: (mode: AppMode) => void;
  setProposedLocation: (loc: { lat: number; lon: number } | null) => void;
  setSelectedObject: (id: string | null, type: 'well' | 'formation' | 'fault' | 'reservoir' | 'proposed' | null) => void;
}

export type SelectionStore = SelectionState & SelectionActions;

export function getInitialStateFromURL(): Partial<SelectionState> {
  if (typeof window === 'undefined') {
    return {
      selectedWorkspace: 'volve',
      workspaceId: 'volve',
      activeMode: 'MAP',
      mode: 'MAP',
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
      depthBasis: 'MD'
    };
  }

  const params = new URLSearchParams(window.location.search);
  const rawWs = params.get('ws') || 'volve';
  const ws = WORKSPACES[rawWs] ? rawWs : 'volve';
  const mode = normalizeMode(params.get('mode'));
  const well = params.get('well') || '15/9-F-12';
  const formation = params.get('formation') || null;
  const surface = params.get('surface') || null;
  const fault = params.get('fault') || null;
  const reservoir = params.get('reservoir') || null;
  const event = params.get('event') || null;
  const depth = params.has('depth') ? parseFloat(params.get('depth')!) : 1842.5;
  const basis = (params.get('basis') as DepthBasis) || 'MD';

  let location: { lat: number; lon: number } | null = null;
  if (params.has('lat') && params.has('lon')) {
    const lat = parseFloat(params.get('lat')!);
    const lon = parseFloat(params.get('lon')!);
    if (!isNaN(lat) && !isNaN(lon)) {
      location = { lat, lon };
    }
  }

  const validDepth = isNaN(depth) ? 1842.5 : depth;

  return {
    selectedWorkspace: ws,
    workspaceId: ws,
    activeMode: mode,
    mode: mode,
    selectedWell: well,
    activeWellId: well,
    activeWellboreId: well ? `${well}-WB1` : null,
    selectedFormation: formation,
    selectedSurface: surface,
    selectedFault: fault,
    selectedReservoir: reservoir,
    selectedDepth: validDepth,
    currentDepth: validDepth,
    selectedEvent: event,
    selectedLocation: location,
    proposedLocation: location,
    depthBasis: ['MD', 'TVD'].includes(basis) ? basis : 'MD'
  };
}

export function syncStateToURL(state: SelectionState) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('ws', state.selectedWorkspace);
  url.searchParams.set('mode', state.activeMode);

  if (state.selectedWell) {
    url.searchParams.set('well', state.selectedWell);
  } else {
    url.searchParams.delete('well');
  }

  if (state.selectedFormation) {
    url.searchParams.set('formation', state.selectedFormation);
  } else {
    url.searchParams.delete('formation');
  }

  if (state.selectedSurface) {
    url.searchParams.set('surface', state.selectedSurface);
  } else {
    url.searchParams.delete('surface');
  }

  if (state.selectedFault) {
    url.searchParams.set('fault', state.selectedFault);
  } else {
    url.searchParams.delete('fault');
  }

  if (state.selectedReservoir) {
    url.searchParams.set('reservoir', state.selectedReservoir);
  } else {
    url.searchParams.delete('reservoir');
  }

  if (state.selectedEvent) {
    url.searchParams.set('event', state.selectedEvent);
  } else {
    url.searchParams.delete('event');
  }

  if (state.selectedLocation) {
    url.searchParams.set('lat', state.selectedLocation.lat.toFixed(6));
    url.searchParams.set('lon', state.selectedLocation.lon.toFixed(6));
  } else {
    url.searchParams.delete('lat');
    url.searchParams.delete('lon');
  }

  url.searchParams.set('depth', state.selectedDepth.toFixed(1));
  url.searchParams.set('basis', state.depthBasis);

  window.history.replaceState({}, '', url.toString());
}

export const syncToURL = syncStateToURL;

const initial = getInitialStateFromURL();

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedWorkspace: initial.selectedWorkspace || 'volve',
  workspaceId: initial.selectedWorkspace || 'volve',
  selectedWell: initial.selectedWell || '15/9-F-12',
  activeWellId: initial.selectedWell || '15/9-F-12',
  activeWellboreId: initial.selectedWell ? `${initial.selectedWell}-WB1` : '15/9-F-12-WB1',
  selectedFormation: initial.selectedFormation || null,
  selectedSurface: initial.selectedSurface || null,
  selectedFault: initial.selectedFault || null,
  selectedReservoir: initial.selectedReservoir || null,
  selectedDepth: initial.selectedDepth ?? 1842.5,
  currentDepth: initial.selectedDepth ?? 1842.5,
  selectedEvent: initial.selectedEvent || null,
  selectedLocation: initial.selectedLocation || null,
  proposedLocation: initial.selectedLocation || null,
  activeMode: initial.activeMode || 'MAP',
  mode: initial.activeMode || 'MAP',

  selectedObjectId: initial.selectedWell || '15/9-F-12',
  selectedObjectType: 'well',
  depthBasis: initial.depthBasis || 'MD',
  theme: 'light',
  layers: DEFAULT_LAYERS,
  camera: {
    longitude: 1.8875,
    latitude: 58.4416,
    zoom: 13,
    pitch: 0,
    bearing: 0
  },
  activeTab: 'lookahead',

  isDashboardDrawerOpen: false,
  dashboardTab: 'overview',
  isCanvasMaximized: false,
  showLayerManager: true,
  showDetailsPanel: true,
  showBottomDock: true,

  setSelectedWorkspace: (wsId) => {
    if (!WORKSPACES[wsId]) return;
    const ws = WORKSPACES[wsId];
    set({
      selectedWorkspace: wsId,
      workspaceId: wsId,
      selectedWell: wsId === 'volve' ? '15/9-F-12' : null,
      activeWellId: wsId === 'volve' ? '15/9-F-12' : null,
      activeWellboreId: wsId === 'volve' ? '15/9-F-12-WB1' : null,
      selectedObjectId: wsId === 'volve' ? '15/9-F-12' : null,
      camera: {
        longitude: ws.center[0],
        latitude: ws.center[1],
        zoom: 12,
        pitch: 0,
        bearing: 0
      }
    });
    syncStateToURL(get());
  },

  setSelectedWell: (wellId, wellboreId) => {
    set({
      selectedWell: wellId,
      activeWellId: wellId,
      activeWellboreId: wellboreId || (wellId ? `${wellId}-WB1` : null),
      selectedObjectId: wellId,
      selectedObjectType: wellId ? 'well' : null
    });
    syncStateToURL(get());
  },

  setSelectedFormation: (formation) => {
    set({
      selectedFormation: formation,
      selectedObjectId: formation,
      selectedObjectType: formation ? 'formation' : null
    });
    syncStateToURL(get());
  },

  setSelectedSurface: (surfaceId) => {
    set({
      selectedSurface: surfaceId,
      selectedObjectId: surfaceId,
      selectedObjectType: surfaceId ? 'formation' : null
    });
    syncStateToURL(get());
  },

  setSelectedFault: (faultId) => {
    set({
      selectedFault: faultId,
      selectedObjectId: faultId,
      selectedObjectType: faultId ? 'fault' : null
    });
    syncStateToURL(get());
  },

  setSelectedReservoir: (reservoirId) => {
    set({
      selectedReservoir: reservoirId,
      selectedObjectId: reservoirId,
      selectedObjectType: reservoirId ? 'formation' : null
    });
    syncStateToURL(get());
  },

  setSelectedDepth: (depth) => {
    const val = Math.max(0, parseFloat(depth.toFixed(1)));
    set({
      selectedDepth: val,
      currentDepth: val
    });
    syncStateToURL(get());
  },

  setSelectedEvent: (eventId) => {
    set({ selectedEvent: eventId });
    syncStateToURL(get());
  },

  setSelectedLocation: (loc) => {
    set({
      selectedLocation: loc,
      proposedLocation: loc
    });
    syncStateToURL(get());
  },

  setActiveMode: (mode) => {
    const canonical = normalizeMode(mode);
    set({
      activeMode: canonical,
      mode: canonical
    });
    syncStateToURL(get());
  },

  setDepthBasis: (basis) => {
    set({ depthBasis: basis });
    syncStateToURL(get());
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: nextTheme });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  },

  setLayerVisibility: (layerId, visible) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === layerId ? { ...l, visible } : l))
    }));
  },

  setLayerOpacity: (layerId, opacity) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    }));
  },

  setCamera: (partialCamera) => {
    set((state) => ({ camera: { ...state.camera, ...partialCamera } }));
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setDashboardDrawerOpen: (open) => set({ isDashboardDrawerOpen: open }),
  toggleDashboardDrawer: () => set((s) => ({ isDashboardDrawerOpen: !s.isDashboardDrawerOpen })),
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  setCanvasMaximized: (max) => set({ isCanvasMaximized: max }),
  toggleCanvasMaximized: () => set((s) => ({ isCanvasMaximized: !s.isCanvasMaximized })),
  setShowLayerManager: (show) => set({ showLayerManager: show }),
  toggleLayerManager: () => set((s) => ({ showLayerManager: !s.showLayerManager })),
  setShowDetailsPanel: (show) => set({ showDetailsPanel: show }),
  toggleDetailsPanel: () => set((s) => ({ showDetailsPanel: !s.showDetailsPanel })),
  setShowBottomDock: (show) => set({ showBottomDock: show }),
  toggleBottomDock: () => set((s) => ({ showBottomDock: !s.showBottomDock })),

  setWorkspace: (wsId) => get().setSelectedWorkspace(wsId),
  setActiveWell: (wellId, wellboreId) => get().setSelectedWell(wellId, wellboreId),
  setCurrentDepth: (depth) => get().setSelectedDepth(depth),
  setMode: (mode) => get().setActiveMode(mode),
  setProposedLocation: (loc) => get().setSelectedLocation(loc),
  setSelectedObject: (id, type) => {
    set({ selectedObjectId: id, selectedObjectType: type });
    if (type === 'well' && id) {
      get().setSelectedWell(id);
    } else if (type === 'formation' && id) {
      get().setSelectedFormation(id);
    } else if (type === 'fault' && id) {
      get().setSelectedFault(id);
    } else if (type === 'reservoir' && id) {
      get().setSelectedReservoir(id);
    }
  }
}));

// Listen to browser Back/Forward navigation
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const updated = getInitialStateFromURL();
    useSelectionStore.setState((prev) => ({
      ...prev,
      ...updated
    }));
  });
}

export default useSelectionStore;
