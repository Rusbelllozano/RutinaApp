# Rutina

Offline-first web app for training at home following an A-B-C rotation, with a plate
calculator, automatic double progression, and history. Built to be used on a phone
during the workout session.

Full functional spec: [`docs/HANDOFF.md`](docs/HANDOFF.md).
Technical context and project status: [`CLAUDE.md`](CLAUDE.md).

The codebase (files, code, docs) is in English; the app's UI is in Spanish for the end
user — see the "Language split" note in `CLAUDE.md`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build     # generates dist/
npm run preview   # serves dist/ locally
```

Deploys automatically to GitHub Pages on every push to `main`
(`.github/workflows/deploy.yml`).
