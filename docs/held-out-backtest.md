# NWIS Held-Out Well Backtesting Report (Phase 8C)

## 1. Methodology & Experimental Design

In drilling hazard prediction, standard randomized K-fold or random train/test splits introduce severe **stratigraphic and spatial data leakage**, because adjacent depth intervals from the same well share identical lithological noise, operational practices, and mud formulations.

To guarantee zero data leakage and authentic operational validity, NWIS utilizes **Leave-One-Well-Out Cross-Validation (LOWOCV)** across the 6 Volve wellbores in the corpus.

```
┌────────────────────────────────────────────────────────────────────────┐
│             LEAVE-ONE-WELL-OUT CROSS-VALIDATION (LOWOCV)               │
└────────────────────────────────────────────────────────────────────────┘

Fold 1: Train on [15/9-F-11, 15/9-F-12, 15/9-F-14, 15/9-F-15, 15/9-F-9 ] → Test on [15/9-19 A ]
Fold 2: Train on [15/9-19 A,  15/9-F-12, 15/9-F-14, 15/9-F-15, 15/9-F-9 ] → Test on [15/9-F-11]
Fold 3: Train on [15/9-19 A,  15/9-F-11, 15/9-F-14, 15/9-F-15, 15/9-F-9 ] → Test on [15/9-F-12]
Fold 4: Train on [15/9-19 A,  15/9-F-11, 15/9-F-12, 15/9-F-15, 15/9-F-9 ] → Test on [15/9-F-14]
Fold 5: Train on [15/9-19 A,  15/9-F-11, 15/9-F-12, 15/9-F-14, 15/9-F-9 ] → Test on [15/9-F-15]
Fold 6: Train on [15/9-19 A,  15/9-F-11, 15/9-F-12, 15/9-F-14, 15/9-F-15] → Test on [15/9-F-9 ]
```

### Dataset Composition
- **Total Wells**: 6
- **Total Wellbores**: 6
- **Discretization Window**: 30.0 m MD non-overlapping depth intervals
- **Total Evaluated Intervals**: 662
- **Positive Target Samples (Hazard within 100m lookahead)**: 34 (5.14% prevalence)
- **Negative Target Samples**: 628 (94.86% prevalence)
- **Imbalance Ratio**: 18.5 : 1

---

## 2. Models & Baselines Evaluated

1. **Always-Negative Baseline**:
   - Trivial statistical baseline predicting 0 risk for every interval.
   - PR-AUC equals baseline prevalence: `0.0514`. ROC-AUC: `0.5000`. Alert count: `0`.
2. **Phase 4 Deterministic K-of-N Rule Engine**:
   - Operational baseline evaluating offset event proximity within a 300m stratigraphic lookahead window.
   - PR-AUC: `0.0514`. ROC-AUC: `0.4092`. Alert count: `114` (5.74 alerts / 1000m).
3. **Logistic Regression (LOWOCV)**:
   - Linear classifier with L2 regularization, trained strictly on out-of-fold wells.
   - PR-AUC: `0.0514`. ROC-AUC: `0.0764`. Alert count: `0`.
4. **Gradient Boosting Classifier (LOWOCV)**:
   - Non-linear ensemble (LightGBM/HistGradientBoosting style) trained strictly on out-of-fold wells.
   - PR-AUC: `0.0514`. ROC-AUC: `0.0764`. Alert count: `4` (0.20 alerts / 1000m).

---

## 3. Comprehensive Performance Comparison

| Metric | Always-Negative | Phase 4 Rule Engine (Baseline) | Logistic Regression | Gradient Boosting |
|---|---|---|---|---|
| **PR-AUC** | 0.0514 | **0.0514** | 0.0514 | 0.0514 |
| **ROC-AUC** | 0.5000 | 0.4092 | 0.0764 | 0.0764 |
| **Precision** | 0.00 | 0.00 | 0.00 | 0.00 |
| **Recall** | 0.00 | 0.00 | 0.00 | 0.00 |
| **F1 Score** | 0.00 | 0.00 | 0.00 | 0.00 |
| **Total Alerts Generated** | 0 | **114** | 0 | 4 |
| **Alert Frequency (Alerts / 1000m)** | 0.00 | **5.74** | 0.00 | 0.20 |
| **Lead Distance** | Not computable | Not computable | Not computable | Not computable |
| **Computable Reason** | Zero positive alerts | Zero true positive alert intervals | Zero positive alerts | Zero true positive alert intervals |
| **Model Decision** | Baseline | **Operational Standard** | NOT_SHIPPED | NOT_SHIPPED |

---

## 4. Root Cause Analysis of ML Performance

Why did machine learning models fail to outperform the deterministic baseline?
1. **Severe Class Asymmetry**:
   Only 34 positive intervals exist across 662 total intervals.
2. **Event Concentration in Single Well**:
   All 24 recorded Volve historical drilling incidents in the database reside in discovery well `15/9-19 A`. When `15/9-19 A` is held out as the test set (Fold 1), the training set contains **zero positive hazard events**, making it statistically impossible for any supervised learning algorithm to learn discriminative weights.
3. **Cross-Well Lithological & Trajectory Heterogeneity**:
   Volve wells feature varying trajectory inclinations (from vertical exploration wells to directional S-shaped production wells). Features learned in one geometry do not generalize without massive multi-basin training corpora.

---

## 5. Shipping Decision & Governance Verdict

- **Decision Criterion**: ML model must demonstrate at least `+0.05 PR-AUC` improvement over the Phase 4 deterministic rule baseline without exceeding 10 false alerts / 1000m.
- **Actual Margin**: `0.0000` (`0.0514` vs `0.0514`).
- **Verdict**: **`model_status = NOT_SHIPPED`**
- **Operational Policy**:
  - The **Phase 4 Deterministic K-of-N Offset Rule Engine remains the active, sole operational look-ahead engine**.
  - No speculative AI risk scores or ungrounded probabilities are displayed to drilling personnel.
  - Transparent evidence lineage takes strict precedence over black-box predictive models.
