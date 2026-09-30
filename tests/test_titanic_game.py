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
