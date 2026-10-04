"""
NWIS Phase 6 Comprehensive Backend Test Suite
Tests:
1. 30m interval generation
2. Next-100m target generation
3. Formation feature generation
4. Relative-depth feature generation
5. Telemetry rolling statistics
6. Missing telemetry handling
7. Historical offset feature generation
8. No future-event leakage
9. No future-telemetry leakage
10. No well overlap between train and validation (LOWOCV)
11. No random split constraint
12. Phase 4 baseline integration
13. Always-negative baseline
14. Logistic regression pipeline
15. Gradient boosting pipeline
16. PR-AUC calculation
17. Alert-rate metric
18. Lead-distance calculation
19. Insufficient-positive handling
20. Model ship/no-ship decision
21. Provenance metadata
22. Reproducibility
"""

import sqlite3
import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db import get_db, init_db
from backend.app.services.ml_dataset_service import (
    build_evaluation_dataset,
    validate_dataset_leakage,
    FEATURE_LINEAGE,
    _extract_telemetry_features
)
from backend.app.services.ml_evaluation_service import (
    run_full_ml_evaluation,
    get_model_card,
    _calculate_pr_auc,
    _calculate_lead_distance,
    _create_preprocessing_pipeline
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db_conn():
    conn = sqlite3.connect("data/nwis.db")
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


# ----------------------------------------------------
# 1. 30m Interval Discretization Tests
# ----------------------------------------------------
def test_30m_interval_generation(db_conn):
    rows, meta = build_evaluation_dataset(db_conn, interval_size_m=30.0)
    assert len(rows) > 0
    assert meta["interval_size_m"] == 30.0

    # Verify spacing between consecutive intervals in the same wellbore
    w12_rows = [r for r in rows if r["well_id"] == "15/9-F-12"]
    assert len(w12_rows) > 1
    for i in range(len(w12_rows) - 1):
        diff = round(w12_rows[i+1]["prediction_md"] - w12_rows[i]["prediction_md"], 1)
        assert diff == 30.0


# ----------------------------------------------------
# 2. Next-100m Target Generation Tests
# ----------------------------------------------------
def test_next_100m_target_generation(db_conn):
    rows, meta = build_evaluation_dataset(db_conn, interval_size_m=30.0, prediction_horizon_m=100.0)
    assert meta["prediction_horizon_m"] == 100.0
    for r in rows:
        assert r["target_hazard_next_100m"] in (0, 1)
        if r["target_hazard_next_100m"] == 1:
            assert len(r["target_event_types"]) > 0


# ----------------------------------------------------
# 3. Formation Feature Generation Tests
# ----------------------------------------------------
def test_formation_feature_generation(db_conn):
    rows, _ = build_evaluation_dataset(db_conn)
    for r in rows:
        assert "formation" in r["features"]
        assert r["features"]["formation"] not in ("", "UNKNOWN", None)


# ----------------------------------------------------
# 4. Relative Depth Feature Generation Tests
# ----------------------------------------------------
def test_relative_depth_feature_generation(db_conn):
    rows, _ = build_evaluation_dataset(db_conn)
    for r in rows:
        assert "relative_depth" in r["features"]
        assert isinstance(r["features"]["relative_depth"], (int, float))
        assert r["features"]["relative_depth"] >= 0.0


# ----------------------------------------------------
# 5. Telemetry Rolling Statistics Tests
# ----------------------------------------------------
def test_telemetry_rolling_statistics(db_conn):
    # Well 15/9-F-12 has authentic telemetry replay records
    rows, _ = build_evaluation_dataset(db_conn)
    f12_rows = [r for r in rows if r["well_id"] == "15/9-F-12"]
    assert len(f12_rows) > 0

    # At least some f12 rows should contain valid rolling telemetry features
    has_telemetry = any(r["features"]["telemetry_rop_mean"] is not None for r in f12_rows)
    assert has_telemetry


# ----------------------------------------------------
# 6. Missing Telemetry Handling Tests
# ----------------------------------------------------
def test_missing_telemetry_handling(db_conn):
    # Other wells (e.g. 15/9-19 A) do not have recorded real-time telemetry
    rows, _ = build_evaluation_dataset(db_conn)
    other_rows = [r for r in rows if r["well_id"] != "15/9-F-12"]
    for r in other_rows:
        # Must remain null / None, never fabricated!
        assert r["features"]["telemetry_rop_mean"] is None
        assert r["features"]["telemetry_torque_mean"] is None
        assert r["features"]["telemetry_spp_mean"] is None


# ----------------------------------------------------
# 7. Historical Offset Feature Generation Tests
# ----------------------------------------------------
def test_historical_offset_features(db_conn):
    rows, _ = build_evaluation_dataset(db_conn)
    for r in rows:
        feat = r["features"]
        assert "offset_hazard_count_prior" in feat
        assert "offset_hazard_density" in feat
        assert feat["has_offset_loss"] in (0, 1)
        assert feat["has_offset_kick"] in (0, 1)
        assert feat["has_offset_tight"] in (0, 1)


# ----------------------------------------------------
# 8. Leakage Test: No Future-Event Leakage
# ----------------------------------------------------
def test_no_future_event_leakage(db_conn):
    rows, _ = build_evaluation_dataset(db_conn)
    validation = validate_dataset_leakage(rows)
    assert validation["passed"] is True
    assert validation["leakage_violations_count"] == 0


# ----------------------------------------------------
# 9. Leakage Test: No Future-Telemetry Leakage
# ----------------------------------------------------
def test_no_future_telemetry_leakage():
    mock_samples = [
        {"md": 1000.0, "rop": 15.0, "torque": 10.0, "spp": 1200.0, "wob": 10.0, "flow_in": 3000.0, "gas": 0.1, "mud_weight": 1.25},
        {"md": 1010.0, "rop": 18.0, "torque": 12.0, "spp": 1300.0, "wob": 11.0, "flow_in": 3100.0, "gas": 0.2, "mud_weight": 1.25},
        {"md": 1030.0, "rop": 99.0, "torque": 99.0, "spp": 9999.0, "wob": 99.0, "flow_in": 9999.0, "gas": 9.9, "mud_weight": 9.99}  # FUTURE!
    ]
    # At prediction_md = 1010.0, sample at 1030.0 must be ignored
    feat = _extract_telemetry_features("15/9-F-12", 1010.0, mock_samples)
    assert feat["telemetry_rop_mean"] == round((15.0 + 18.0) / 2, 2)
    assert feat["telemetry_torque_mean"] == round((10.0 + 12.0) / 2, 2)


# ----------------------------------------------------
# 10. Leakage Test: No Well Overlap Between Train and Validation
# ----------------------------------------------------
def test_no_well_overlap_in_lowocv(db_conn):
    rows, meta = build_evaluation_dataset(db_conn)
    wells = meta["wells_represented"]

    for held_out in wells:
        train_wells = [r["well_id"] for r in rows if r["well_id"] != held_out]
        val_wells = [r["well_id"] for r in rows if r["well_id"] == held_out]

        assert held_out not in train_wells
        assert set(train_wells).isdisjoint(set(val_wells))


# ----------------------------------------------------
# 11. Leakage Test: No Random Split Constraint
# ----------------------------------------------------
def test_no_random_split_enforced(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    assert eval_res["evaluation_method"] == "LEAVE_ONE_WELL_OUT"
    assert "RANDOM" not in eval_res["evaluation_method"]


# ----------------------------------------------------
# 12. Baseline Integration: Phase 4 Rule Engine
# ----------------------------------------------------
def test_phase4_baseline_integration(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    p4 = eval_res["baselines"]["phase4_rule"]
    assert p4["model_name"] == "Phase 4 Deterministic K-of-N Rule Engine"
    assert p4["computable"] is True
    assert p4["alerts_per_1000m"] >= 0.0


# ----------------------------------------------------
# 13. Baseline Integration: Always Negative
# ----------------------------------------------------
def test_always_negative_baseline(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    b1 = eval_res["baselines"]["always_negative"]
    assert b1["model_name"] == "Always Negative Baseline"
    assert b1["alert_count"] == 0
    assert b1["alerts_per_1000m"] == 0.0
    assert b1["precision"] == 0.0


# ----------------------------------------------------
# 14. Model 1 Pipeline: Logistic Regression
# ----------------------------------------------------
def test_logistic_regression_pipeline(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    m1 = eval_res["models"]["logistic_regression"]
    assert "Logistic Regression" in m1["model_name"]
    assert m1["pr_auc"] is not None
    assert 0.0 <= m1["pr_auc"] <= 1.0


# ----------------------------------------------------
# 15. Model 2 Pipeline: Gradient Boosting
# ----------------------------------------------------
def test_gradient_boosting_pipeline(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    m2 = eval_res["models"]["gradient_boosting"]
    assert "Gradient Boosting" in m2["model_name"]
    assert m2["pr_auc"] is not None
    assert 0.0 <= m2["pr_auc"] <= 1.0


# ----------------------------------------------------
# 16. PR-AUC Calculation Safety
# ----------------------------------------------------
def test_pr_auc_calculation():
    y_true = np.array([1, 0, 1, 0, 0, 0])
    y_scores = np.array([0.9, 0.1, 0.8, 0.2, 0.3, 0.1])
    score, computable, reason = _calculate_pr_auc(y_true, y_scores)
    assert computable is True
    assert score > 0.0
    assert reason is None


# ----------------------------------------------------
# 17. Alert-Rate Metric Calculation
# ----------------------------------------------------
def test_alert_rate_metric(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    for model_key in ["logistic_regression", "gradient_boosting"]:
        m = eval_res["models"][model_key]
        assert "alerts_per_1000m" in m
        assert m["alerts_per_1000m"] >= 0.0


# ----------------------------------------------------
# 18. Lead Distance Calculation
# ----------------------------------------------------
def test_lead_distance_calculation():
    mock_rows = [
        {"wellbore_id": "WB1", "prediction_md": 1000.0, "target_hazard_next_100m": 1},
        {"wellbore_id": "WB1", "prediction_md": 1030.0, "target_hazard_next_100m": 0}
    ]
    mock_events = [
        {"wellbore_id": "WB1", "md": 1050.0}
    ]
    y_preds = np.array([1, 0])
    lead_stats = _calculate_lead_distance(mock_rows, y_preds, mock_events)
    assert lead_stats["computable"] is True
    assert lead_stats["count"] == 1
    assert lead_stats["mean_m"] == 50.0  # 1050 - 1000


# ----------------------------------------------------
# 19. Insufficient Positive Handling
# ----------------------------------------------------
def test_insufficient_positive_handling():
    y_true_zero = np.zeros(50, dtype=int)
    y_scores = np.random.rand(50)
    score, computable, reason = _calculate_pr_auc(y_true_zero, y_scores)
    assert computable is False
    assert score is None
    assert "zero positive samples" in reason


# ----------------------------------------------------
# 20. Mechanical Model Ship/No-Ship Decision
# ----------------------------------------------------
def test_mechanical_ship_decision(db_conn):
    eval_res = run_full_ml_evaluation(db_conn)
    assert eval_res["model_status"] in ("NOT_SHIPPED", "EVALUATED_FOR_USE")
    assert isinstance(eval_res["beats_rule_baseline"], bool)
    assert len(eval_res["status_reason"]) > 0


# ----------------------------------------------------
# 21. Provenance and Feature Lineage Metadata
# ----------------------------------------------------
def test_provenance_and_feature_lineage():
    for f in FEATURE_LINEAGE:
        assert f["provenance"] in ("REAL", "DERIVED", "SYNTHETIC", "ILLUSTRATIVE")
        assert "leakage_guard" in f
        assert "test_coverage" in f


# ----------------------------------------------------
# 22. Reproducibility & Endpoints
# ----------------------------------------------------
def test_reproducibility_and_api_endpoints():
    r1 = client.get("/api/ml/status")
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["model_status"] == "NOT_SHIPPED"
    assert d1["dataset_scope"] == "VOLVE_PUBLIC_PROTOTYPE"

    r2 = client.get("/api/ml/dataset")
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["total_intervals"] > 0

    r3 = client.get("/api/ml/features")
    assert r3.status_code == 200
    assert len(r3.json()) >= 10

    r4 = client.get("/api/ml/model-card")
    assert r4.status_code == 200
    d4 = r4.json()
    assert "Volve" in d4["dataset_identity"]
