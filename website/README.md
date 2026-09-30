# The Last Crossing — standalone website

This folder is a static, framework-free version of the Titanic Survival Game. It is independent from Streamlit and can be deployed directly to Vercel, Netlify, GitHub Pages, or any static host.

## Local preview

You can open `index.html` directly by double-clicking it. The checked-in
`game.bundle.js` exists specifically so the game also works from a `file://` URL.

For an HTTP preview:

```bash
cd website
python3 -m http.server 4173
```

Open <http://localhost:4173>.

## Game architecture

- `data/` contains passengers, level settings, and bilingual copy.
- `engine/` contains DOM-free state, route, and scoring rules.
- `ui/` renders passenger cards, the ship map, and results.
- `game.js` coordinates browser events, timing, language, and local scores.

The visible flow supports both drag-and-drop and click controls. Run the engine tests with:

```bash
npm test --prefix website
```

After changing a JavaScript module, rebuild the direct-open browser bundle:

```bash
npm run build --prefix website
```

The checked-in `data/model-results.js` is generated from the repository's
Kaggle CSV and the Logistic Regression pipeline in
`apps/titanic_survival_game`. Regenerate it after model changes with:

```bash
.titanic_env/Scripts/python website/scripts/export_model_report.py
npm run build --prefix website
```

Historical images in `assets/history/` are local copies of public-domain or
CC0 files from Wikimedia Commons. Their source pages and licenses are linked
in the website's Sources section.

## Vercel deployment

From the repository root:

```bash
npx vercel --cwd website
npx vercel --cwd website --prod
```

The first command may ask you to log in and choose a Vercel project. No Python runtime is required for this standalone game.

## Product notes

- English is the default; the `中文 / EN` control switches language and stores the choice locally.
- The intro can be skipped and includes a 9-second auto-enter fallback.
- Scores are local-only. A public, cross-device leaderboard still needs a backend.
- The game data is intentionally labeled as a research prototype, not a complete historical reconstruction.
