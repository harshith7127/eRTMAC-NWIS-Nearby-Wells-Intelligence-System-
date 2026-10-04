"""
NWIS Trajectory Service — Minimum Curvature Trajectory Calculation & Subsurface Survey Interpolation
Calculates 3D spatial positions (TVD, Northing, Easting, DLS) from directional survey stations (MD, Inclination, Azimuth).
"""

import math
import sqlite3
from typing import List, Dict, Any, Optional, Tuple


def normalize_surveys(raw_surveys: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Sorts surveys strictly by MD, validates monotonic ordering, deduplicates identical MDs deterministically,
    and returns sanitized stations alongside data gap warnings.
    """
    data_gaps = []
    if not raw_surveys:
        data_gaps.append("No directional survey stations recorded for wellbore.")
        return [], data_gaps

    # Pre-filter non-numeric and NaN records safely before sorting
    valid_raw = []
    for stn in raw_surveys:
        try:
            md = float(stn["md"])
            incl = float(stn["inclination"])
            azi = float(stn["azimuth"])
            if math.isnan(md) or math.isnan(incl) or math.isnan(azi):
                data_gaps.append(f"NaN value encountered and omitted at survey_id: {stn.get('survey_id')}")
                continue
            if md < 0:
                data_gaps.append(f"Negative MD ({md} m) record omitted.")
                continue
            valid_raw.append((md, incl, azi, stn))
        except (ValueError, TypeError):
            data_gaps.append(f"Invalid non-numeric survey record omitted at survey_id: {stn.get('survey_id')}")
            continue

    # Sort stations strictly by MD
    valid_raw.sort(key=lambda item: item[0])
    sanitized = []
    seen_mds = set()

    for md, incl, azi, stn in valid_raw:
        if md in seen_mds:
            data_gaps.append(f"Duplicate survey station at MD {md} m; preserved first occurrence.")
            continue

        seen_mds.add(md)
        sanitized.append({
            "survey_id": stn.get("survey_id"),
            "wellbore_id": stn.get("wellbore_id"),
            "md": md,
            "inclination": incl,
            "azimuth": azi,
            "tvd": float(stn["tvd"]) if stn.get("tvd") is not None else None,
            "tvdss": float(stn["tvdss"]) if stn.get("tvdss") is not None else None,
            "northing": float(stn["northing"]) if stn.get("northing") is not None else None,
            "easting": float(stn["easting"]) if stn.get("easting") is not None else None,
            "source": stn.get("source", "MWD Survey"),
            "provenance": stn.get("provenance", "REAL")
        })

    return sanitized, data_gaps


def minimum_curvature_step(
    md1: float, incl1_deg: float, azi1_deg: float,
    md2: float, incl2_deg: float, azi2_deg: float
) -> Dict[str, float]:
    """
    Computes delta TVD, delta Northing, delta Easting, dogleg angle (radians),
    and Dogleg Severity (DLS, deg/30m) between two survey stations using the Minimum Curvature method.
    """
    d_md = md2 - md1
    if d_md <= 0.0:
        return {"delta_tvd": 0.0, "delta_north": 0.0, "delta_east": 0.0, "dogleg_rad": 0.0, "dls": 0.0}

    # Convert degrees to radians
    i1 = math.radians(incl1_deg)
    i2 = math.radians(incl2_deg)
    a1 = math.radians(azi1_deg)
    a2 = math.radians(azi2_deg)

    # Dogleg angle calculation
    cos_dogleg = math.cos(i1) * math.cos(i2) + math.sin(i1) * math.sin(i2) * math.cos(a2 - a1)
    # Clamp to [-1.0, 1.0] to prevent math domain error
    cos_dogleg = max(-1.0, min(1.0, cos_dogleg))
    dogleg_rad = math.acos(cos_dogleg)

    # Ratio factor RF
    if dogleg_rad < 1e-6:
        rf = 1.0
    else:
        rf = (2.0 / dogleg_rad) * math.tan(dogleg_rad / 2.0)

    delta_tvd = (d_md / 2.0) * (math.cos(i1) + math.cos(i2)) * rf
    delta_north = (d_md / 2.0) * (math.sin(i1) * math.cos(a1) + math.sin(i2) * math.cos(a2)) * rf
    delta_east = (d_md / 2.0) * (math.sin(i1) * math.sin(a1) + math.sin(i2) * math.sin(a2)) * rf

    # Dogleg severity in degrees per 30 meters
    dogleg_deg = math.degrees(dogleg_rad)
    dls = (dogleg_deg / d_md) * 30.0 if d_md > 0 else 0.0

    return {
        "delta_tvd": delta_tvd,
        "delta_north": delta_north,
        "delta_east": delta_east,
        "dogleg_rad": dogleg_rad,
        "dls": round(dls, 3)
    }


def compute_wellbore_trajectory(raw_surveys: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Computes full cumulative trajectory (TVD, Northing, Easting, DLS) along all survey stations.
    Prefers source TVD/Northing/Easting when available; derives values via Minimum Curvature otherwise.
    """
    stations, data_gaps = normalize_surveys(raw_surveys)
    if not stations:
        return [], data_gaps

    computed_stations = []
    cum_tvd = 0.0
    cum_north = 0.0
    cum_east = 0.0

    for idx, stn in enumerate(stations):
        if idx == 0:
            # First station initialization
            cum_tvd = stn["tvd"] if stn["tvd"] is not None else stn["md"] * math.cos(math.radians(stn["inclination"]))
            cum_north = stn["northing"] if stn["northing"] is not None else 0.0
            cum_east = stn["easting"] if stn["easting"] is not None else 0.0
            dls = 0.0
        else:
            prev = stations[idx - 1]
            step = minimum_curvature_step(
                prev["md"], prev["inclination"], prev["azimuth"],
                stn["md"], stn["inclination"], stn["azimuth"]
            )
            dls = step["dls"]

            # Prefer source TVD / displacement if recorded in official survey
            if stn["tvd"] is not None:
                cum_tvd = stn["tvd"]
            else:
                cum_tvd += step["delta_tvd"]

            if stn["northing"] is not None:
                cum_north = stn["northing"]
            else:
                cum_north += step["delta_north"]

            if stn["easting"] is not None:
                cum_east = stn["easting"]
            else:
                cum_east += step["delta_east"]

        computed_stations.append({
            "survey_id": stn.get("survey_id"),
            "wellbore_id": stn.get("wellbore_id"),
            "md": round(stn["md"], 2),
            "inclination": round(stn["inclination"], 2),
            "azimuth": round(stn["azimuth"], 2),
            "tvd": round(cum_tvd, 2),
            "tvdss": stn.get("tvdss"),
            "northing": round(cum_north, 2),
            "easting": round(cum_east, 2),
            "dls": dls,
            "interpolation_basis": "RAW_SURVEY" if (stn["tvd"] is not None) else "MINIMUM_CURVATURE_DERIVED",
            "provenance": stn.get("provenance", "REAL")
        })

    return computed_stations, data_gaps


def interpolate_trajectory_at_md(
    raw_surveys: List[Dict[str, Any]], target_md: float
) -> Dict[str, Any]:
    """
    Interpolates 3D trajectory position (TVD, Northing, Easting, Inclination, Azimuth) at an arbitrary MD
    using Minimum Curvature interpolation between bounding survey stations.
    """
    computed, gaps = compute_wellbore_trajectory(raw_surveys)
    if not computed:
        return {
            "target_md": target_md,
            "position": None,
            "interpolation_basis": None,
            "reason": "No survey stations available for wellbore."
        }

    min_md = computed[0]["md"]
    max_md = computed[-1]["md"]

    if target_md < min_md or target_md > max_md:
        return {
            "target_md": target_md,
            "position": None,
            "interpolation_basis": None,
            "reason": f"Target MD {target_md} m is outside available survey range [{min_md} m, {max_md} m]."
        }

    # Check exact match
    for stn in computed:
        if abs(stn["md"] - target_md) < 0.001:
            return {
                "target_md": target_md,
                "position": stn,
                "interpolation_basis": "EXACT_STATION",
                "reason": None
            }

    # Find bounding stations S1 and S2
    s1 = None
    s2 = None
    for i in range(len(computed) - 1):
        if computed[i]["md"] <= target_md <= computed[i + 1]["md"]:
            s1 = computed[i]
            s2 = computed[i + 1]
            break

    if not s1 or not s2:
        return {
            "target_md": target_md,
            "position": None,
            "interpolation_basis": None,
            "reason": "Unable to determine bounding survey stations."
        }

    # Linearly interpolate angles to target MD
    span = s2["md"] - s1["md"]
    fraction = (target_md - s1["md"]) / span if span > 0 else 0.0

    target_incl = s1["inclination"] + fraction * (s2["inclination"] - s1["inclination"])

    # Handle azimuth angular wrapping
    d_azi = (s2["azimuth"] - s1["azimuth"] + 180.0) % 360.0 - 180.0
    target_azi = (s1["azimuth"] + fraction * d_azi) % 360.0

    # Calculate sub-step minimum curvature from S1 to target_md
    step = minimum_curvature_step(
        s1["md"], s1["inclination"], s1["azimuth"],
        target_md, target_incl, target_azi
    )

    interp_tvd = s1["tvd"] + step["delta_tvd"]
    interp_north = s1["northing"] + step["delta_north"]
    interp_east = s1["easting"] + step["delta_east"]

    position = {
        "md": round(target_md, 2),
        "inclination": round(target_incl, 2),
        "azimuth": round(target_azi, 2),
        "tvd": round(interp_tvd, 2),
        "tvdss": None,
        "northing": round(interp_north, 2),
        "easting": round(interp_east, 2),
        "dls": step["dls"],
        "interpolation_basis": "MINIMUM_CURVATURE_INTERPOLATED",
        "provenance": "DERIVED"
    }

    return {
        "target_md": target_md,
        "position": position,
        "interpolation_basis": "MINIMUM_CURVATURE",
        "reason": None
    }
