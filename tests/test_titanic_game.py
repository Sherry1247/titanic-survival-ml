from pathlib import Path
import sys

import pytest

APP_DIR = Path(__file__).resolve().parents[1] / "apps" / "titanic_survival_game"
sys.path.insert(0, str(APP_DIR))


def test_game_module_imports_without_optional_runtime():
    pytest.importorskip("pandas")
    from titanic_game.game import score_guess

    assert score_guess(1, 1) == 1
    assert score_guess(0, 1) == 0


def test_titanic_data_schema():
    pytest.importorskip("pandas")
    from titanic_game.data import load_titanic

    df = load_titanic()
    assert len(df) > 800
    assert {"Survived", "Pclass", "Sex", "Age"}.issubset(df.columns)


def test_cross_validated_model_report_has_calibration_and_baseline():
    pytest.importorskip("sklearn")
    from titanic_game.data import load_titanic
    from titanic_game.model import evaluate_models

    reports, probabilities = evaluate_models(load_titanic(), folds=3)
    assert {"Logistic regression", "Random forest", "Majority baseline"}.issubset(reports)
    assert len(probabilities["Logistic regression"]) == 891
    assert len(reports["Logistic regression"]["calibration"]) >= 4
    assert 0 <= reports["Logistic regression"]["metrics"]["brier"]["mean"] <= 1


def test_prepare_features_has_no_target_and_expected_columns():
    pytest.importorskip("pandas")
    from titanic_game.data import load_titanic, model_frame

    frame = model_frame(load_titanic())
    assert "Survived" not in frame.columns
    assert {"Title", "FamilySize", "IsAlone", "Deck", "IsChild"}.issubset(frame.columns)
    assert set(frame["Title"].unique()) <= {"Mr", "Miss", "Mrs", "Master", "Rare"}
    assert (frame["FamilySize"] >= 1).all()


def test_public_profile_hides_outcome_and_handles_missing_age():
    pytest.importorskip("pandas")
    from titanic_game.data import load_titanic
    from titanic_game.game import public_profile

    df = load_titanic()
    row = df[df["Age"].isna()].iloc[0]
    profile = public_profile(row)
    assert profile["Age"] is None
    assert "Survived" not in profile


def test_explanation_frame_for_both_models():
    pytest.importorskip("sklearn")
    from titanic_game.data import load_titanic
    from titanic_game.model import explanation_frame, train_models

    df = load_titanic()
    bundles = train_models(df)
    lr = explanation_frame(bundles["Logistic regression"], df.iloc[[0]])
    rf = explanation_frame(bundles["Random forest"])
    assert 0 < len(lr) <= 8 and {"feature", "impact", "direction"} <= set(lr.columns)
    assert 0 < len(rf) <= 8


def test_data_path_can_be_overridden(monkeypatch, tmp_path):
    pytest.importorskip("pandas")
    from titanic_game.data import default_data_path

    monkeypatch.setenv("TITANIC_DATA_PATH", str(tmp_path / "x.csv"))
    assert default_data_path() == tmp_path / "x.csv"
