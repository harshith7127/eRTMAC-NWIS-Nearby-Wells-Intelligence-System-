"""
NWIS Formation Service — Stratigraphic Depth Alignment, Controlled Aliases, and Relative Position Logic
Calculates depth below formation top (MD/TVD) for wellbores and drilling events without modifying raw source depths.
"""

import sqlite3
from typing import List, Dict, Any, Optional, Tuple


def resolve_canonical_formation_name(conn: sqlite3.Connection, raw_name: Optional[str]) -> str:
    """Resolves raw formation string to canonical standard name using controlled formation_aliases."""
    if not raw_name:
        return "UNKNOWN"

    cleaned = raw_name.strip()
    row = conn.execute(
        "SELECT canonical_name FROM formation_aliases WHERE LOWER(alias) = LOWER(?)",
        (cleaned,)
    ).fetchone()

    if row:
        return row["canonical_name"]

    # Fallback cleanup rule for common standard geological suffixes
    normalized = cleaned.replace(" Formation", "").replace(" Fm.", "").replace(" Gp.", " Group").strip()
    return normalized if normalized else "UNKNOWN"


def list_formation_aliases(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Returns all configured controlled formation aliases."""
    rows = conn.execute("SELECT * FROM formation_aliases ORDER BY canonical_name ASC, alias ASC").fetchall()
    return [dict(r) for r in rows]


def get_wellbore_formation_tops(conn: sqlite3.Connection, wellbore_id: str) -> List[Dict[str, Any]]:
    """
    Returns ordered formation tops for a wellbore, ensuring both formation_name_raw
    and formation_name_canonical are populated.
    """
    rows = conn.execute(
        "SELECT * FROM formation_tops WHERE wellbore_id = ? ORDER BY md ASC",
        (wellbore_id,)
    ).fetchall()

    tops = []
    for r in rows:
        d = dict(r)
        d["formation_name_raw"] = d["formation_name"]
        if not d.get("formation_name_canonical"):
            d["formation_name_canonical"] = resolve_canonical_formation_name(conn, d["formation_name"])
        d["reviewed"] = bool(d["reviewed"])
        tops.append(d)

    return tops


def get_formation_at_depth(
    conn: sqlite3.Connection, wellbore_id: str, md: float
) -> Dict[str, Any]:
    """
    Determines the containing geological formation at a target MD based on ordered formation tops.
    Rule: Given ordered tops [T1, T2, ..., Tn], if T_k.md <= md < T_{k+1}.md, then formation is T_k.
    If md < T1.md, returns UNKNOWN (above first top).
    """
    tops = get_wellbore_formation_tops(conn, wellbore_id)
    if not tops:
        return {
            "wellbore_id": wellbore_id,
            "md": md,
            "formation_name_raw": None,
            "formation_name_canonical": "UNKNOWN",
            "formation_top_md": None,
            "formation_bottom_md": None,
            "depth_below_top_md": None,
            "depth_basis": "MD",
            "alignment_basis": "NOT_ALIGNED",
            "source": None,
            "provenance": "REAL",
            "reason": f"No formation tops recorded for wellbore '{wellbore_id}'."
        }

    # If target MD is above the very first top
    if md < tops[0]["md"]:
        return {
            "wellbore_id": wellbore_id,
            "md": md,
            "formation_name_raw": "Above First Formation",
            "formation_name_canonical": "UNKNOWN",
            "formation_top_md": None,
            "formation_bottom_md": tops[0]["md"],
            "depth_below_top_md": None,
            "depth_basis": "MD",
            "alignment_basis": "NOT_ALIGNED",
            "source": tops[0].get("source"),
            "provenance": "REAL",
            "reason": f"Target MD {md} m is above the first recorded formation top '{tops[0]['formation_name']}' ({tops[0]['md']} m)."
        }

    # Find containing interval
    matched_top = None
    next_top_md = None

    for i in range(len(tops)):
        curr_top = tops[i]
        curr_bottom = tops[i + 1]["md"] if (i + 1 < len(tops)) else None

        if curr_bottom is not None:
            if curr_top["md"] <= md < curr_bottom:
                matched_top = curr_top
                next_top_md = curr_bottom
                break
        else:
            # Last recorded formation extends downwards
            if md >= curr_top["md"]:
                matched_top = curr_top
                next_top_md = None
                break

    if not matched_top:
        return {
            "wellbore_id": wellbore_id,
            "md": md,
            "formation_name_raw": None,
            "formation_name_canonical": "UNKNOWN",
            "formation_top_md": None,
            "formation_bottom_md": None,
            "depth_below_top_md": None,
            "depth_basis": "MD",
            "alignment_basis": "NOT_ALIGNED",
            "source": None,
            "provenance": "REAL",
            "reason": "Could not determine containing formation interval."
        }

    top_md = matched_top["md"]
    depth_below_top = round(md - top_md, 2)

    return {
        "wellbore_id": wellbore_id,
        "md": md,
        "formation_name_raw": matched_top["formation_name_raw"],
        "formation_name_canonical": matched_top["formation_name_canonical"],
        "formation_top_md": top_md,
        "formation_bottom_md": next_top_md,
        "depth_below_top_md": depth_below_top,
        "depth_basis": "MD",
        "alignment_basis": "FORMATION_TOP_MD",
        "source": matched_top.get("source"),
        "provenance": "DERIVED",
        "reason": None
    }


def align_event_to_stratigraphy(
    conn: sqlite3.Connection, event: Dict[str, Any], wellbore_tops: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Enriches an event dict with derived relative formation depth (depth_below_formation_top_md)
    and canonical formation name, preserving all raw source depths.
    """
    enriched = dict(event)
    wb_id = event.get("wellbore_id")
    event_md = event.get("md")

    # Preserve raw depths explicitly
    enriched["raw_md"] = event_md
    enriched["raw_tvd"] = event.get("tvd")

    if event_md is None or not wb_id:
        enriched["canonical_formation_name"] = resolve_canonical_formation_name(conn, event.get("formation_name"))
        enriched["formation_top_md"] = None
        enriched["depth_below_formation_top_md"] = None
        enriched["alignment_basis"] = "NOT_ALIGNED"
        return enriched

    if wellbore_tops is None:
        wellbore_tops = get_wellbore_formation_tops(conn, wb_id)

    if not wellbore_tops:
        enriched["canonical_formation_name"] = resolve_canonical_formation_name(conn, event.get("formation_name"))
        enriched["formation_top_md"] = None
        enriched["depth_below_formation_top_md"] = None
        enriched["alignment_basis"] = "NOT_ALIGNED"
        return enriched

    # Match containing formation
    matched_top = None
    for i in range(len(wellbore_tops)):
        curr_top = wellbore_tops[i]
        curr_bottom = wellbore_tops[i + 1]["md"] if (i + 1 < len(wellbore_tops)) else None

        if curr_bottom is not None:
            if curr_top["md"] <= event_md < curr_bottom:
                matched_top = curr_top
                break
        else:
            if event_md >= curr_top["md"]:
                matched_top = curr_top
                break

    if matched_top:
        enriched["canonical_formation_name"] = matched_top["formation_name_canonical"]
        enriched["formation_top_md"] = matched_top["md"]
        enriched["depth_below_formation_top_md"] = round(event_md - matched_top["md"], 2)
        enriched["depth_basis"] = "MD"
        enriched["alignment_basis"] = "FORMATION_TOP_MD"
    else:
        # Event is above first top or outside tops
        enriched["canonical_formation_name"] = resolve_canonical_formation_name(conn, event.get("formation_name"))
        enriched["formation_top_md"] = None
        enriched["depth_below_formation_top_md"] = None
        enriched["alignment_basis"] = "NOT_ALIGNED"

    return enriched
