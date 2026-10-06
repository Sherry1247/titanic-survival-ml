"""Training and inference utilities for the Titanic game."""

from dataclasses import dataclass

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.base import clone
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .data import model_frame


@dataclass
class ModelBundle:
    name: str
    pipeline: Pipeline
    metrics: dict[str, float]


def _preprocessor() -> ColumnTransformer:
    categorical = ["Sex", "Embarked", "Title", "Deck"]
    numeric = ["Pclass", "Age", "SibSp", "Parch", "Fare", "FamilySize", "IsAlone", "FarePerPerson", "IsChild"]
    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]), numeric),
            ("categorical", Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]), categorical),
        ]
    )


def _pipeline(estimator) -> Pipeline:
    return Pipeline([("features", _preprocessor()), ("model", estimator)])


def train_models(df: pd.DataFrame, random_state: int = 42) -> dict[str, ModelBundle]:
    """Train transparent and nonlinear baselines on a stratified holdout."""
    X, y = model_frame(df), df["Survived"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )
    candidates = {
        "Logistic regression": _pipeline(LogisticRegression(max_iter=1000, random_state=random_state)),
        "Random forest": _pipeline(RandomForestClassifier(
            n_estimators=350, min_samples_leaf=3, random_state=random_state, class_weight="balanced"
        )),
    }
    bundles = {}
    for name, pipeline in candidates.items():
        pipeline.fit(X_train, y_train)
        probability = pipeline.predict_proba(X_test)[:, 1]
        prediction = (probability >= 0.5).astype(int)
        bundles[name] = ModelBundle(name, pipeline, {
            "accuracy": float(accuracy_score(y_test, prediction)),
            "f1": float(f1_score(y_test, prediction)),
            "roc_auc": float(roc_auc_score(y_test, probability)),
        })
    return bundles


def evaluate_models(
    df: pd.DataFrame,
    random_state: int = 42,
    folds: int = 5,
) -> tuple[dict[str, dict], dict[str, list[float]]]:
    """Evaluate both models with stratified out-of-fold predictions.

    The returned probabilities are out-of-fold estimates: every passenger is
    scored by a model that was not trained on that passenger.  They are useful
    for honest in-sample exploration, but are not prospective validation.
    """
    X, y = model_frame(df), df["Survived"].astype(int)
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=random_state)
    candidates = {
        "Logistic regression": _pipeline(LogisticRegression(max_iter=1000, random_state=random_state)),
        "Random forest": _pipeline(RandomForestClassifier(
            n_estimators=350,
            min_samples_leaf=3,
            random_state=random_state,
            class_weight="balanced",
        )),
    }
    reports: dict[str, dict] = {}
    probabilities: dict[str, list[float]] = {}

    for name, template in candidates.items():
        oof_probability = pd.Series(index=df.index, dtype=float)
        fold_metrics: list[dict[str, float]] = []
        for train_index, test_index in splitter.split(X, y):
            pipeline = clone(template)
            pipeline.fit(X.iloc[train_index], y.iloc[train_index])
            probability = pipeline.predict_proba(X.iloc[test_index])[:, 1]
            prediction = (probability >= 0.5).astype(int)
            oof_probability.iloc[test_index] = probability
            fold_metrics.append({
                "accuracy": float(accuracy_score(y.iloc[test_index], prediction)),
                "f1": float(f1_score(y.iloc[test_index], prediction)),
                "roc_auc": float(roc_auc_score(y.iloc[test_index], probability)),
                "precision": float(precision_score(y.iloc[test_index], prediction)),
                "recall": float(recall_score(y.iloc[test_index], prediction)),
                "brier": float(brier_score_loss(y.iloc[test_index], probability)),
            })

        probability_values = oof_probability.to_numpy()
        prediction_values = (probability_values >= 0.5).astype(int)
        metric_frame = pd.DataFrame(fold_metrics)
        tn, fp, fn, tp = confusion_matrix(y, prediction_values).ravel()
        calibration = []
        bins = pd.cut(probability_values, bins=[0, .2, .4, .6, .8, 1], include_lowest=True)
        calibration_frame = pd.DataFrame({"probability": probability_values, "outcome": y, "bin": bins})
        for interval, group in calibration_frame.groupby("bin", observed=True):
            calibration.append({
                "range": str(interval),
                "count": int(len(group)),
                "predicted": float(group["probability"].mean()),
                "observed": float(group["outcome"].mean()),
            })

        reports[name] = {
            "method": f"{folds}-fold stratified cross-validation",
            "folds": folds,
            "metrics": {
                metric: {
                    "mean": float(metric_frame[metric].mean()),
                    "std": float(metric_frame[metric].std(ddof=1)),
                }
                for metric in metric_frame.columns
            },
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "calibration": calibration,
        }
        probabilities[name] = [float(value) for value in probability_values]

    majority = int(y.mode().iloc[0])
    baseline_prediction = pd.Series(majority, index=y.index)
    baseline_probability = pd.Series(float(y.mean()), index=y.index)
    reports["Majority baseline"] = {
        "method": "constant majority-class prediction",
        "metrics": {
            "accuracy": {"mean": float(accuracy_score(y, baseline_prediction)), "std": 0.0},
            "f1": {"mean": float(f1_score(y, baseline_prediction, zero_division=0)), "std": 0.0},
            "roc_auc": {"mean": 0.5, "std": 0.0},
            "precision": {"mean": float(precision_score(y, baseline_prediction, zero_division=0)), "std": 0.0},
            "recall": {"mean": float(recall_score(y, baseline_prediction, zero_division=0)), "std": 0.0},
            "brier": {"mean": float(brier_score_loss(y, baseline_probability)), "std": 0.0},
        },
    }
    return reports, probabilities


def predict_survival(bundle: ModelBundle, passenger: pd.DataFrame) -> float:
    """Return survival probability for one or more passenger rows."""
    return float(bundle.pipeline.predict_proba(model_frame(passenger))[:, 1][0])


def explanation_frame(bundle: ModelBundle, passenger: pd.DataFrame | None = None) -> pd.DataFrame:
    """Return a compact explanation table for the selected model."""
    transformer = bundle.pipeline.named_steps["features"]
    estimator = bundle.pipeline.named_steps["model"]
    names = transformer.get_feature_names_out()
    if hasattr(estimator, "coef_") and passenger is not None:
        values = transformer.transform(model_frame(passenger))[0]
        scores = values * estimator.coef_[0]
        frame = pd.DataFrame({"feature": names, "impact": scores})
        frame["direction"] = frame["impact"].map(lambda value: "supports survival" if value >= 0 else "lowers survival")
        return frame.reindex(frame["impact"].abs().sort_values(ascending=False).index).head(8)
    if hasattr(estimator, "coef_"):
        scores = estimator.coef_[0]
        frame = pd.DataFrame({"feature": names, "impact": scores})
        frame["direction"] = frame["impact"].map(lambda value: "supports survival" if value >= 0 else "lowers survival")
        return frame.reindex(frame["impact"].abs().sort_values(ascending=False).index).head(8)
    importances = getattr(estimator, "feature_importances_", None)
    if importances is None:
        return pd.DataFrame(columns=["feature", "impact", "direction"])
    frame = pd.DataFrame({"feature": names, "impact": importances})
    frame["direction"] = "global model importance"
    return frame.sort_values("impact", ascending=False).head(8)
