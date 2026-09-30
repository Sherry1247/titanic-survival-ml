"""Data loading and leakage-safe feature preparation for Titanic."""

from pathlib import Path
import re

import pandas as pd

REQUIRED_COLUMNS = {
    "PassengerId", "Survived", "Pclass", "Name", "Sex", "Age", "SibSp",
    "Parch", "Ticket", "Fare", "Cabin", "Embarked",
}


def default_data_path() -> Path:
    return Path(__file__).resolve().parents[3] / "data" / "Kaggle_titanic_dataset" / "Titanic-Dataset.csv"


def _extract_title(name: str) -> str:
    match = re.search(r",\s*([^.]*)\.", str(name))
    title = match.group(1).strip() if match else "Unknown"
    common = {"Mlle": "Miss", "Ms": "Miss", "Mme": "Mrs"}
    return common.get(title, title if title in {"Mr", "Miss", "Mrs", "Master"} else "Rare")


def load_titanic(path: str | Path | None = None) -> pd.DataFrame:
    """Load and validate the project Titanic dataset."""
    csv_path = Path(path) if path else default_data_path()
    df = pd.read_csv(csv_path)
    missing = REQUIRED_COLUMNS.difference(df.columns)
    if missing:
        raise ValueError(f"Titanic dataset is missing columns: {sorted(missing)}")
    return df


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create deployable features without using the target or target-derived fields."""
    out = df.copy()
    out["Title"] = out["Name"].map(_extract_title)
    out["FamilySize"] = out["SibSp"].fillna(0) + out["Parch"].fillna(0) + 1
    out["IsAlone"] = (out["FamilySize"] == 1).astype(int)
    out["FarePerPerson"] = out["Fare"] / out["FamilySize"].replace(0, 1)
    out["Deck"] = out["Cabin"].fillna("U").astype(str).str[0].replace("n", "U")
    out["IsChild"] = (out["Age"] < 16).astype(int)
    return out


def model_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Return only fields permitted at prediction time."""
    out = prepare_features(df)
    return out[
        ["Pclass", "Sex", "Age", "SibSp", "Parch", "Fare", "Embarked",
         "Title", "FamilySize", "IsAlone", "FarePerPerson", "Deck", "IsChild"]
    ]
