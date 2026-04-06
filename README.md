# MimicAI

**Teach AI by doing. Sell what it learns.**

MimicAI is a platform where users record their screen to teach AI agents repetitive workflows, then sell those learned automations on a marketplace. Think "Zapier meets screen recording meets an apprentice that learns by watching."

## What Makes MimicAI Different

| Traditional Automation | MimicAI |
|------------------------|---------|
| Requires APIs for every app | Reads data directly from screen pixels |
| Replays click sequences | Understands *why* each step matters |
| Breaks when UI changes | Adapts using learned rules and reasoning |
| Creator and buyer share tokens | Auth0 Token Vault isolates every user's credentials |

### The Screen Is the API

MimicAI uses AI Vision (Gemini, GPT-4o, or Claude) to read data directly from screenshots — numbers, tables, text — from **any** application. No API needed. This means you can automate legacy desktop apps, lab software, PDF viewers, or anything that shows data on screen.

### Curious Kid Learning

Instead of recording a dumb macro, MimicAI asks questions like a curious apprentice:

- *"Why did you skip row 9?"* — "It's the blank control."
- *"Is 1.5 always the threshold?"* — "It depends on the experiment type."
- *"What happens when all samples pass?"* — "No email needed."

From your answers, it builds IF/THEN rules, detects variables, and handles edge cases.

### Marketplace Economy

Creators publish intelligent automations. Buyers install them and run on their own connected accounts. Auth0 Token Vault ensures zero tokens are stored in our database — every user's credentials are completely isolated.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS 3 |
| Backend | Next.js API Routes |
| UI Components | shadcn/ui (Radix UI) |
| AI Engine | Multi-provider — Gemini 2.5 Flash (default), GPT-4o, Claude Sonnet 4 |
| Auth & Tokens | Auth0 for AI Agents v4 + Token Vault |
| Database | PostgreSQL (Prisma 6 ORM) |
| Queue | BullMQ + Redis |
| Screen Capture | Browser MediaStream API |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance (for BullMQ workers)
- Auth0 tenant with Token Vault enabled

### 1. Clone and install

```bash
git clone <repo-url>
cd auth_0
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Auth0 (required for authentication)
AUTH0_SECRET=               # run: openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/mimicai

# AI Providers (users provide their own keys via Settings UI)
DEFAULT_AI_PROVIDER=gemini
GEMINI_API_KEY=             # optional fallback for dev
OPENAI_API_KEY=             # optional fallback for dev
ANTHROPIC_API_KEY=          # optional fallback for dev

# Redis (required for background workers)
REDIS_URL=redis://localhost:6379
```

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Explore the database

```bash
npx prisma studio
```

## Auth0 Configuration

### Token Vault Setup

MimicAI uses Auth0 Token Vault to securely manage OAuth tokens for third-party services. To enable full functionality:

1. Create an Auth0 application (Regular Web Application)
2. Enable Token Vault in your Auth0 tenant
3. Configure social connections for:
   - **Google** (Gmail + Google Sheets) — scopes: `gmail.send`, `gmail.readonly`, `spreadsheets`
   - **Slack** — scopes: `chat:write`, `channels:read`
4. Set callback URLs:
   - Allowed Callback: `http://localhost:3000/auth/callback`
   - Allowed Logout: `http://localhost:3000`

### How Token Vault Works in MimicAI

```
Creator records workflow → connects Gmail, Sheets via Auth0 consent
  └── Token Vault stores creator's tokens (not our DB)

Buyer installs from marketplace → connects THEIR accounts via Auth0
  └── Token Vault stores buyer's tokens separately

Automation runs → fetches buyer's token from Token Vault → calls API
  └── Zero tokens ever touch our database
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── record/             # Screen recording interface
│   ├── workflows/          # My workflows + detail/edit
│   ├── marketplace/        # Browse + detail/install
│   ├── settings/           # AI provider config
│   └── api/
│       ├── capture/        # Screenshot pipeline + SSE stream
│       ├── ai/interpret/   # AI Vision endpoint
│       ├── learning/       # Q&A engine (start, answer, synthesize, complete)
│       ├── workflows/      # CRUD workflows
│       ├── marketplace/    # List, detail, install/uninstall
│       └── execute/        # Run automations
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── recorder/           # Screen capture + timeline
│   ├── learning/           # Q&A conversation + understanding panel
│   ├── workflows/          # Workflow cards, step editor, runner
│   ├── marketplace/        # Automation cards, install flow
│   └── shared/             # Navbar, service badges
├── lib/
│   ├── ai/                 # Multi-provider engine (Gemini, OpenAI, Anthropic)
│   ├── services/           # Gmail, Sheets, Slack adapters
│   ├── auth0.ts            # Auth0 client + Token Vault helpers
│   ├── execution.ts        # Workflow execution engine
│   └── prisma.ts           # Database client
├── hooks/                  # useScreenCapture, useLearning
└── types/                  # TypeScript interfaces
```

## Key Features

### Screen Recording & AI Vision
- Browser-based screen capture via `getDisplayMedia()`
- Screenshots every 2 seconds, sent to AI Vision for interpretation
- Dual analysis: action recognition + data extraction from pixels
- Temp file storage — screenshots deleted after processing

### Learning Engine
- AI generates contextual questions for every recorded step
- Four question categories: Identity, Reason, Rule, Edge Case
- AI synthesizes answers into IF/THEN rules and workflow variables
- Editable rules, edge cases, and variables in the understanding panel

### Workflow Execution
- Step-by-step execution with rule evaluation
- Variable input collection before each run
- Conditional step execution based on learned rules
- Service adapter calls through Token Vault

### Marketplace
- Publish workflows with one click
- Browse with search, service filters, and sort
- Transparent rule display — buyers see what logic drives the automation
- Per-service OAuth consent via Auth0 Token Vault
- Install/uninstall with execution history preserved

## AI Provider Costs

Users bring their own API keys. Estimated cost per 5-minute learning session:

| Provider | Cost/Session | Cost/Execution |
|----------|-------------|----------------|
| Gemini 2.5 Flash (default) | ~$0.23 | ~$0.004 |
| GPT-4o | ~$1.34 | ~$0.02 |
| Claude Sonnet 4 | ~$1.76 | ~$0.03 |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npx prisma studio    # Database browser
npx prisma migrate dev  # Run migrations
```

## Deployment

### Vercel (Frontend)

1. Connect your repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy — Next.js is auto-detected

### Railway (Database + Redis)

1. Create a PostgreSQL service
2. Create a Redis service
3. Copy connection strings to Vercel env vars

## License

MIT
