/**
 * Local Metric Frame & Coordinate Transformation Utilities
 * Complies with Rule 8: Use local metric frame (E - E0, N - N0, z = -TVD)
 * to prevent Three.js Float32 coordinate jitter.
 */

export const VOLVE_ORIGIN = {
  easting: 435000.0,
  northing: 6478000.0,
  latitude: 58.441636,
  longitude: 1.887483
};

export function toLocalMetricFrame(
  easting: number,
  northing: number,
  tvdM: number,
  origin = VOLVE_ORIGIN
): [number, number, number] {
  const localX = easting - origin.easting;
  const localY = northing - origin.northing;
  const localZ = -tvdM; // Three.js Y/Z convention: depth downwards is negative Z or Y
  return [localX, localY, localZ];
}

export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

export function formatEastingNorthing(easting?: number, northing?: number): string {
  if (easting === undefined || northing === undefined) return 'N/A';
  return `E: ${easting.toLocaleString('en-US', { maximumFractionDigits: 1 })} m, N: ${northing.toLocaleString('en-US', { maximumFractionDigits: 1 })} m`;
}
