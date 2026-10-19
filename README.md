# Titanic Survival — ML Analysis & Interactive Game

An applied-ML project built on the Kaggle Titanic dataset: exploratory analysis, an ANN / logistic-regression survival model, a Streamlit game, and a standalone static website ("The Last Crossing").

**🌊 Live demo: https://titanic-time-travel.vercel.app**

Originally developed inside [URS-Applied-ML-Research](https://github.com/Sherry1247/URS-Applied-ML-Research) and split out here with its commit history preserved.

## Layout

| Path | Contents |
|---|---|
| `apps/titanic_survival_game/` | Streamlit app + model (Logistic Regression pipeline) |
| `website/index.html` + `website/dive/` | **Immersive dive experience** (map → wreck → your passenger) |
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

Immersive dive: open the [live demo](https://titanic-time-travel.vercel.app), or open `website/index.html` locally. Previous static site: open `website/classic.html`, or `cd website && python3 -m http.server 4173`.

## Data

`Titanic-Dataset.csv` is from Kaggle's Titanic competition. Set `TITANIC_DATA_PATH` to use a copy elsewhere. Provenance and caveats: `apps/titanic_survival_game/data_sources.yml`.
