/**
 * Scientific and Engineering Unit Formatters — SIH-121
 */

import { DATA_NOT_AVAILABLE, DepthBasis } from '../types';

export function formatDepth(depthM: number | null | undefined, basis: DepthBasis = 'MD'): string {
  if (depthM === null || depthM === undefined || isNaN(depthM)) {
    return DATA_NOT_AVAILABLE;
  }
  return `${depthM.toFixed(1)} m ${basis}`;
}

export function formatROP(rop?: number | null): string {
  if (rop === null || rop === undefined || isNaN(rop)) return DATA_NOT_AVAILABLE;
  return `${rop.toFixed(1)} m/hr`;
}

export function formatWOB(wob?: number | null): string {
  if (wob === null || wob === undefined || isNaN(wob)) return DATA_NOT_AVAILABLE;
  return `${wob.toFixed(1)} kN`;
}

export function formatTorque(tq?: number | null): string {
  if (tq === null || tq === undefined || isNaN(tq)) return DATA_NOT_AVAILABLE;
  return `${tq.toFixed(1)} kNm`;
}

export function formatPressure(spp?: number | null): string {
  if (spp === null || spp === undefined || isNaN(spp)) return DATA_NOT_AVAILABLE;
  return `${spp.toFixed(0)} kPa`;
}

export function formatGas(gas?: number | null): string {
  if (gas === null || gas === undefined || isNaN(gas)) return DATA_NOT_AVAILABLE;
  return `${gas.toFixed(2)}%`;
}
