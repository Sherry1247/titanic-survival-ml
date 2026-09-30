"""Training and inference utilities for the Titanic game."""

from dataclasses import dataclass

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
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
