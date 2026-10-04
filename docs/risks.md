# SIH-121 Exploration Intelligence Platform — Risk Register & Mitigation Strategy

This document details the engineering, scientific, and architectural risks identified during the Phase 0 audit and establishes explicit safeguards for the platform implementation.

---

## 1. High-Priority Risk Matrix

| Risk ID | Category | Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Data Integrity | **Misleading "NO_HAZARD" reporting for wells with zero data.** 5 of 6 Volve wells currently have no reports or events in `data/nwis.db`. | **Critical** | **High** | Implement strict 3-tier status wording: `NO_DATA` when well has no reports, `INSUFFICIENT_DATA` when covered wells $< 3$, and `NO_EVENTS_RECORDED` only when $\ge 3$ offset wells have verified coverage. |
| **RSK-02** | Geodesy / CRS | **ED50 to WGS84 datum mismatch (~116m error).** Coordinates in Volve are in ED50 UTM Zone 31N; assuming WGS84 shifts wells ~116m southwest. | **High** | **High** | Perform rigorous geodetic transformation using `pyproj` (EPSG:23031 $\rightarrow$ EPSG:4326 with Bursa-Wolf North Sea EPSG:1612 shift parameters). |
| **RSK-03** | Graphics | **Float32 precision jitter in 3D Subsurface viewer.** Raw UTM coordinates ($N \approx 6.48 \times 10^6$) exceed float32 mantissa, causing 0.1m–0.5m shivering. | **High** | **High** | Enforce Local Metric Frame $(x, y, z)$ centred at field origin $(E_0, N_0, 0)$. Verified in Spike 2 to reduce jitter to $< 0.0001\text{ mm}$. |
| **RSK-04** | Graphics / Memory | **WebGL memory leaks across mode switches.** Switching between MapLibre and Three.js can exhaust browser GPU memory contexts. | **High** | **Medium** | Mount one WebGL engine per mode; attach a deterministic recursive disposal routine traversing all meshes, geometries, and textures upon unmount. Verified in Spike 3. |
| **RSK-05** | Scientific Trust | **Hardcoded / synthetic evidence leaking into real Volve screens.** Legacy code contained hardcoded stuck pipe at 2052m, fake 92% similarity, and Jodhpur Sandstone. | **Critical** | **High** | Enforce Rule R1 & R2: Zero geological constants in frontend code. Automated CI banned-string check failing builds if `2052`, `A-17`, `B-04`, or `Jodhpur` appear in Workspace A. |
| **RSK-06** | Governance / AI | **Third-party LLM data leakage & local storage API keys.** Legacy Groq integration exposed user keys in `localStorage` and sent operational context to external APIs. | **High** | **Medium** | LLM Copilot is **OFF by default**. Zero client-side API keys. All inference routed through server with user consent banner stating data leaves local perimeter. Rule R10. |
| **RSK-07** | Performance | **Large well log curves causing main thread freezing during scrolling.** 50,000 raw wireline samples per curve can drop frame rates below 20 fps. | **Medium** | **High** | Implement Largest-Triangle-Three-Buckets (LTTB) algorithm on server to downsample log curves to 1,500 samples per viewport. Canvas rendering with offscreen buffering. |
| **RSK-08** | Usability / UI | **Information overload & non-compliant typography.** Legacy UI had 13 top-level navigation items, neon cyan theme, and 9px unreadable labels. | **Medium** | **High** | Modern government-grade UI: UX4G design tokens, light theme default, Noto Sans typography, min 12px font size, 4 primary views (Workspace, Evidence, Compare, Settings). |

---

## 2. Automated Quality Gates

To prevent any regression during Phase 1–7 implementation:
1. **Backend Contract Tests**: All 155 existing tests must stay green.
2. **Frontend Strict Banned-String Check**:
   ```bash
   node scripts/check-banned-strings.cjs
   ```
   Fails if hardcoded porosity, permeability, fake well names (`A-17`, `B-04`), or fake depths (`2052`) exist in `web/src/`.
3. **Single Selection State Audit**: Fails if any visible panel or 3D object deviates from the active selection store (`workspace`, `well`, `depth`, `mode`).
4. **Accessibility Gate**: Automated `axe-core` scan with **zero critical violations** and Lighthouse accessibility score $\ge 90$.
5. **Frame Budget Verification**: 60 fps for MapLibre pan/zoom; $\ge 50$ fps for Three.js orbit with 20 wells and 8 surfaces.
