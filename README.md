# Labora

**Every Resource. One Intelligent Campus.**

Campus laboratory resource-sharing platform: equipment discovery, slot booking, project access requests, faculty approvals, and a transparent weighted allocation engine.

This repository is a working application (React + Vite + TypeScript frontend, Express API). Demo personas replace institutional login. That is sample authentication, not production SSO.

## Local development

```bash
npm install
npm test
npm run dev
```

- Web UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8080 (`PORT` overrides this)

Open **Get started** and pick a labelled demo student or faculty persona.

## Production / Cloud Run

The container serves the Vite `dist` bundle and the API from one process. Cloud Run injects `PORT`; the server binds to it.

```bash
npm run build
npm start
```

```bash
gcloud run deploy labora \
  --source . \
  --region YOUR_REGION \
  --allow-unauthenticated
```

Optional GenAI for the assistant (server only):

- `GEMINI_API_KEY` or `OPENAI_API_KEY`

Never put API keys in frontend code or client bundles. If keys are absent, the labelled **demo assistant** answers from the local catalogue.

## Architecture

- `shared/` — types, sanitisation, overlap checks, weighted scoring (used by API and tests)
- `server/` — Express routes, in-memory demo store, faculty authorisation, assistant proxy
- `src/` — React pages and UI
- Confirmed reservations are never overwritten; conflicts return HTTP 409 plus alternative weekday slots
- Allocation weights: deadline 35, fairness 25, wait 15, duration fit 10, confirmed availability 15 (rule-based, not a generative model)

## Demo notes

Personas have no passwords. Faculty approve/reject is checked on the server from the demo session cookie. Reset sample data from the banner.
