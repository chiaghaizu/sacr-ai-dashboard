# SACR AI Dashboard

Internal news intelligence dashboard for SACR analysts.

The app aggregates recent client announcements, stores snapshots in Supabase, and presents:
- **Today's Feed**: grouped by company for a quick daily briefing.
- **History**: item-level archive view for 14 or 30 day windows.
- **Search**: semantic search workflow for intelligence queries.

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **AI:** Gemini
- **Data:** Supabase (PostgreSQL + JSON snapshots)
- **Package manager:** pnpm (workspace)

## Repository Structure

- `client/` - Vite React app
- `server/` - Express API and generation/search services
- `docker-compose.yml` - local containerized development
- `Dockerfile` - production image build
- `Dockerfile.dev` - development image for compose
- `DEPLOYMENT_GUIDE.md` - Cloud Run and production deployment details

## What The App Does

1. Fetches and stores current client news in Supabase.
2. Displays a daily briefing with company-level cards.
3. Shows historical snapshots and filtering across time ranges.
4. Exposes API endpoints for feeds, history, refresh/generation, and semantic search.

## Environment Variables

Create a `.env` file in the repo root (see `.env.example`):

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `PORT`
- `GOOGLE_SHEETS_ID`

## Run Locally With Docker (Recommended)

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- A valid `.env` file at repo root
- Optional for Google integrations in compose: local ADC at  
  `${HOME}/.config/gcloud/application_default_credentials.json`

### Start

```bash
docker compose up --build
```

This starts:
- **Client** at `http://localhost:5173`
- **Server/API** at `http://localhost:4000`

### Run Detached

```bash
docker compose up --build -d
```

### Check Status

```bash
docker compose ps
```

### View Logs

```bash
docker compose logs -f
```

Or for a single service:

```bash
docker compose logs -f server
docker compose logs -f client
```

### Stop

```bash
docker compose down
```

### Rebuild After Dependency/Config Changes

```bash
docker compose up --build -d
```

## Run Locally Without Docker

```bash
pnpm install
pnpm dev
```

## Build and Start (Production-like Local Run)

```bash
pnpm build
pnpm start
```

## Notes

- Use **pnpm** consistently in this repo.
- Do not commit `.env` or other secret files.
- For production deployment details (Cloud Run, IAM, Scheduler, IAP), see `DEPLOYMENT_GUIDE.md`.
