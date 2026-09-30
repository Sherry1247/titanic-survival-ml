# Titanic Survival Game

An educational interactive app built from the repository's Titanic passenger dataset.

## Run locally

    python -m pip install -r apps/titanic_survival_game/requirements.txt
    streamlit run apps/titanic_survival_game/app.py

## Game flow

The primary experience is a 2D canvas simulation in static/game.html, embedded in the Streamlit page:

- Move with WASD or arrow keys.
- Navigate a top-down deck layout with walls, NPC passengers, a timer, and spreading water.
- Reach the glowing lifeboat to clear each level.
- Three levels increase the time pressure and route complexity.
- Scores are stored in browser localStorage for the local leaderboard.

- Deck Check: three quick historical-label guesses.
- Cabin Analyst: three guesses with confidence and a confidence bonus.
- Lifeboat Station: choose the passenger ranked safest by the selected model.
- Voyage complete: the score is added to the current session leaderboard.

The leaderboard is intentionally session-local until a database-backed service is added.
This keeps the app deployable without collecting player names or creating an unreviewed public data store.

## Design principles

- The model only uses fields available before the outcome; Survived is never used as a feature.
- Passenger Challenge scores guesses against the historical label, then shows the model estimate.
- Build a Passenger estimates a hypothetical profile and clearly labels the result as educational.
- Dataset provenance and caveats are recorded in data_sources.yml.
- The Model lens tab shows per-passenger logistic contributions or global random-forest importance.
- The Historical context tab keeps narrative sources separate from model features.
