# Frontend

Next.js dashboard in `frontend/` — Persona Studio, evaluation matrix, and exports.

## Tech stack

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **jspdf** + **xlsx** for client-side exports

## Key routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `app/page.tsx` | Main dashboard — Persona form + results |
| Layout | `app/layout.tsx` | Theme, fonts, global styles |

## Components

| Component | Role |
|-----------|------|
| `persona-studio.tsx` | Identity, intent, output format inputs + MONEYSAVER toggle |
| `evaluation-matrix.tsx` | Ranked results table, score breakdown, export buttons |
| `loading-state.tsx` | Progress during generation/evaluation |

## API clients

### FastAPI (local / self-hosted)

`lib/api-client.ts`:

1. `generateOptimizedPrompts(persona, moneySaver, skipEvaluation=true)` → Phase 1
2. `evaluatePrompts(persona, outputs, moneySaver)` → Phase 2

Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

### CrewAI (production)

When `NEXT_PUBLIC_CREWAI_BASE_URL` is set, `lib/crewai-client.ts`:

1. `POST {base}/kickoff` with Persona + `money_saver`
2. Poll status until complete
3. Parse `FinalResponse` from crew output

## Environment variables

Create `frontend/.env.local`:

```env
# Local development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production (Vercel) — CrewAI AMP
NEXT_PUBLIC_CREWAI_BASE_URL=https://your-crew.kickoff.crewai.com
NEXT_PUBLIC_CREWAI_BEARER_TOKEN=your_token
```

If `NEXT_PUBLIC_CREWAI_BASE_URL` is set, the FastAPI client is **not** used.

## Running

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
```

## Vercel deployment

Root directory: **`frontend`**

Set environment variables in the Vercel dashboard. See [Deployment](deployment.md).

## Theming

CSS variables in `app/globals.css` support light/dark themes consistent with the portfolio site.
