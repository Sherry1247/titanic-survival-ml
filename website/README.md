# The Last Crossing — standalone website

This folder is a static, framework-free version of the Titanic Survival Game. It is independent from Streamlit and can be deployed directly to Vercel, Netlify, GitHub Pages, or any static host.

## Local preview

```bash
cd website
python3 -m http.server 4173
```

Open <http://localhost:4173>.

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
