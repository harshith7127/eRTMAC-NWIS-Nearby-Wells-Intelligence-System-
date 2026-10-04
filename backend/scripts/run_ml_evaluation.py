"""
NWIS Reproducible ML Evaluation & Backtesting CLI Runner — Phase 6
Executes full offline Leave-One-Well-Out Cross-Validation (LOWOCV) on canonical Volve dataset.
Outputs evaluation artifacts and machine-readable model card metadata.

Usage:
    python -m backend.scripts.run_ml_evaluation
"""

import os
import json
import sqlite3
from datetime import datetime, timezone

from backend.app.services.ml_dataset_service import build_evaluation_dataset, validate_dataset_leakage
from backend.app.services.ml_evaluation_service import run_full_ml_evaluation, get_model_card


def main():
    print("=" * 70)
    print("NWIS PHASE 6 — OFFLINE ML EVALUATION & LEAKAGE-SAFE BACKTESTING")
    print("=" * 70)

    db_path = os.path.abspath("data/nwis.db")
    if not os.path.exists(db_path):
        print(f"[ERROR] Database file not found at {db_path}")
        return 1

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    print(f"[*] Database: {db_path}")
    print("[*] Step 1/6: Building 30m Discretized Dataset with Next-100m Target...")
    rows, metadata = build_evaluation_dataset(conn)
    print(f"    - Total Intervals: {metadata['total_intervals']}")
    print(f"    - Positive Samples: {metadata['positive_samples']} ({metadata['positive_rate_pct']}%)")
    print(f"    - Negative Samples: {metadata['negative_samples']}")
    print(f"    - Wells Represented ({len(metadata['wells_represented'])}): {', '.join(metadata['wells_represented'])}")

    print("[*] Step 2/6: Executing Automated Leakage Checks...")
    leakage = validate_dataset_leakage(rows)
    if leakage["passed"]:
        print(f"    [PASSED] Leakage Validation: {leakage['total_rows_validated']} rows verified free of future/post-event leakage.")
    else:
        print(f"    [FAILED] Leakage Violations Found: {len(leakage['violations'])}")
        for v in leakage["violations"][:5]:
            print(f"      - {v}")
        return 1

    print("[*] Step 3/6: Evaluating Baseline 1 (Always Negative) & Baseline 2 (Phase 4 Rule Engine)...")
    print("[*] Step 4/6: Training & Backtesting Model 1 (Logistic Regression) with LOWOCV...")
    print("[*] Step 5/6: Training & Backtesting Model 2 (Gradient Boosting) with LOWOCV...")
    eval_result = run_full_ml_evaluation(conn)

    print("\n" + "=" * 70)
    print("EVALUATION METRIC COMPARISON")
    print("=" * 70)
    print(f"{'Model / Baseline':<40} | {'PR-AUC':<8} | {'Precision':<10} | {'Alerts/1k m':<11} | {'Lead Dist (m)':<12}")
    print("-" * 70)

    # Baseline 1
    b1 = eval_result["baselines"]["always_negative"]
    b1_lead = b1["lead_distance"]["mean_m"] if b1["lead_distance"]["computable"] else "N/A"
    print(f"{b1['model_name']:<40} | {str(b1['pr_auc']):<8} | {str(b1['precision']):<10} | {str(b1['alerts_per_1000m']):<11} | {str(b1_lead):<12}")

    # Baseline 2 (Phase 4 Rule)
    p4 = eval_result["baselines"]["phase4_rule"]
    p4_lead = p4["lead_distance"]["mean_m"] if p4["lead_distance"]["computable"] else "N/A"
    print(f"{p4['model_name']:<40} | {str(p4['pr_auc']):<8} | {str(p4['precision']):<10} | {str(p4['alerts_per_1000m']):<11} | {str(p4_lead):<12}")

    # Model 1 (Logistic Regression)
    m1 = eval_result["models"]["logistic_regression"]
    m1_lead = m1["lead_distance"]["mean_m"] if m1["lead_distance"]["computable"] else "N/A"
    print(f"{m1['model_name']:<40} | {str(m1['pr_auc']):<8} | {str(m1['precision']):<10} | {str(m1['alerts_per_1000m']):<11} | {str(m1_lead):<12}")

    # Model 2 (Gradient Boosting)
    m2 = eval_result["models"]["gradient_boosting"]
    m2_lead = m2["lead_distance"]["mean_m"] if m2["lead_distance"]["computable"] else "N/A"
    print(f"{m2['model_name']:<40} | {str(m2['pr_auc']):<8} | {str(m2['precision']):<10} | {str(m2['alerts_per_1000m']):<11} | {str(m2_lead):<12}")

    print("-" * 70)
    print(f"SHIP DECISION:         {eval_result['model_status']}")
    print(f"BEATS RULE BASELINE:   {eval_result['beats_rule_baseline']}")
    print(f"REASON:                {eval_result['status_reason']}")
    print("=" * 70)

    print("[*] Step 6/6: Writing Evaluation Artifacts & Model Card Metadata...")
    out_dir = os.path.abspath("data")
    os.makedirs(out_dir, exist_ok=True)

    eval_artifact_path = os.path.join(out_dir, "ml_evaluation_result.json")
    with open(eval_artifact_path, "w", encoding="utf-8") as f:
        json.dump(eval_result, f, indent=2)
    print(f"    -> Written: {eval_artifact_path}")

    model_card = get_model_card(conn)
    model_card_path = os.path.join(out_dir, "model_card.json")
    with open(model_card_path, "w", encoding="utf-8") as f:
        json.dump(model_card, f, indent=2)
    print(f"    -> Written: {model_card_path}")

    print("\n[SUCCESS] Phase 6 ML Evaluation completed deterministically.")
    conn.close()
    return 0


if __name__ == "__main__":
    exit(main())
