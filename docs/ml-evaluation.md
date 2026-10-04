# NWIS Machine Learning Evaluation, Leakage-Safe Backtesting & Model Card
**Document Version:** 1.0.0  
**Phase:** Phase 6 Offline ML Evaluation & Rule-Baseline Comparison  
**Dataset Scope:** Equinor Volve Field Open Data (Block 15/9, Norwegian North Sea)  
**Evaluation Status:** `NOT_SHIPPED` (Evaluated for offline comparison only)  
**Primary Operational Baseline:** Phase 4 Deterministic K-of-N Offset Evidence Rule Engine  

---

## 1. Executive Summary & Objective

Phase 6 implements a rigorous, leakage-safe offline machine learning evaluation and backtesting framework within the Nearby Wells Intelligence System (NWIS). 

The sole engineering objective of this layer is to empirically answer:
> *"Does a simple, leakage-safe machine learning model provide measurable, reproducible value beyond the existing deterministic Phase 4 offset-evidence rule engine?"*

### Empirical Answer: NO (Model Status: `NOT_SHIPPED`)
Across rigorous Leave-One-Well-Out Cross-Validation (LOWOCV) on 6 Volve wellbores comprising 662 discretized 30m intervals:
- **Baseline 1 (Always Negative):** PR-AUC = `0.0514`, Precision = `0.0000`, Alerts/1000m = `0.00`
- **Baseline 2 (Phase 4 Rule Engine):** PR-AUC = `0.0514`, Precision = `0.0000`, Alerts/1000m = `5.74`
- **Model 1 (Logistic Regression LOWOCV):** PR-AUC = `0.0514`, Precision = `0.0000`, Alerts/1000m = `0.00`
- **Model 2 (HistGradientBoosting LOWOCV):** PR-AUC = `0.0514`, Precision = `0.0000`, Alerts/1000m = `0.20`

Because the ML models did not demonstrate a measurable improvement ($\ge +0.05\text{ PR-AUC}$) over the deterministic Phase 4 rule baseline on the available evaluation data, the model status is mechanically set to **`NOT_SHIPPED`**. Phase 4 remains the authoritative operational decision-support layer.

---

## 2. Non-Negotiable Operational & Governance Constraints

1. **Equinor Volve Prototype Dataset Only:**  
   The evaluation utilizes open retrospective drilling records from Equinor's Volve Field (Block 15/9).
2. **Oil India / eRTMAC Transfer Limitation:**  
   > *“Volve is a public North Sea dataset and is not evidence of equivalent event frequencies or model performance for Oil India operations.”*  
   No production credentials or intranet connectivity exist; eRTMAC live rig connector is explicitly marked `NOT_CONNECTED`.
3. **No Random Train/Test Splits:**  
   Random splitting across depth intervals creates severe autocorrelation and depth leakage. Only strict **Leave-One-Well-Out Cross-Validation (LOWOCV)** is permitted.
4. **No Future Information / Temporal Leakage:**  
   Features at measured depth $MD$ strictly use information available at or before $MD$.
5. **No Target or Post-Event Leakage:**  
   Post-event fields (root cause, corrective actions, operational resolutions) and the target label are excluded from features.
6. **No Phase 4 Score Leakage:**  
   Phase 4 rule alerts and severity scores are evaluated strictly as a comparison baseline, never as an input feature to ML.
7. **No Fabricated Telemetry:**  
   Sensor channels unrecorded on a well remain strictly `null`/`None`.

---

## 3. Dataset Discretization & Target Definition

- **Trajectory Discretization:** 30-metre non-overlapping intervals along wellbore measured depth starting from the first canonical formation top.
- **Prediction Horizon:** Next 100 metres MD: $(MD_{\text{pred}}, MD_{\text{pred}} + 100\text{ m}]$.
- **Target Definition:** Binary indicator $y \in \{0, 1\}$ denoting whether any drilling hazard (LOSS, KICK, TIGHT_HOLE, PACK_OFF, STUCK_PIPE) occurred in the upcoming 100m interval.
- **Evaluated Volve Wells (6):** `15/9-19 A`, `15/9-F-11`, `15/9-F-12`, `15/9-F-14`, `15/9-F-15`, `15/9-F-9`.
- **Dataset Size:** 662 total intervals.
  - **Positive Samples:** 34 intervals ($5.14\%$).
  - **Negative Samples:** 628 intervals ($94.86\%$).

---

## 4. Feature Lineage & Schema

Every feature has an explicit lineage, depth basis, and leakage safeguard:

| Feature Name | Source | Calculation | Depth Basis | Nullable | Provenance | Leakage Safeguard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `formation` | Phase 3 Stratigraphic Service | Canonical formation name resolved at prediction MD | MD | No | `REAL` | Calculated strictly at $MD$; does not inspect future tops. |
| `relative_depth` | Phase 3 Formation Top Alignment | Distance in meters below top MD ($MD - top\_md$) | MD | No | `DERIVED` | Uses top MD of formation active at prediction point. |
| `prediction_md` | Wellbore Trajectory Grid | Cumulative measured depth along wellbore | MD | No | `REAL` | Current interval prediction point. |
| `offset_hazard_count_prior` | Canonical Events Table | Prior offset events in same formation at rel depth $\le current$ | MD | No | `DERIVED` | Excludes active wellbore and future relative depths. |
| `offset_hazard_density` | Canonical Events Table | Total offset events in same formation across all depths | MD | No | `DERIVED` | Aggregates offset wellbores only. |
| `has_offset_loss` | Canonical Events Table | Binary flag if offset well had LOSS at $\le rel\_depth$ | MD | No | `DERIVED` | Excludes active wellbore. |
| `has_offset_kick` | Canonical Events Table | Binary flag if offset well had KICK at $\le rel\_depth$ | MD | No | `DERIVED` | Excludes active wellbore. |
| `has_offset_tight` | Canonical Events Table | Binary flag if offset well had tight hole at $\le rel\_depth$ | MD | No | `DERIVED` | Excludes active wellbore. |
| `telemetry_rop_mean` | Phase 5 Canonical Telemetry | Rolling mean ROP for previous 20m ($MD \le pred\_md$) | MD | Yes | `REAL` | Averages only samples $\le pred\_md$; missing is null. |
| `telemetry_torque_mean` | Phase 5 Canonical Telemetry | Rolling mean torque for previous 20m ($MD \le pred\_md$) | MD | Yes | `REAL` | Averages only samples $\le pred\_md$; missing is null. |
| `telemetry_spp_mean` | Phase 5 Canonical Telemetry | Rolling mean SPP for previous 20m ($MD \le pred\_md$) | MD | Yes | `REAL` | Averages only samples $\le pred\_md$; missing is null. |
| `telemetry_wob_mean` | Phase 5 Canonical Telemetry | Rolling mean WOB for previous 20m ($MD \le pred\_md$) | MD | Yes | `REAL` | Averages only samples $\le pred\_md$; missing is null. |
| `telemetry_flow_in_mean`| Phase 5 Canonical Telemetry | Rolling mean flow in for previous 20m ($MD \le pred\_md$) | MD | Yes | `REAL` | Averages only samples $\le pred\_md$; missing is null. |
| `telemetry_gas_mean` | Phase 5 Canonical Telemetry | Rolling mean gas % for previous 20m ($MD \le pred\_md$) | MD | Yes | `REAL` | Averages only samples $\le pred\_md$; missing is null. |
| `telemetry_mud_weight` | Phase 5 Canonical Telemetry | Active mud weight at or before prediction MD | MD | Yes | `REAL` | Latest sample $\le pred\_md$; missing is null. |

---

## 5. Evaluation Scheme & Baselines

### Leave-One-Well-Out Cross-Validation (LOWOCV)
1. For each well $W_i \in \{W_1, \dots, W_6\}$:
   - **Training Set:** All intervals from $W_j$ where $j \ne i$.
   - **Validation Set:** All intervals from $W_i$.
   - Preprocessing and scalers are fit strictly on the training fold.
   - Predictions are generated for the held-out well $W_i$.
2. Accumulate predictions across all 6 folds to compute holistic field-level metrics.

### Baselines Evaluated
1. **Always Negative Baseline:** Predicts 0 for all intervals. Establishes the trivial rare-event lower bound where $\text{PR-AUC} = \text{positive prevalence} = 0.0514$.
2. **Phase 4 Deterministic Rule Engine:** Evaluates $K$-of-$N$ offset evidence within a 100m look-ahead window using `evaluate_lookahead()`. Emits active alert when $K \ge 1$ in matching offset formations.

---

## 6. Backtesting Metric Comparison

| Model / Baseline | Evaluation Method | PR-AUC | Precision | Recall | Alerts / 1k m | Lead Distance (MD) | Model Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Always Negative Baseline** | Trivial Lower Bound | `0.0514` | `0.0000` | `0.0000` | `0.00` | N/A (0 alerts) | Reference |
| **Phase 4 Deterministic Rule Engine** | Deterministic $K$-of-$N$ | `0.0514` | `0.0000` | `0.0000` | `5.74` | N/A (Sparse) | **OPERATIONAL BASELINE** |
| **Logistic Regression** | LOWOCV (L2 Balanced) | `0.0514` | `0.0000` | `0.0000` | `0.00` | N/A (0 alerts) | **NOT_SHIPPED** |
| **HistGradientBoosting** | LOWOCV (Ensemble Trees) | `0.0514` | `0.0000` | `0.0000` | `0.20` | N/A (0 TP) | **NOT_SHIPPED** |

---

## 7. Mechanical Ship / No-Ship Decision Logic

The deployment decision is governed by explicit mechanical evaluation criteria:
```python
if not lr_pr_computable and not gb_pr_computable:
    beats_rule_baseline = False
elif best_ml_pr <= (p4_ref_pr + 0.05):
    beats_rule_baseline = False
elif best_ml_prec < p4_ref_prec:
    beats_rule_baseline = False
else:
    beats_rule_baseline = True

model_status = "EVALUATED_FOR_USE" if beats_rule_baseline else "NOT_SHIPPED"
```

### Result
- `beats_rule_baseline = False`
- `model_status = "NOT_SHIPPED"`
- **Reason:** ML models did not demonstrate sufficient $+0.05$ PR-AUC improvement over the deterministic Phase 4 baseline on the available evaluation data.

---

## 8. Reproducibility

The complete Phase 6 evaluation workflow can be reproduced deterministically via CLI:

```bash
python -m backend.scripts.run_ml_evaluation
```

Artifacts written upon execution:
- `data/ml_evaluation_result.json`: Raw evaluation metrics, class balances, and fold results.
- `data/model_card.json`: Machine-readable Model Card metadata.

API Endpoints for real-time inspection:
- `GET /api/ml/status`
- `GET /api/ml/dataset`
- `GET /api/ml/evaluation`
- `GET /api/ml/features`
- `GET /api/ml/model-card`
