"""Game mechanics: score real historical-label guesses without causal claims."""

from dataclasses import dataclass
import random

import pandas as pd


@dataclass
class Challenge:
    passenger: pd.Series
    revealed: bool = False


def new_challenge(df: pd.DataFrame, seed: int | None = None) -> Challenge:
    rng = random.Random(seed)
    row = df.iloc[rng.randrange(len(df))]
    return Challenge(row)


def score_guess(guess: int, actual: int) -> int:
    return 1 if int(guess) == int(actual) else 0


def public_profile(row: pd.Series) -> dict[str, object]:
    return {
        "Class": int(row["Pclass"]),
        "Sex": str(row["Sex"]).title(),
        "Age": None if pd.isna(row["Age"]) else round(float(row["Age"]), 1),
        "Family members aboard": int(row["SibSp"] + row["Parch"]),
        "Fare": round(float(row["Fare"]), 2),
        "Embarked": str(row["Embarked"]),
    }


def lifeboat_challenge(df: pd.DataFrame, seed: int | None = None, count: int = 3) -> pd.DataFrame:
    """Select a small set of anonymous passengers for the lifeboat level."""
    return df.sample(n=count, random_state=seed).reset_index(drop=True)
