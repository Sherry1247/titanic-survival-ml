"""Reproducible, descriptive exploration of the 891-row Kaggle Titanic data.

These figures describe recorded associations. They do not establish causes, and
unknown values stay unknown in explanatory views rather than being imputed.
"""

from pathlib import Path

import matplotlib
import pandas as pd
import seaborn as sns


matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "Kaggle_titanic_dataset" / "Titanic-Dataset.csv"
OUTPUT_DIR = DATA_PATH.parent

SURVIVED = "#2A6F97"
NOT_SURVIVED = "#6B6259"
BRASS = "#A4772B"
INK = "#18212B"


def grouped_rates(frame: pd.DataFrame, field: str) -> pd.DataFrame:
    result = frame.groupby(field, observed=True)["Survived"].agg(["sum", "count"])
    result["survival_rate"] = result["sum"] / result["count"] * 100
    result["not_survived_rate"] = 100 - result["survival_rate"]
    return result


def label_stacked_bars(ax, summary: pd.DataFrame) -> None:
    for index, (_, row) in enumerate(summary.iterrows()):
        ax.text(
            index,
            row["survival_rate"] / 2,
            f'{int(row["sum"])}/{int(row["count"])}\n{row["survival_rate"]:.1f}%',
            ha="center",
            va="center",
            color="white",
            fontsize=9,
            fontweight="bold",
        )


def save_figure(filename: str) -> None:
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / filename, dpi=200, bbox_inches="tight")
    plt.close()


df = pd.read_csv(DATA_PATH)
df["FamilySize"] = df["SibSp"] + df["Parch"] + 1

print("=" * 80)
print("TITANIC DATASET: DESCRIPTIVE EXPLORATION")
print("=" * 80)
print(f"Rows: {len(df)}")
print(
    "Missing values — "
    f"Age: {df['Age'].isna().sum()}, "
    f"Cabin: {df['Cabin'].isna().sum()}, "
    f"Embarked: {df['Embarked'].isna().sum()}"
)
print("Unknown ages are excluded from age charts; no explanatory value is imputed.\n")

# 1. Age distribution, complete cases only.
age_known = df[df["Age"].notna()].copy()
age_known["Survival Status"] = age_known["Survived"].map(
    {0: "Did not survive", 1: "Survived"}
)
plt.figure(figsize=(10, 6))
sns.boxplot(
    data=age_known,
    x="Survival Status",
    y="Age",
    hue="Survival Status",
    palette=[NOT_SURVIVED, SURVIVED],
    legend=False,
)
plt.ylabel("Recorded age (years)")
plt.xlabel("")
plt.title("Recorded age distribution by historical outcome")
plt.grid(True, alpha=0.2, axis="y")
save_figure("titanic_eda_graph1_age_boxplot.png")
medians = age_known.groupby("Survival Status")["Age"].median()
print("1. Age distribution (177 passengers with unknown age excluded)")
for label, value in medians.items():
    print(f"   {label}: median recorded age {value:.1f}")
print("   The overlap is substantial; this figure alone does not explain why outcomes differed.\n")

# 2. Sex, displayed descriptively with denominators.
sex_survival = grouped_rates(df, "Sex")
ax = sex_survival[["survival_rate", "not_survived_rate"]].plot(
    kind="bar",
    stacked=True,
    color=[SURVIVED, NOT_SURVIVED],
    edgecolor=INK,
    linewidth=0.8,
    figsize=(10, 6),
    width=0.62,
)
label_stacked_bars(ax, sex_survival)
plt.ylabel("Passengers (%)")
plt.xlabel("Recorded sex")
plt.title("Historical outcome by recorded sex")
plt.xticks(rotation=0)
plt.legend(["Survived", "Did not survive"], frameon=False)
plt.grid(True, alpha=0.2, axis="y")
save_figure("titanic_eda_graph2_gender_survival.png")
female_rate = sex_survival.loc["female", "survival_rate"] / 100
male_rate = sex_survival.loc["male", "survival_rate"] / 100
print("2. Historical outcome by recorded sex")
for label, row in sex_survival.iterrows():
    print(f"   {label}: {int(row['sum'])}/{int(row['count'])} ({row['survival_rate']:.1f}%)")
print(f"   Descriptive risk ratio (female/male): {female_rate / male_rate:.2f}")
print("   This is not an odds ratio and does not isolate sex from class, age, or circumstance.\n")

# 3. Passenger class.
class_survival = grouped_rates(df, "Pclass")
ax = class_survival[["survival_rate", "not_survived_rate"]].plot(
    kind="bar",
    stacked=True,
    color=[SURVIVED, NOT_SURVIVED],
    edgecolor=INK,
    linewidth=0.8,
    figsize=(10, 6),
    width=0.62,
)
label_stacked_bars(ax, class_survival)
plt.ylabel("Passengers (%)")
plt.xlabel("Passenger class")
plt.title("Historical outcome by passenger class")
plt.xticks([0, 1, 2], ["First", "Second", "Third"], rotation=0)
plt.legend(["Survived", "Did not survive"], frameon=False)
plt.grid(True, alpha=0.2, axis="y")
save_figure("titanic_eda_graph3_pclass_survival.png")
print("3. Historical outcome by class")
for label, row in class_survival.iterrows():
    print(f"   Class {label}: {int(row['sum'])}/{int(row['count'])} ({row['survival_rate']:.1f}%)")
print("   Class is associated with many other recorded and unrecorded circumstances; the chart is not causal.\n")

# 4. Ticket fare in the dataset's historical currency.
fare_frame = df.assign(
    **{"Survival Status": df["Survived"].map({0: "Did not survive", 1: "Survived"})}
)
plt.figure(figsize=(10, 6))
sns.violinplot(
    data=fare_frame,
    x="Survival Status",
    y="Fare",
    hue="Survival Status",
    palette=[NOT_SURVIVED, SURVIVED],
    legend=False,
    cut=0,
)
plt.ylabel("Ticket fare (£, historical pounds sterling)")
plt.xlabel("")
plt.title("Recorded ticket fare by historical outcome")
plt.grid(True, alpha=0.2, axis="y")
save_figure("titanic_eda_graph4_fare_violin.png")
print("4. Fare distribution")
print("   Fare is recorded in historical pounds sterling, not US dollars.")
print("   Fare overlaps with class and ticket-party size, so it is not an independent causal explanation.\n")

# 5. Age groups, complete cases only.
age_known["AgeGroup"] = pd.cut(
    age_known["Age"],
    bins=[0, 5, 12, 18, 35, 60, float("inf")],
    labels=["0-5", "6-12", "13-18", "19-35", "36-60", "60+"],
    include_lowest=True,
)
age_survival = grouped_rates(age_known, "AgeGroup")
ax = age_survival[["survival_rate", "not_survived_rate"]].plot(
    kind="bar",
    stacked=True,
    color=[SURVIVED, NOT_SURVIVED],
    edgecolor=INK,
    linewidth=0.8,
    figsize=(12, 6),
    width=0.7,
)
label_stacked_bars(ax, age_survival)
plt.ylabel("Passengers with recorded age (%)")
plt.xlabel("Recorded age group")
plt.title("Historical outcome by age group — unknown ages excluded")
plt.xticks(rotation=0)
plt.legend(["Survived", "Did not survive"], frameon=False)
plt.grid(True, alpha=0.2, axis="y")
save_figure("titanic_eda_graph5_agegroup_survival.png")
print("5. Age groups (known ages only)")
for label, row in age_survival.iterrows():
    print(f"   {label}: {int(row['sum'])}/{int(row['count'])} ({row['survival_rate']:.1f}%)")
print("   These are marginal group rates; small groups and overlapping variables limit interpretation.\n")

# 6. Family size, explicitly defined as a constructed field.
df["FamilyGroup"] = pd.cut(
    df["FamilySize"],
    bins=[0, 1, 2, 4, float("inf")],
    labels=["Alone", "Two", "Three-four", "Five+"],
)
family_survival = grouped_rates(df, "FamilyGroup")
ax = family_survival[["survival_rate", "not_survived_rate"]].plot(
    kind="bar",
    stacked=True,
    color=[SURVIVED, NOT_SURVIVED],
    edgecolor=INK,
    linewidth=0.8,
    figsize=(12, 6),
    width=0.7,
)
label_stacked_bars(ax, family_survival)
plt.ylabel("Passengers (%)")
plt.xlabel("Constructed family size: SibSp + Parch + 1")
plt.title("Historical outcome by recorded family size")
plt.xticks(rotation=0)
plt.legend(["Survived", "Did not survive"], frameon=False)
plt.grid(True, alpha=0.2, axis="y")
save_figure("titanic_eda_graph6_family_survival.png")
print("6. Constructed family-size groups")
for label, row in family_survival.iterrows():
    print(f"   {label}: {int(row['sum'])}/{int(row['count'])} ({row['survival_rate']:.1f}%)")
print("   FamilySize is derived from SibSp and Parch; it is not an independent source field.")
print("   Family-size patterns do not by themselves establish a mechanism.\n")

# 7. Correlation view without duplicating FamilySize alongside its components.
numeric_cols = ["Survived", "Age", "Fare", "Pclass", "SibSp", "Parch"]
corr_matrix = df[numeric_cols].corr()
plt.figure(figsize=(9, 7))
sns.heatmap(
    corr_matrix,
    annot=True,
    fmt=".3f",
    cmap=sns.diverging_palette(230, 35, as_cmap=True),
    center=0,
    square=True,
    linewidths=1,
    cbar_kws={"label": "Pearson correlation"},
    vmin=-1,
    vmax=1,
)
plt.title("Pairwise correlations among selected numeric fields")
save_figure("titanic_eda_graph7_correlation_heatmap.png")
print("7. Correlations")
print(corr_matrix["Survived"].round(3).to_string())
print("   Pclass is ordinal, not a continuous physical measurement.")
print("   Pairwise correlation does not measure explained variance or causality.")
print("   Sex and embarkation are categorical and intentionally omitted from this matrix.\n")

print("=" * 80)
print("INTERPRETATION LIMITS")
print("=" * 80)
print("- These charts report associations in one 891-row teaching dataset.")
print("- They do not prove why an individual survived or did not survive.")
print("- Cabin is missing for most rows; age is missing for 177 passengers.")
print("- FamilySize is constructed from SibSp + Parch + 1.")
print("- Predictive model quality must be estimated with held-out or cross-validated data,")
print("  not inferred from descriptive charts.")
