"""
NWIS ML Evaluation, Backtesting & Rule Comparison Service — Phase 6
Implements Leave-One-Well-Out Cross-Validation (LOWOCV), Baselines, Logistic Regression,
Gradient Boosting, Leakage-Safe Metrics (PR-AUC, Lead Distance, Alerts/1000m), and Mechanical Ship Decision.
"""

import math
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score, precision_score, recall_score, f1_score, average_precision_score

from .ml_dataset_service import (
    build_evaluation_dataset,
    validate_dataset_leakage,
    FEATURE_LINEAGE
)
from .lookahead_service import evaluate_lookahead


NUMERICAL_FEATURE_NAMES = [
    "relative_depth",
    "prediction_md",
    "offset_hazard_count_prior",
    "offset_hazard_density",
    "has_offset_loss",
    "has_offset_kick",
    "has_offset_tight",
    "telemetry_rop_mean",
    "telemetry_torque_mean",
    "telemetry_spp_mean",
    "telemetry_wob_mean",
    "telemetry_flow_in_mean",
    "telemetry_gas_mean",
    "telemetry_mud_weight"
]

CATEGORICAL_FEATURE_NAMES = [
    "formation"
]


def _build_feature_matrices(rows: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], np.ndarray, List[str]]:
    """
    Extracts feature dictionaries, target array, and well ID array from dataset rows.
    """
    X_dicts = []
    y_list = []
    wells = []

    for r in rows:
        feat = r["features"].copy()
        X_dicts.append(feat)
        y_list.append(int(r["target_hazard_next_100m"]))
        wells.append(r["well_id"])

    return X_dicts, np.array(y_list, dtype=int), wells


def _create_preprocessing_pipeline() -> ColumnTransformer:
    """
    Constructs a deterministic column transformer for tabular features.
    Categoricals: One-hot encoded (ignore unseen categories in test fold).
    Numericals: Constant imputed (fill 0.0 for missing/unrecorded telemetry) and standard scaled.
    """
    num_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="constant", fill_value=0.0, keep_empty_features=True)),
        ("scaler", StandardScaler())
    ])

    cat_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN", keep_empty_features=True)),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_transformer, NUMERICAL_FEATURE_NAMES),
            ("cat", cat_transformer, CATEGORICAL_FEATURE_NAMES)
        ],
        remainder="drop"
    )
    return preprocessor


def _calculate_pr_auc(y_true: np.ndarray, y_scores: np.ndarray) -> Tuple[Optional[float], bool, Optional[str]]:
    """
    Calculates PR-AUC (Average Precision) safely.
    If no positives or only single class in y_true, returns not computable.
    """
    pos_count = int(np.sum(y_true))
    if pos_count == 0:
        return None, False, "Not computable — zero positive samples in evaluation set."
    if pos_count == len(y_true):
        return None, False, "Not computable — all samples are positive."

    try:
        # Check if all scores are identical
        if np.all(y_scores == y_scores[0]):
            # Baseline prevalence
            base_prev = round(pos_count / len(y_true), 4)
            return base_prev, True, None

        score = float(average_precision_score(y_true, y_scores))
        if math.isnan(score):
            return None, False, "Not computable — precision-recall score undefined."
        return round(score, 4), True, None
    except Exception as e:
        return None, False, f"Not computable — {str(e)}"


def _calculate_roc_auc(y_true: np.ndarray, y_scores: np.ndarray) -> Optional[float]:
    """Calculates ROC-AUC if computable."""
    pos_count = int(np.sum(y_true))
    if pos_count == 0 or pos_count == len(y_true):
        return None
    try:
        score = float(roc_auc_score(y_true, y_scores))
        return round(score, 4) if not math.isnan(score) else None
    except Exception:
        return None


def _calculate_lead_distance(
    rows: List[Dict[str, Any]],
    y_preds: np.ndarray,
    all_events: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculates lead distance in meters (MD) for all true-positive predictions.
    Lead distance = actual_event_md - prediction_md.
    Strictly ensures only positive distances (predictions made BEFORE the event) are included.
    """
    lead_distances_m: List[float] = []

    for i, row in enumerate(rows):
        # We only measure lead distance for true positive alert intervals
        if y_preds[i] == 1 and row["target_hazard_next_100m"] == 1:
            wb_id = row["wellbore_id"]
            pred_md = row["prediction_md"]
            horizon_end = pred_md + 100.0

            # Find matching events in window (pred_md, horizon_end]
            matching_events = [
                e for e in all_events
                if e["wellbore_id"] == wb_id
                and e["md"] is not None
                and pred_md < float(e["md"]) <= horizon_end
            ]

            for ev in matching_events:
                lead = float(ev["md"]) - pred_md
                if lead > 0:
                    lead_distances_m.append(round(lead, 1))

    if not lead_distances_m:
        return {
            "count": 0,
            "mean_m": None,
            "median_m": None,
            "min_m": None,
            "max_m": None,
            "depth_basis": "MD",
            "computable": False,
            "reason": "Not computable — zero true positive alert intervals."
        }

    return {
        "count": len(lead_distances_m),
        "mean_m": round(float(np.mean(lead_distances_m)), 1),
        "median_m": round(float(np.median(lead_distances_m)), 1),
        "min_m": round(float(np.min(lead_distances_m)), 1),
        "max_m": round(float(np.max(lead_distances_m)), 1),
        "depth_basis": "MD",
        "computable": True,
        "reason": None
    }


def run_full_ml_evaluation(
    conn: sqlite3.Connection,
    interval_size_m: float = 30.0,
    prediction_horizon_m: float = 100.0,
    target_event_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes full offline Leave-One-Well-Out Cross-Validation (LOWOCV) ML Evaluation.
    Evaluates:
    - Baseline 1: Always Negative
    - Baseline 2: Phase 4 Rule Engine
    - Model 1: Logistic Regression
    - Model 2: Gradient Boosting
    """
    # 1. Build dataset
    rows, dataset_meta = build_evaluation_dataset(
        conn,
        interval_size_m=interval_size_m,
        prediction_horizon_m=prediction_horizon_m,
        target_event_type=target_event_type
    )

    # 2. Automated Leakage Validation
    leakage_check = validate_dataset_leakage(rows)
    if not leakage_check["passed"]:
        raise ValueError(f"Leakage validation failed: {leakage_check['violations']}")

    all_events_raw = conn.execute("SELECT * FROM events WHERE excluded = 0").fetchall()
    all_events = [dict(r) for r in all_events_raw]

    wells_list = dataset_meta["wells_represented"]
    total_samples = len(rows)
    total_drilled_m = total_samples * interval_size_m
    thousands_m = total_drilled_m / 1000.0 if total_drilled_m > 0 else 1.0

    y_true = np.array([r["target_hazard_next_100m"] for r in rows], dtype=int)

    # ----------------------------------------------------
    # BASELINE 1: Always Negative
    # ----------------------------------------------------
    b1_scores = np.zeros(total_samples, dtype=float)
    b1_preds = np.zeros(total_samples, dtype=int)
    b1_pr_auc, b1_pr_computable, b1_pr_reason = _calculate_pr_auc(y_true, b1_scores)
    b1_lead = _calculate_lead_distance(rows, b1_preds, all_events)

    baseline1_metrics = {
        "model_name": "Always Negative Baseline",
        "pr_auc": b1_pr_auc,
        "roc_auc": _calculate_roc_auc(y_true, b1_scores),
        "precision": 0.0,
        "recall": 0.0,
        "f1_score": 0.0,
        "alert_count": 0,
        "alerts_per_1000m": 0.0,
        "lead_distance": b1_lead,
        "computable": True,
        "reason": "Trivial lower bound: predicts zero alerts for all intervals."
    }

    # ----------------------------------------------------
    # BASELINE 2: Phase 4 Rule Engine
    # ----------------------------------------------------
    p4_scores = np.zeros(total_samples, dtype=float)
    p4_preds = np.zeros(total_samples, dtype=int)

    for i, r in enumerate(rows):
        wb_id = r["wellbore_id"]
        pred_md = r["prediction_md"]

        # Call the existing deterministic lookahead service
        res = evaluate_lookahead(
            conn,
            wellbore_id=wb_id,
            current_md=pred_md,
            lookahead_m=prediction_horizon_m,
            radius_km=5.0,
            include_unreviewed=True
        )

        alerts = res.get("alerts", [])
        # Phase 4 triggers an alert if k >= 1 in matching offset evidence
        active_alerts = [a for a in alerts if a.get("k", 0) >= 1 or a.get("severity") in ("OBSERVED", "REPEATED")]
        if active_alerts:
            p4_preds[i] = 1
            # Confidence score proportional to highest k/n coverage
            best_k = max(a.get("k", 1) for a in active_alerts)
            best_n = max(a.get("n", 1) for a in active_alerts)
            p4_scores[i] = round(best_k / max(1, best_n), 3)
        else:
            p4_preds[i] = 0
            p4_scores[i] = 0.0

    p4_pr_auc, p4_pr_computable, p4_pr_reason = _calculate_pr_auc(y_true, p4_scores)
    p4_lead = _calculate_lead_distance(rows, p4_preds, all_events)
    p4_alert_count = int(np.sum(p4_preds))
    p4_prec = float(precision_score(y_true, p4_preds, zero_division=0))
    p4_rec = float(recall_score(y_true, p4_preds, zero_division=0))
    p4_f1 = float(f1_score(y_true, p4_preds, zero_division=0))

    baseline2_metrics = {
        "model_name": "Phase 4 Deterministic K-of-N Rule Engine",
        "pr_auc": p4_pr_auc,
        "roc_auc": _calculate_roc_auc(y_true, p4_scores),
        "precision": round(p4_prec, 4),
        "recall": round(p4_rec, 4),
        "f1_score": round(p4_f1, 4),
        "alert_count": p4_alert_count,
        "alerts_per_1000m": round(p4_alert_count / thousands_m, 2),
        "lead_distance": p4_lead,
        "computable": p4_pr_computable,
        "reason": p4_pr_reason or "Operational baseline derived strictly from offset evidence matching."
    }

    # ----------------------------------------------------
    # LEAVE-ONE-WELL-OUT CROSS-VALIDATION (LOWOCV)
    # Model 1: Logistic Regression
    # Model 2: Gradient Boosting
    # ----------------------------------------------------
    lr_scores = np.zeros(total_samples, dtype=float)
    lr_preds = np.zeros(total_samples, dtype=int)

    gb_scores = np.zeros(total_samples, dtype=float)
    gb_preds = np.zeros(total_samples, dtype=int)

    # Convert rows to tabular data format
    import pandas as pd
    df_rows = []
    for r in rows:
        row_dict = r["features"].copy()
        row_dict["well_id"] = r["well_id"]
        row_dict["target"] = r["target_hazard_next_100m"]
        df_rows.append(row_dict)
    df = pd.DataFrame(df_rows)

    # Execute LOWOCV loop
    for held_out_well in wells_list:
        train_mask = (df["well_id"] != held_out_well).values
        val_mask = (df["well_id"] == held_out_well).values

        if not np.any(val_mask):
            continue

        X_train_df = df.loc[train_mask, NUMERICAL_FEATURE_NAMES + CATEGORICAL_FEATURE_NAMES]
        y_train = df.loc[train_mask, "target"].values.astype(int)

        X_val_df = df.loc[val_mask, NUMERICAL_FEATURE_NAMES + CATEGORICAL_FEATURE_NAMES]

        # Check if train set has at least 1 positive and 1 negative
        if len(np.unique(y_train)) < 2:
            # Cannot fit binary classifier; fallback to constant prior
            val_indices = np.where(val_mask)[0]
            lr_scores[val_indices] = 0.0
            lr_preds[val_indices] = 0
            gb_scores[val_indices] = 0.0
            gb_preds[val_indices] = 0
            continue

        # Pipeline 1: Logistic Regression
        lr_pipe = Pipeline(steps=[
            ("preprocessor", _create_preprocessing_pipeline()),
            ("classifier", LogisticRegression(random_state=42, max_iter=1000, class_weight="balanced"))
        ])
        lr_pipe.fit(X_train_df, y_train)
        lr_val_proba = lr_pipe.predict_proba(X_val_df)[:, 1]

        # Pipeline 2: Gradient Boosting (HistGradientBoostingClassifier)
        gb_pipe = Pipeline(steps=[
            ("preprocessor", _create_preprocessing_pipeline()),
            ("classifier", HistGradientBoostingClassifier(random_state=42, max_iter=100, class_weight="balanced"))
        ])
        gb_pipe.fit(X_train_df, y_train)
        gb_val_proba = gb_pipe.predict_proba(X_val_df)[:, 1]

        # Assign predictions to held-out indices
        val_indices = np.where(val_mask)[0]
        lr_scores[val_indices] = lr_val_proba
        # Fixed operational decision threshold = 0.5
        lr_preds[val_indices] = (lr_val_proba >= 0.5).astype(int)

        gb_scores[val_indices] = gb_val_proba
        gb_preds[val_indices] = (gb_val_proba >= 0.5).astype(int)

    # ----------------------------------------------------
    # Model 1 Metrics: Logistic Regression
    # ----------------------------------------------------
    lr_pr_auc, lr_pr_computable, lr_pr_reason = _calculate_pr_auc(y_true, lr_scores)
    lr_lead = _calculate_lead_distance(rows, lr_preds, all_events)
    lr_alert_count = int(np.sum(lr_preds))
    lr_prec = float(precision_score(y_true, lr_preds, zero_division=0))
    lr_rec = float(recall_score(y_true, lr_preds, zero_division=0))
    lr_f1 = float(f1_score(y_true, lr_preds, zero_division=0))

    logistic_metrics = {
        "model_name": "Logistic Regression (LOWOCV)",
        "pr_auc": lr_pr_auc,
        "roc_auc": _calculate_roc_auc(y_true, lr_scores),
        "precision": round(lr_prec, 4),
        "recall": round(lr_rec, 4),
        "f1_score": round(lr_f1, 4),
        "alert_count": lr_alert_count,
        "alerts_per_1000m": round(lr_alert_count / thousands_m, 2),
        "lead_distance": lr_lead,
        "computable": lr_pr_computable,
        "reason": lr_pr_reason
    }

    # ----------------------------------------------------
    # Model 2 Metrics: Gradient Boosting
    # ----------------------------------------------------
    gb_pr_auc, gb_pr_computable, gb_pr_reason = _calculate_pr_auc(y_true, gb_scores)
    gb_lead = _calculate_lead_distance(rows, gb_preds, all_events)
    gb_alert_count = int(np.sum(gb_preds))
    gb_prec = float(precision_score(y_true, gb_preds, zero_division=0))
    gb_rec = float(recall_score(y_true, gb_preds, zero_division=0))
    gb_f1 = float(f1_score(y_true, gb_preds, zero_division=0))

    gb_metrics = {
        "model_name": "Gradient Boosting (LOWOCV)",
        "pr_auc": gb_pr_auc,
        "roc_auc": _calculate_roc_auc(y_true, gb_scores),
        "precision": round(gb_prec, 4),
        "recall": round(gb_rec, 4),
        "f1_score": round(gb_f1, 4),
        "alert_count": gb_alert_count,
        "alerts_per_1000m": round(gb_alert_count / thousands_m, 2),
        "lead_distance": gb_lead,
        "computable": gb_pr_computable,
        "reason": gb_pr_reason
    }

    # ----------------------------------------------------
    # MECHANICAL SHIP DECISION
    # ----------------------------------------------------
    # Criteria:
    # 1. Model must be computable.
    # 2. Model PR-AUC must strictly exceed Phase 4 rule baseline PR-AUC by at least +0.05 margin.
    # 3. Model precision at operational threshold must meet or exceed Phase 4 rule precision.
    p4_ref_pr = p4_pr_auc or 0.0
    p4_ref_prec = p4_prec or 0.0

    best_ml_pr = max(lr_pr_auc or 0.0, gb_pr_auc or 0.0)
    best_ml_prec = max(lr_prec, gb_prec)

    beats_rule_baseline = False
    decision_reasons = []

    if not lr_pr_computable and not gb_pr_computable:
        beats_rule_baseline = False
        decision_reasons.append("ML models are not computable due to sparse target observations in LOWOCV folds.")
    elif best_ml_pr <= (p4_ref_pr + 0.05):
        beats_rule_baseline = False
        decision_reasons.append(
            f"ML models (Best PR-AUC {best_ml_pr:.4f}) did not demonstrate measurable +0.05 PR-AUC improvement over Phase 4 rule baseline (PR-AUC {p4_ref_pr:.4f})."
        )
    elif best_ml_prec < p4_ref_prec:
        beats_rule_baseline = False
        decision_reasons.append(
            f"ML model precision ({best_ml_prec:.4f}) is lower than Phase 4 rule baseline precision ({p4_ref_prec:.4f})."
        )
    else:
        beats_rule_baseline = True
        decision_reasons.append(
            f"ML models outperformed Phase 4 rule baseline with PR-AUC {best_ml_pr:.4f} vs {p4_ref_pr:.4f} and Precision {best_ml_prec:.4f}."
        )

    model_status = "EVALUATED_FOR_USE" if beats_rule_baseline else "NOT_SHIPPED"
    status_reason = (
        "ML evaluated for use behind explicit evaluated-model status."
        if beats_rule_baseline
        else "ML did not demonstrate sufficient improvement over the deterministic Phase 4 baseline on the available evaluation data."
    )

    limitations = [
        "Volve is a public North Sea prototype dataset (Block 15/9) and is not evidence of equivalent event frequencies or model performance for Oil India operations.",
        "Model trained strictly offline on 6 Volve wellbores; no real-time Oil India / eRTMAC telemetry or drilling events are included.",
        "Deterministic Phase 4 K-of-N offset rule engine remains the primary operational baseline.",
        "Predictions reflect cross-validated retrospective backtesting and must not be used as autonomous operational instructions."
    ]

    timestamp_str = datetime.now(timezone.utc).isoformat()

    evaluation_result = {
        "dataset": "VOLVE_PUBLIC",
        "provenance": "REAL",
        "evaluation_method": "LEAVE_ONE_WELL_OUT",
        "target_event": target_event_type or "ANY_HAZARD",
        "prediction_horizon_m": prediction_horizon_m,
        "interval_size_m": interval_size_m,
        "evaluated_wells": wells_list,
        "total_intervals": total_samples,
        "positive_samples": int(np.sum(y_true)),
        "negative_samples": int(total_samples - np.sum(y_true)),
        "baselines": {
            "always_negative": baseline1_metrics,
            "phase4_rule": baseline2_metrics
        },
        "models": {
            "logistic_regression": logistic_metrics,
            "gradient_boosting": gb_metrics
        },
        "beats_rule_baseline": beats_rule_baseline,
        "model_status": model_status,
        "status_reason": status_reason,
        "decision_details": decision_reasons,
        "limitations": limitations,
        "timestamp": timestamp_str
    }

    return evaluation_result


def get_model_card(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Generates structured Model Card document and metadata for Phase 6.
    """
    eval_res = run_full_ml_evaluation(conn)

    return {
        "model_card_version": "1.0.0",
        "model_name": "NWIS Phase 6 Hazard Look-Ahead Evaluator",
        "dataset_identity": "Equinor Volve Field Open Data (Block 15/9)",
        "provenance": "REAL",
        "evaluated_wells": eval_res["evaluated_wells"],
        "target_definition": f"Occurrence of drilling hazard ({eval_res['target_event']}) in upcoming (MD, MD + {eval_res['prediction_horizon_m']}m]",
        "interval_definition": f"{eval_res['interval_size_m']}-metre non-overlapping prediction points along wellbore trajectory",
        "cross_validation_scheme": "Leave-One-Well-Out Cross-Validation (LOWOCV)",
        "leakage_safeguards": [
            "Strict Leave-One-Well-Out fold splitting (zero wellbore overlap between train and validation)",
            "Temporal/depth boundary enforcement (features computed strictly at MD <= prediction_md)",
            "Offset hazard filtering strictly excludes active wellbore and excludes future relative depths",
            "Rolling telemetry statistics window restricted to past 20m (sample_md <= prediction_md)",
            "Target labels and post-event fields strictly excluded from feature space",
            "Phase 4 rule engine alerts strictly segregated as comparison baseline, not ML inputs"
        ],
        "features_documented": FEATURE_LINEAGE,
        "baselines_evaluated": [
            "Always Negative (trivial zero-alert lower bound)",
            "Phase 4 Deterministic K-of-N Offset Evidence Rule Engine"
        ],
        "models_evaluated": [
            "Logistic Regression (L2 regularized, balanced class weight, LOWOCV)",
            "HistGradientBoostingClassifier (Tree-based ensemble, LOWOCV)"
        ],
        "evaluation_summary": {
            "total_intervals": eval_res["total_intervals"],
            "positive_samples": eval_res["positive_samples"],
            "negative_samples": eval_res["negative_samples"],
            "phase4_rule_pr_auc": eval_res["baselines"]["phase4_rule"]["pr_auc"],
            "logistic_pr_auc": eval_res["models"]["logistic_regression"]["pr_auc"],
            "gradient_boosting_pr_auc": eval_res["models"]["gradient_boosting"]["pr_auc"]
        },
        "ship_decision": eval_res["model_status"],
        "ship_decision_reason": eval_res["status_reason"],
        "operational_limitations": eval_res["limitations"]
    }
