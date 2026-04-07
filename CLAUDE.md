# CLAUDE.md — MimicAI

## Identity

Lead engineer building **MimicAI** — a platform where users record their screen to teach AI agents workflows, then sell those automations on a marketplace. "Zapier meets screen recording meets an apprentice that learns by watching."

## Project Summary

MimicAI captures screen activity using AI Vision (Gemini 2.5 Flash default) to READ ACTUAL DATA from pixels — no APIs, no CSVs, no copy-paste. Uses **"Infer First, Ask Later"** — AI analyzes the entire recording in one shot, infers the complete workflow (steps, rules, variables, edge cases). Creators sell automations on a marketplace; buyers run them on their own accounts via Auth0.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2.35 (App Router), React 18, Tailwind CSS 3.4 |
| UI Components | shadcn/ui (Radix UI + Tailwind v3) |
| AI Engine | Gemini 2.5 Flash (default), OpenAI GPT-4o, Claude Sonnet 4 |
| Auth & Tokens | Auth0 SDK v4 (`@auth0/nextjs-auth0@4.x`) + Management API for Google tokens |
| Database | PostgreSQL (Prisma 6, `prisma-client-js`) |
| Queue | BullMQ + Redis |
| Screen Capture | Browser MediaStream API + periodic screenshots |
| Repository | [github.com/arkhangio10/mimicAI](https://github.com/arkhangio10/mimicAI) |

### Key Version Notes
- **Prisma 6** (not 7) — Prisma 7 ESM-only is incompatible with Next.js 14 webpack
- **Auth0 SDK v4** — `Auth0Client` from `@auth0/nextjs-auth0/server`, auth routes via `middleware.ts`
- **Tailwind v3** — shadcn/ui with Radix UI (`@radix-ui/react-*`)
- **AI SDKs**: `@google/generative-ai`, `openai`, `@anthropic-ai/sdk`

## Architecture Decisions

### Auth0 Google Token Flow
Token Vault `getAccessTokenForConnection` doesn't work due to missing upstream refresh token. **Workaround**: Management API fallback in `POST /api/execute` — gets Google `access_token` from user's identity via `GET /api/v2/users/{id}?fields=identities`. Requires `read:user_idp_tokens` scope on the Management API client grant.

```typescript
// src/lib/auth0.ts
export const auth0 = new Auth0Client({
  authorizationParameters: {
    access_type: "offline",
    prompt: "consent",
    scope: "openid profile email offline_access",
  },
});
```

Login URL includes `connection=google-oauth2&access_type=offline&connection_scope=...` to force Google consent with Gmail + Sheets scopes.

### Google Connection (Auth0)
- Connection ID: `con_BRKK5RwgCsFdm0q6`
- Custom Google OAuth credentials (not Auth0 pre-built)
- `access_type: offline`, `prompt: consent` in options
- `connected_accounts: active` (Token Vault enabled)
- Scopes: email, profile, gmail.send, spreadsheets

### Collect-Then-Process Recording Flow
Screenshots collected locally in browser during recording (every 3s, max 2 min). Zero API calls during recording. After stop, all screenshots batch-sent to AI with progress bar.

### "Infer First, Ask Later" Learning
Single `INFER_WORKFLOW_PROMPT` analyzes all actions at once and produces the complete workflow. User reviews and confirms instead of answering 28+ questions.

### Execution Engine
- `globalThis` pattern for in-memory execution Map (survives Next.js hot-reloads)
- `normalizeService()` maps AI-generated names ("Google Sheets" → "sheets")
- Handles step types: `read_screen`, `read_data`, `write_api`, `write_data`, `open_application`, `navigate`, `transform`, `decision`, `notify`
- 5s timeout per step with demo fallback
- Direct Google API calls with pre-fetched token (bypasses service adapters)
- Polling uses `cache: no-store` + timestamp to prevent browser caching

### Client-Side Session Recovery
All learning endpoints accept `recovery` context from client. If server loses in-memory session (hot-reload), client resends actions to rebuild.

### Server-Side API Key Resolution
AI API keys resolved server-side: client key → env var fallback. `GEMINI_API_KEY` in `.env` used automatically.

## Key Commands

```bash
docker-compose up -d          # Start PostgreSQL + Redis
npx prisma migrate dev        # Apply migrations
npm run db:seed               # Seed 4 workflows, 4 users, marketplace listings
npm run dev                   # Dev server http://localhost:3000
npm run build                 # Production build
```

## Environment Variables

```
AUTH0_SECRET=                  # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://dev-mftl71xqlmklaoxv.us.auth0.com
AUTH0_DOMAIN=dev-mftl71xqlmklaoxv.us.auth0.com
AUTH0_CLIENT_ID=SekNKCj04kVraWIBoDpA9Nr4i0ADvRno
AUTH0_CLIENT_SECRET=           # from Auth0 Dashboard
AUTH0_AUDIENCE=https://dev-mftl71xqlmklaoxv.us.auth0.com/api/v2/
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mimicai?schema=public
DEFAULT_AI_PROVIDER=gemini
GEMINI_API_KEY=                # from Google Cloud Console
REDIS_URL=redis://localhost:6379
```

## Auth0 Management API Permissions
App MimicAI is authorized for these scopes on Auth0 Management API:
`read:users`, `read:user_idp_tokens`, `read:connections`, `update:connections`, `update:connections_options`, `delete:connections`, `create:connections`

## Critical Constraints

- **Screenshots are temp files.** Saved during recording, deleted after AI processes them. Zero cloud storage.
- **AI calls must be cost-conscious.** Gemini 2.5 Flash ~$0.02/demo run.
- **Service adapters** in `lib/services/` for Gmail/Sheets/Slack. Execution engine uses direct Google API calls with pre-fetched token for reliability.
- **Google token obtained via Management API** in `/api/execute` route (request context required), passed to async execution engine.
- **In-memory stores use `globalThis`** pattern to survive Next.js dev hot-reloads.

## All Phases Complete

1. Auth & Foundation — Auth0 v4, Prisma 6, shadcn/ui, all pages
2. Screen Recording — MediaStream capture, multi-provider AI, action timeline, SSE
3. Workflow Inference — "Infer First, Ask Later", single-pass AI analysis
4. Workflow Execution — Step runner, rule eval, real Google Sheets API calls
5. Marketplace — Browse, search, install, run installed workflows
6. Polish — Landing page, demo video, blog post, README
