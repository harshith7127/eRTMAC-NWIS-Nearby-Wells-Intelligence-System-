/**
 * TanStack Query Hooks for Geological & Drilling Data
 * SIH-121 Exploration Intelligence Platform
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DepthBasis } from '../types';

export const queryKeys = {
  workspaces: ['workspaces'] as const,
  wells: (workspaceId: string) => ['wells', workspaceId] as const,
  well: (wellId: string) => ['well', wellId] as const,
  wellbores: (wellId: string) => ['wellbores', wellId] as const,
  surveys: (wellId: string) => ['surveys', wellId] as const,
  formationTops: (wellId: string) => ['formationTops', wellId] as const,
  surfaces: (workspaceId: string) => ['surfaces', workspaceId] as const,
  surfaceGrid: (surfaceId: string, workspaceId: string) => ['surfaceGrid', surfaceId, workspaceId] as const,
  faults: (workspaceId: string) => ['faults', workspaceId] as const,
  reservoirs: (workspaceId: string) => ['reservoirs', workspaceId] as const,
  terrain: (workspaceId: string) => ['terrain', workspaceId] as const,
  geologyProbe: (lat: number, lon: number, depth: number, basis: DepthBasis, ws: string) =>
    ['geologyProbe', lat, lon, depth, basis, ws] as const,
  locationAnalysis: (lat: number, lon: number, depth: number, fm?: string, radius?: number, ws?: string) =>
    ['locationAnalysis', lat, lon, depth, fm, radius, ws] as const,
  wellLogs: (wellId: string, curve?: string) => ['wellLogs', wellId, curve] as const,
  mudLogs: (wellId: string) => ['mudLogs', wellId] as const,
  casings: (wellId: string) => ['casings', wellId] as const,
  dataAvailability: (wellId: string) => ['dataAvailability', wellId] as const,
  lookahead: (wellId: string, depth: number, windowM: number) => ['lookahead', wellId, depth, windowM] as const
};

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: () => api.getWorkspaces()
  });
}

export function useWells(workspaceId = 'volve') {
  return useQuery({
    queryKey: queryKeys.wells(workspaceId),
    queryFn: () => api.getWells(workspaceId),
    enabled: Boolean(workspaceId)
  });
}

export function useWell(wellId: string | null) {
  return useQuery({
    queryKey: queryKeys.well(wellId || ''),
    queryFn: () => (wellId ? api.getWell(wellId) : Promise.resolve(null)),
    enabled: Boolean(wellId)
  });
}

export function useSurveys(wellId: string | null) {
  return useQuery({
    queryKey: queryKeys.surveys(wellId || ''),
    queryFn: () => (wellId ? api.getSurveys(wellId) : Promise.resolve([])),
    enabled: Boolean(wellId)
  });
}

export function useFormationTops(wellId: string | null) {
  return useQuery({
    queryKey: queryKeys.formationTops(wellId || ''),
    queryFn: () => (wellId ? api.getFormationTops(wellId) : Promise.resolve([])),
    enabled: Boolean(wellId)
  });
}

export function useSurfaces(workspaceId = 'volve') {
  return useQuery({
    queryKey: queryKeys.surfaces(workspaceId),
    queryFn: () => api.getSurfaces(workspaceId),
    enabled: Boolean(workspaceId)
  });
}

export function useSurfaceGrid(surfaceId: string | null, workspaceId = 'volve', resolution = 21) {
  return useQuery({
    queryKey: queryKeys.surfaceGrid(surfaceId || '', workspaceId),
    queryFn: () => (surfaceId ? api.getSurfaceGrid(surfaceId, workspaceId, resolution) : Promise.resolve(null)),
    enabled: Boolean(surfaceId)
  });
}

export function useFaults(workspaceId = 'volve') {
  return useQuery({
    queryKey: queryKeys.faults(workspaceId),
    queryFn: () => api.getFaults(workspaceId),
    enabled: Boolean(workspaceId)
  });
}

export function useReservoirs(workspaceId = 'volve') {
  return useQuery({
    queryKey: queryKeys.reservoirs(workspaceId),
    queryFn: () => api.getReservoirs(workspaceId),
    enabled: Boolean(workspaceId)
  });
}

export function useTerrain(workspaceId = 'volve') {
  return useQuery({
    queryKey: queryKeys.terrain(workspaceId),
    queryFn: () => api.getTerrain(workspaceId),
    enabled: Boolean(workspaceId)
  });
}

export function useGeologyProbe(
  lat: number,
  lon: number,
  depthM: number,
  depthBasis: DepthBasis = 'TVD',
  workspace = 'volve',
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.geologyProbe(lat, lon, depthM, depthBasis, workspace),
    queryFn: () => api.probeGeology(lat, lon, depthM, depthBasis, workspace),
    enabled: enabled && !isNaN(lat) && !isNaN(lon) && !isNaN(depthM)
  });
}

export function useLocationAnalysis(
  params: {
    latitude: number;
    longitude: number;
    target_depth_m: number;
    target_formation?: string;
    radius_km?: number;
    workspace?: string;
  } | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.locationAnalysis(
      params?.latitude || 0,
      params?.longitude || 0,
      params?.target_depth_m || 0,
      params?.target_formation,
      params?.radius_km,
      params?.workspace
    ),
    queryFn: () => (params ? api.analyzeLocation(params) : Promise.resolve(null)),
    enabled: enabled && Boolean(params)
  });
}

export function useWellLogs(wellId: string | null, curve?: string) {
  return useQuery({
    queryKey: queryKeys.wellLogs(wellId || '', curve),
    queryFn: () => (wellId ? api.getWellLogs(wellId, curve) : Promise.resolve([])),
    enabled: Boolean(wellId)
  });
}

export function useMudLogs(wellId: string | null) {
  return useQuery({
    queryKey: queryKeys.mudLogs(wellId || ''),
    queryFn: () => (wellId ? api.getMudLogs(wellId) : Promise.resolve([])),
    enabled: Boolean(wellId)
  });
}

export function useCasings(wellId: string | null) {
  return useQuery({
    queryKey: queryKeys.casings(wellId || ''),
    queryFn: () => (wellId ? api.getCasings(wellId) : Promise.resolve([])),
    enabled: Boolean(wellId)
  });
}

export function useDataAvailability(wellId: string | null) {
  return useQuery({
    queryKey: queryKeys.dataAvailability(wellId || ''),
    queryFn: () => (wellId ? api.getDataAvailability(wellId) : Promise.resolve(null)),
    enabled: Boolean(wellId)
  });
}
