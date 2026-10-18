# Titanic Survival — ML Analysis & Interactive Game

An applied-ML project built on the Kaggle Titanic dataset: exploratory analysis, an ANN / logistic-regression survival model, a Streamlit game, and a standalone static website ("The Last Crossing").

Originally developed inside [URS-Applied-ML-Research](https://github.com/Sherry1247/URS-Applied-ML-Research) and split out here with its commit history preserved.

## Layout

| Path | Contents |
|---|---|
| `apps/titanic_survival_game/` | Streamlit app + model (Logistic Regression pipeline) |
| `website/` | Framework-free static game and data story (see `website/README.md`) |
| `src/Kaggle_titanic_code/` | EDA and ANN training scripts |
| `data/Kaggle_titanic_dataset/` | Dataset and generated figures |
| `tests/` | Python tests for the game/model |
| `docs/` | Game audit and website issue register |

## Run

```bash
pip install -r requirements.txt
streamlit run apps/titanic_survival_game/app.py   # Streamlit app
pytest                                            # Python tests
npm test --prefix website                         # website engine tests
```

Static website: open `website/index.html`, or `cd website && python3 -m http.server 4173`.

## Data

`Titanic-Dataset.csv` is from Kaggle's Titanic competition. Provenance and caveats: `apps/titanic_survival_game/data_sources.yml`.
