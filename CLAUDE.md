# CLAUDE.md — MimicAI Master Prompt

## Identity

You are the lead engineer building **MimicAI**, a platform where users record their screen to teach AI agents repetitive workflows, then sell those learned automations on a marketplace. Think "Zapier meets screen recording meets an apprentice that learns by watching."

## Project Summary

MimicAI captures user screen activity in real-time, using AI Vision (Gemini, OpenAI, or Claude — user chooses) not just to understand WHAT the user is doing, but to READ THE ACTUAL DATA visible on screen. The screen is the data source — no file exports, no CSVs, no copy-paste. AI Vision extracts numbers, text, tables, and values directly from pixels, just like a human apprentice looking over your shoulder.

The platform uses **"Infer First, Ask Later"** — instead of asking dozens of questions, AI analyzes the entire recording in one shot, infers the complete workflow (steps, rules, variables, edge cases), and presents its understanding for the user to review and confirm. Creators sell these automations on a marketplace where buyers install them and run them on their own connected accounts via Auth0 Token Vault.

### The Two Modes of Screen Reading

1. **Learning Mode (Recording):** AI Vision watches the screen to understand the PATTERN — what app is open, what data the user reads, where they put it, what transformations they apply. Screenshots are saved as temp files during recording, sent to the AI, then deleted once the workflow is learned.

2. **Execution Mode (Running):** AI Vision watches the screen AGAIN to extract REAL DATA VALUES from the source application, then writes those values to destination services (Google Sheets, Gmail, Slack) via Token Vault APIs. Screenshots are processed in-memory and never stored.

This means MimicAI can automate tasks where the source application has NO API — like reading data from a spectrophotometer program, a legacy desktop app, a PDF viewer, or any software that shows data on screen.

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Frontend         | Next.js 14.2.35 (App Router), React 18, Tailwind CSS 3.4 |
| Backend API      | Next.js API Routes + Node.js                    |
| UI Components    | shadcn/ui (Radix UI primitives, Tailwind v3 compatible) |
| AI Engine        | **Multi-provider** — Gemini 2.5 Flash (default), OpenAI GPT-4o, Claude Sonnet 4 |
| Auth & Tokens    | Auth0 for AI Agents v4 (`@auth0/nextjs-auth0@4.x`) — Token Vault |
| Database         | PostgreSQL (Prisma 6 ORM, `prisma-client-js`)   |
| Queue / Cron     | BullMQ + Redis                                   |
| Screen Capture   | Browser MediaStream API + periodic screenshots   |
| Screenshot Storage | **Local temp files** (`/tmp/mimicai/`) — deleted after AI processes them |
| Repository       | [github.com/arkhangio10/mimicAI](https://github.com/arkhangio10/mimicAI) |
| Deployment       | Vercel (frontend) + Railway (backend workers)    |

### Key Version Notes
- **Prisma 6** (not 7) �� Prisma 7 uses ESM-only `prisma-client` generator which is incompatible with Next.js 14's webpack. We use `prisma-client-js` generator.
- **Auth0 SDK v4** — Uses `Auth0Client` from `@auth0/nextjs-auth0/server` (NOT the v3 `initAuth0`). Auth routes are handled via `middleware.ts`, not catch-all API routes.
- **Tailwind v3** — shadcn/ui components are written for Tailwind v3 with Radix UI (`@radix-ui/react-*`). NOT the v4 `@base-ui/react` variants.
- **AI SDKs installed**: `@google/generative-ai`, `openai`, `@anthropic-ai/sdk`

## Directory Structure

Files marked with `✅` exist and are implemented. Files marked with `⬜` are planned but not yet created.

```
auth_0/
├── CLAUDE.md                  # This file — master prompt ✅
├── RULES.md                   # Coding standards and conventions ✅
├── ARCHITECTURE.md            # System architecture document ✅
├── docs/
│   └── ARCHITECTURE.md        # Copy of architecture doc ✅
├── src/
│   ├── middleware.ts           # Auth0 v4 middleware (handles /auth/* routes) ✅
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout with Navbar + TooltipProvider ✅
│   │   ├── globals.css        # Tailwind v3 + CSS variables (HSL) ✅
│   │   ├── page.tsx           # Dashboard with quick actions + how-it-works ✅
│   │   ├── record/
│   │   │   └── page.tsx       # Full recording interface (capture + timeline + AI config) ✅
│   │   ├── workflows/
│   │   │   ├── page.tsx       # My workflows list (empty state) ✅
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Workflow detail: steps, rules, variables, run panel ✅
│   │   ├── marketplace/
│   │   │   ├── page.tsx       # Browse automations with search/filter/sort ✅
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Automation detail + install flow ✅
│   │   ├── api/
│   │   │   ├── capture/
│   │   │   │   ├── route.ts   # POST: receive screenshot + AI interpret; DELETE: end session ✅
│   │   │   │   └── stream/
│   │   │   │       └── route.ts # GET: SSE stream for real-time action feed ✅
│   │   │   ├── workflows/
│   │   │   │   ├── route.ts   # GET: list workflows; POST: create workflow ✅
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts # GET/PATCH/DELETE: workflow detail ✅
│   │   │   ├── marketplace/
│   │   │   │   ├── route.ts   # GET: list published automations with search/filter/sort ✅
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # GET: full marketplace listing detail ✅
│   │   │   │       └── install/
│   │   │   │           └── route.ts  # POST: install, DELETE: uninstall ✅
│   │   │   ├── execute/
│   │   │   │   ├── route.ts   # POST: start execution with variable inputs ✅
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts # GET: execution status + progress ✅
│   │   │   ├── ai/
│   │   │   │   ├── interpret/
│   │   │   │   │   └── route.ts  # AI Vision: screenshot → action ✅
│   │   │   │   └── clarify/
│   │   │   │       └── route.ts  # Superseded by learning routes ⬜
│   │   │   ├── learning/
│   │   │   │   ├── start/route.ts     # POST: init learning from recording ✅
│   │   │   │   ├── infer/route.ts     # POST: single-pass workflow inference ✅
│   │   │   │   ├── answer/route.ts    # POST: submit answer, get follow-up ✅
│   │   │   │   ├── synthesize/route.ts # POST: extract rules/variables ✅
│   │   │   │   ├── status/route.ts    # GET: learning session status ✅
│   │   │   │   ├── rules/route.ts     # PATCH: edit/delete rules ✅
│   │   │   │   └── complete/route.ts  # POST: finalize learning ✅
│   │   │   └── screenshots/
│   │   │       └── [filename]/route.ts # GET: serve screenshot images ✅
│   │   └── settings/
│   │       └── page.tsx       # AI provider selection + connected services ✅
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (Radix UI + Tailwind v3) ✅
│   │   │   ├── button.tsx, card.tsx, input.tsx, badge.tsx ✅
│   │   │   ├── dropdown-menu.tsx, avatar.tsx, separator.tsx ✅
│   │   │   ├── skeleton.tsx, tooltip.tsx, progress.tsx, scroll-area.tsx ✅
│   │   │   └── dialog.tsx, tabs.tsx, textarea.tsx ✅
│   │   ├── recorder/
│   │   │   ├── ScreenCapture.tsx  # Live preview + recording controls + stats ✅
│   │   │   ├── ActionTimeline.tsx # Scrollable action list + extracted data preview ✅
│   │   │   └── ClarifyDialog.tsx     # Superseded by learning/ components ✅
│   │   ├── learning/
│   │   │   ├── LearningFlow.tsx      # Main learning orchestrator ✅
│   │   │   ├── LearningProgress.tsx  # Progress bar + phase indicator ✅
│   │   │   ├── ActionReview.tsx      # Screenshot + action context display ✅
│   │   │   ├── ConversationPanel.tsx # Chat-style Q&A interface ✅
│   │   │   ├── QuestionBubble.tsx    # Individual Q/A message bubble ✅
│   │   │   ├── AnswerInput.tsx       # Textarea + submit for answers ✅
│   │   │   ├── UnderstandingPanel.tsx # Tabbed rules/edge cases/variables/steps ✅
│   │   │   ├── RuleCard.tsx          # Editable IF/THEN rule card ✅
│   │   │   ├── EdgeCaseCard.tsx      # Editable WHEN/THEN edge case card ✅
│   │   │   └── VariableCard.tsx      # Editable variable card ✅
│   │   ├── workflows/
│   │   │   ├── WorkflowCard.tsx   # Workflow summary card for list view ✅
│   │   │   ├── StepEditor.tsx     # Step flow visualizer + rules + edge cases ✅
│   │   │   └── WorkflowRunner.tsx # Variable input + execution progress UI ✅
│   │   ├── marketplace/
│   │   │   ├── AutomationCard.tsx    # Marketplace listing card (name, creator, price, services) ✅
│   │   │   └── InstallFlow.tsx       # Service connection + install/uninstall panel ✅
│   │   └── shared/
│   │       ├── Navbar.tsx         # Navigation + user menu ✅
│   │       ├── ServiceBadge.tsx   # Gmail/Sheets/Slack badges ✅
│   │       └── TokenStatus.tsx    # Connection status indicator ✅
│   ├── lib/
│   │   ├── auth0.ts           # Auth0Client + Token Vault helpers (stubbed) ✅
│   │   ├── errors.ts          # Custom error classes ✅
│   │   ├── prisma.ts          # DB client singleton ✅
│   │   ├── sessions.ts        # In-memory recording session management ✅
│   │   ├── utils.ts           # cn() helper for Tailwind ✅
│   │   ├── ai/                # Multi-provider AI engine ✅
│   │   │   ├── provider.ts    # AIProvider interface + createProvider factory ✅
│   │   │   ├── gemini.ts      # Gemini 2.5 Flash adapter ✅
│   │   │   ├── openai.ts      # GPT-4o adapter ✅
│   │   │   ├── anthropic.ts   # Claude Sonnet 4 adapter ✅
│   │   │   ├── prompts.ts     # Shared INTERPRET + EXTRACT + LEARNING prompts ✅
│   │   │   └── learning.ts   # Learning AI: question gen, synthesis, variable detection ✅
│   │   ├── learning-sessions.ts # In-memory learning session store ✅
│   │   ├── screenshots.ts     # Temp file save/read/cleanup ✅
│   │   ├── execution.ts       # Workflow execution engine (step runner, rule eval, service dispatch) ✅
│   │   ├── queue.ts           # BullMQ job definitions ⬜
│   │   └── services/
│   │       ├── gmail.ts       # Gmail API adapter (via Token Vault) ✅
│   │       ├── sheets.ts      # Google Sheets adapter (via Token Vault) ✅
│   │       ├── slack.ts       # Slack API adapter (via Token Vault) ✅
│   │       └── index.ts       # Service registry + display config ✅
│   ├── hooks/
│   │   ├── useScreenCapture.ts # MediaStream + periodic screenshot + start/stop/pause ✅
│   │   ├── useLearning.ts     # Learning session state + API calls ✅
│   │   ├── useWorkflow.ts ⬜  # (workflow state managed inline in detail page)
│   │   └── useTokenVault.ts ⬜
│   ├── types/
│   │   ├── workflow.ts        # WorkflowTemplate, WorkflowStep, LearnedRule, etc. ✅
│   │   ├── action.ts          # CapturedAction, ExtractedData, LearnedStep, QuestionAnswer ✅
│   │   └── marketplace.ts     # MarketplaceListing, InstallationStatus ✅
│   └── workers/
│       ├── interpreter.ts     # Processes screenshot queue ⬜
│       └── executor.ts        # Runs automations on schedule ⬜
├── prisma/
│   └── schema.prisma          # Full schema: User, Workflow, Recording, Installation, Execution, AIUsage ✅
├── public/
├── .env                       # Local env (DO NOT COMMIT) ✅
├── .env.example               # Template for env vars ✅
├── package.json ✅
├── tsconfig.json ✅
├── tailwind.config.ts         # Tailwind v3 + shadcn theme (HSL CSS vars) ✅
└── postcss.config.mjs ✅
```

## Core Concepts

### 1. Screen Capture → Action Interpretation → Data Extraction

The browser captures screenshots every 2-3 seconds via `getDisplayMedia()`. Each frame is sent to the backend as base64, processed in-memory by Claude Vision, and discarded. No screenshots are stored permanently — they exist only during processing. Claude does TWO things with each screenshot:

**A) Action Recognition:** What is the user doing? (clicking, typing, switching apps)
**B) Data Extraction:** What data is visible on screen? (numbers, text, tables, values)

This dual capability is the core innovation. Most automation tools need APIs or file exports. MimicAI reads the screen like a human does.

```typescript
interface CapturedAction {
  id: string;
  timestamp: number;
  screenshotUrl: string;
  
  // What the user is doing
  sourceApp: string;           // "spectrophotometer_pro" | "gmail" | "excel" | any app name
  action: string;              // "read_data" | "type_value" | "click_button" | "switch_app"
  actionTarget: string;        // "cell B2" | "send button" | "wavelength field"
  
  // What data is visible on screen (extracted by Claude Vision)
  extractedData: ExtractedData | null;
  
  // Where the user puts the data
  destinationService: "gmail" | "sheets" | "slack" | "browser" | "unknown" | null;
  destinationTarget: string | null;  // "Sheet1!B3" | "email body" | "#channel"
  
  confidence: number;
  needsClarification: boolean;
}

interface ExtractedData {
  type: "table" | "single_value" | "text_block" | "form_fields";
  values: Record<string, any>;    // { "wavelength": 450, "absorbance": 0.832 }
  rawText: string;                // OCR-like raw text from screen region
  screenRegion: {                 // Where on screen the data was found
    x: number; y: number;
    width: number; height: number;
  };
}
```

### How This Works for the Spectrophotometer Example:

```
Screenshot 1 — Spectrophotometer software visible:
{
  sourceApp: "spectrophotometer_pro",
  action: "read_data",
  extractedData: {
    type: "table",
    values: {
      "rows": [
        { "wavelength": 450, "absorbance": 0.832 },
        { "wavelength": 500, "absorbance": 0.654 },
        { "wavelength": 550, "absorbance": 0.441 }
      ]
    },
    rawText: "Wavelength(nm)  Absorbance\n450  0.832\n500  0.654..."
  },
  destinationService: null  // user hasn't moved data yet
}

Screenshot 2 — User switched to Google Sheets:
{
  sourceApp: "google_sheets",
  action: "type_value",
  actionTarget: "cell A2",
  extractedData: null,  // no new source data, user is WRITING
  destinationService: "sheets",
  destinationTarget: "Sheet1!A2"
}

Claude connects the dots: "The user READ 450 from spectrophotometer 
and WROTE 450 into Sheets cell A2. This is a transcription pattern."
```

### 2. Learning Engine — "Curious Kid Mode"

This is NOT a simple clarification system. It is the **core intelligence** of MimicAI. The AI doesn't just ask when confused — it asks about EVERY step to build a **reasoning model** that understands WHY the user does each action, not just WHAT they did.

Think of it like a child watching a parent cook. The child doesn't just memorize "add salt after 5 minutes." The child asks "why do we add salt?" and learns "because the soup needs seasoning — and we taste first to decide how much." Now the child can cook ANY soup, not just replay the one they watched.

#### The Three Layers of Understanding

```
Layer 1 — WHAT (screen observation)
  Claude Vision sees: "User colored cell D7 red"
  This is automatic. No question needed.

Layer 2 — WHY (reasoning question)
  MimicAI asks: "Why did you color that cell red?"
  User answers: "Because the absorbance is above 1.5, that means the sample failed quality control"
  
  NOW MimicAI knows: IF absorbance > 1.5 THEN mark_as_failed AND color_red

Layer 3 — CONSEQUENCE (what happens because of the WHY)
  MimicAI asks: "What happens when a sample fails? Do you do anything else?"
  User answers: "Yes, I email my supervisor and I don't include it in the final average"
  
  NOW MimicAI knows: IF failed THEN email_supervisor AND exclude_from_calculations
```

#### Question Categories (asked for EVERY step, not just low-confidence)

**IDENTITY questions — What is this?**
- "What software is this? What kind of data does it show?"
- "What does this number represent?"
- "What is this spreadsheet used for?"

**REASON questions — Why did you do this?**
- "Why did you copy this value specifically?"
- "Why did you skip this row?"
- "Why did you color this red?"
- "Why did you send an email at this point?"

**RULE questions — Is this always the case?**
- "Do you always start pasting at row 3, or does it depend on something?"
- "Is 1.5 always the threshold, or does it change per experiment?"
- "Do you always email the supervisor, or only for certain types of failures?"

**EDGE CASE questions — What if things are different?**
- "What if there are more than 10 samples? Do you create a new sheet?"
- "What if the spectrophotometer shows an error instead of a reading?"
- "What if all samples pass? Do you still send an email?"

#### Data Model for Learned Reasoning

```typescript
interface LearnedStep {
  id: string;
  recordingId: string;
  
  // WHAT happened (from Claude Vision)
  observation: {
    screenshotUrl: string;
    sourceApp: string;
    action: string;
    extractedData: ExtractedData | null;
    destinationService: string | null;
    destinationTarget: string | null;
  };
  
  // WHY it happened (from user answers)
  reasoning: {
    questions: QuestionAnswer[];    // every Q&A for this step
    rules: LearnedRule[];           // extracted IF/THEN rules
    edgeCases: EdgeCase[];          // what to do in unusual situations
  };
  
  // The AI's understanding (synthesized by Claude)
  understanding: {
    purposeDescription: string;     // "This step checks if the sample passed QC"
    conditionLogic: string;         // "IF absorbance > threshold THEN fail"
    isConditional: boolean;         // does this step only happen sometimes?
    condition: string | null;       // "only when value exceeds 1.5"
    consequences: string[];         // ["email supervisor", "exclude from average"]
  };
}

interface QuestionAnswer {
  id: string;
  category: "identity" | "reason" | "rule" | "edge_case";
  question: string;
  answer: string;
  timestamp: number;
  screenshotUrl: string;           // which screenshot prompted this question
}

interface LearnedRule {
  id: string;
  condition: string;               // "absorbance > 1.5"
  action: string;                  // "color_red + email_supervisor"
  source: string;                  // which Q&A generated this rule
  confidence: number;
}

interface EdgeCase {
  id: string;
  scenario: string;                // "spectrophotometer shows error"
  response: string;                // "skip this reading and note it in comments"
  source: string;                  // which Q&A generated this
}
```

#### The Learning Conversation Flow

```
[Recording starts — user opens spectrophotometer software]

SCREENSHOT 1: Spectrophotometer showing readings table
  MimicAI: "I see a program with a table of numbers. What software is this 
            and what do these numbers represent?"
  User:    "It's SpectroPro. The columns are wavelength in nanometers 
            and absorbance values for each sample."
  
  → MimicAI stores: app="SpectroPro", data_schema={wavelength: nm, absorbance: float}

SCREENSHOT 3: User selecting rows in the table
  MimicAI: "I see you selected rows 1 through 8 but not row 9. 
            Why did you skip row 9?"
  User:    "Row 9 is the blank control. I never include the blank in results."
  
  → MimicAI stores: RULE: IF row_label == "blank" OR row_type == "control" THEN skip

SCREENSHOT 5: User switched to Google Sheets, pasting data
  MimicAI: "You pasted the data starting at cell B3. Is B3 always the 
            starting point, or does it depend on previous data?"
  User:    "I always find the next empty row. B3 is just where it happened 
            to be today."
  
  → MimicAI stores: RULE: destination = find_next_empty_row(column_B)

SCREENSHOT 7: User typing a formula
  MimicAI: "I see you typed =B3*10 in column C. What is this calculation? 
            Is 10 always the multiplier?"
  User:    "That's the dilution factor. It's usually 10 but sometimes 
            5 or 20 depending on the experiment. I decide before starting."
  
  → MimicAI stores: VARIABLE: dilution_factor (user_input, default=10)
  → MimicAI stores: RULE: concentration = absorbance * dilution_factor

SCREENSHOT 9: User coloring cells red
  MimicAI: "You colored cells C5 and C7 red. Why these specific cells?"
  User:    "Any concentration above 1.5 fails quality control. I mark 
            failures in red."
  
  → MimicAI stores: RULE: IF concentration > 1.5 THEN color_red, mark_as_failed

SCREENSHOT 10: User opening Gmail
  MimicAI: "You're now opening Gmail. Is this related to the analysis 
            you just did?"
  User:    "Yes. Whenever there are failed samples, I email my supervisor 
            with the sample IDs and values."
  
  → MimicAI stores: RULE: IF any_failed_samples THEN email_supervisor(failed_list)
  → MimicAI stores: CONSEQUENCE: this step is CONDITIONAL (only when failures exist)

[Recording ends]

MimicAI now has a REASONING MODEL, not just a sequence:
  1. Read data from SpectroPro screen (skip controls)
  2. Paste into Sheets at next empty row
  3. Calculate concentration = absorbance × $dilution_factor (user inputs this)
  4. IF concentration > 1.5 → mark as failed (red)
  5. IF any failures exist → email supervisor with details
  6. IF all pass → no email needed (learned from edge case question)
```

#### Why This Matters for the Marketplace

When a buyer installs this automation, they're not getting a dumb macro. They're getting an **intelligent agent** that:
- Understands WHAT to look for on screen
- Knows WHY each step matters
- Can handle EDGE CASES the creator explained
- Asks for VARIABLES that change between runs (like dilution factor)
- Makes DECISIONS based on learned rules (email only if failures)

This is what separates MimicAI from Zapier — Zapier replays sequences, MimicAI replays understanding.

### 3. Workflow Templates (Generated from Learned Reasoning)

After recording + Q&A, Claude synthesizes everything into a workflow template that encodes the REASONING, not just the steps:

```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  services: string[];               // required Token Vault connections
  
  // The learned understanding
  steps: WorkflowStep[];
  rules: LearnedRule[];             // conditional logic extracted from Q&A
  edgeCases: EdgeCase[];            // unusual situations and how to handle them
  variables: WorkflowVariable[];    // user inputs needed each run
  
  // Execution config  
  triggerType: "manual" | "schedule" | "event";
  triggerConfig: Record<string, any>;
  requiresScreenCapture: boolean;   // true if source is a screen, not an API
  sourceApp: string | null;         // "SpectroPro" — so buyer knows what app to have open
  
  // Marketplace
  isPublished: boolean;
  price: number;                    // 0 = free
}

interface WorkflowStep {
  id: string;
  order: number;
  
  // The action
  type: "read_screen" | "write_api" | "transform" | "decision" | "notify";
  service: string | null;           // null for screen reads, "sheets"/"gmail"/"slack" for API
  action: string;
  parameters: Record<string, any>;
  
  // The reasoning (from Curious Kid Q&A)
  purpose: string;                  // human-readable: "Check if sample passed QC"
  isConditional: boolean;
  condition: string | null;         // "concentration > 1.5"
  
  // Data flow
  inputFrom: string | null;        // step ID or "screen"
  outputTo: string | null;         // step ID or null
}
```

### 4. Token Vault Integration

**This is the hackathon requirement.** Every API call goes through Auth0 Token Vault:

- Creator connects services during recording setup → Token Vault stores tokens
- Buyer clicks "Install" → Auth0 consent flow → Token Vault stores THEIR tokens separately
- Worker fetches tokens from Token Vault per-user before each API call
- Token refresh is handled by Token Vault, never by us
- Zero tokens stored in our database

### 5. Marketplace

Creators publish workflows with a name, description, demo video, required services, and price. Buyers browse, preview the step sequence (without seeing raw API details), install by connecting their own accounts, and run the automation.

## Auth0 Token Vault — Implementation Pattern

**Auth0 SDK v4 uses `Auth0Client` (not `initAuth0`).** Auth routes are handled by middleware, not API catch-all routes.

```typescript
// lib/auth0.ts — ACTUAL IMPLEMENTATION
import { Auth0Client } from "@auth0/nextjs-auth0/server";
export const auth0 = new Auth0Client();

// src/middleware.ts — handles all auth routes
import { auth0 } from "@/lib/auth0";
export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}
export const config = { matcher: ["/auth/:path*", "/api/:path*"] };
```

**Auth0Client key methods (v4):**
- `auth0.getSession()` — get current user session
- `auth0.getAccessToken()` — get access token
- `auth0.getAccessTokenForConnection()` — Token Vault: get token for a specific service
- `auth0.withApiAuthRequired()` — protect API routes
- `auth0.withPageAuthRequired()` — protect pages

**Token Vault helpers (TODO — wire up when SDK is configured):**
```typescript
export async function getTokenForUser(userId: string, connection: string) {
  // Use auth0.getAccessTokenForConnection() with the connection name
  // Returns the access_token for that service from Token Vault
}
```

## Multi-Provider AI Engine

Users choose their preferred AI provider. The system uses a provider-agnostic interface so switching providers requires zero code changes. **Gemini 2.5 Flash is the default** (cheapest with great vision quality).

### Provider Costs Per Learning Session (5 min recording)
| Provider          | Input $/MTok | Output $/MTok | Cost per session | Cost per execution |
|-------------------|-------------|---------------|------------------|--------------------|
| Gemini 2.5 Flash  | $0.30       | $2.50         | **$0.23**        | **$0.004**         |
| GPT-4o mini       | $0.15       | $0.60         | $0.08            | $0.001             |
| GPT-4o            | $2.50       | $10.00        | $1.34            | $0.02              |
| Claude Sonnet 4   | $3.00       | $15.00        | $1.76            | $0.03              |

### Provider Interface

```typescript
// lib/ai/provider.ts

export interface AIProvider {
  name: string;
  interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation>;

  extractDataFromScreen(
    screenshotBase64: string,
    expectedDataSchema: Record<string, any>,
    sourceAppName: string
  ): Promise<ExtractedData | DataNotFoundError>;

  generateQuestion(
    step: LearnedStep,
    category: "identity" | "reason" | "rule" | "edge_case",
    context: string
  ): Promise<string>;

  synthesizeWorkflow(
    recordings: Recording[],
    allQA: QuestionAnswer[]
  ): Promise<WorkflowTemplate>;

  evaluateRules(
    rules: LearnedRule[],
    currentData: Record<string, any>,
    variables: Record<string, any>
  ): Promise<ExecutionPlan>;
}

export function createProvider(config: UserAIConfig): AIProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider(config.apiKey);
    case "openai":
      return new OpenAIProvider(config.apiKey);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    default:
      return new GeminiProvider(config.apiKey); // default to cheapest
  }
}
```

### Gemini Adapter (Default — Cheapest)

```typescript
// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { INTERPRET_PROMPT, EXTRACT_PROMPT, QUESTION_PROMPT } from "./prompts";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;
  private model;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation> {
    const result = await this.model.generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: screenshotBase64,
        },
      },
      INTERPRET_PROMPT(previousActions, context),
    ]);
    return JSON.parse(result.response.text());
  }

  async extractDataFromScreen(
    screenshotBase64: string,
    expectedDataSchema: Record<string, any>,
    sourceAppName: string
  ): Promise<ExtractedData | DataNotFoundError> {
    const result = await this.model.generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: screenshotBase64,
        },
      },
      EXTRACT_PROMPT(expectedDataSchema, sourceAppName),
    ]);
    return JSON.parse(result.response.text());
  }

  // ... other methods follow same pattern
}
```

### OpenAI Adapter

```typescript
// lib/ai/openai.ts
import OpenAI from "openai";
import { INTERPRET_PROMPT, EXTRACT_PROMPT } from "./prompts";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",  // or "gpt-4o-mini" for cheapest
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${screenshotBase64}` },
            },
            { type: "text", text: INTERPRET_PROMPT(previousActions, context) },
          ],
        },
      ],
    });
    return JSON.parse(response.choices[0].message.content!);
  }

  // ... other methods follow same pattern
}
```

### Anthropic Adapter

```typescript
// lib/ai/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import { INTERPRET_PROMPT, EXTRACT_PROMPT } from "./prompts";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: screenshotBase64,
              },
            },
            { type: "text", text: INTERPRET_PROMPT(previousActions, context) },
          ],
        },
      ],
    });
    return JSON.parse(response.content[0].text);
  }

  // ... other methods follow same pattern
}
```

### Shared Prompts (Provider-Agnostic)

```typescript
// lib/ai/prompts.ts
// All prompts are plain strings — same prompt works for any provider

export const INTERPRET_PROMPT = (
  previousActions: CapturedAction[],
  context: string
) => `You are MimicAI's screen interpreter. You have TWO jobs:

1. ACTION RECOGNITION: What is the user doing right now?
2. DATA EXTRACTION: What data values are visible on screen? Read ALL numbers, text, and tables you can see. Be precise — these values will be used in automation.

Previous actions: ${JSON.stringify(previousActions.slice(-5))}
User context: ${context}

Respond ONLY with a JSON object:
{
  "sourceApp": "name of the application visible on screen",
  "action": "read_data|type_value|click_button|switch_app|scroll|select|copy|paste",
  "actionTarget": "what element the user interacted with",
  "extractedData": {
    "type": "table|single_value|text_block|form_fields",
    "values": { "key": "value pairs of ALL data visible" },
    "rawText": "raw OCR text from the data region"
  },
  "destinationService": "gmail|sheets|slack|null",
  "destinationTarget": "specific location like Sheet1!B3 or null",
  "dataFlow": "read_from_screen|write_to_app|transform|navigate",
  "confidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestion": "question about the data or the pattern"
}

IMPORTANT: When you see a table, spreadsheet, or any structured data on screen,
extract EVERY value you can read. The user may be transcribing this data manually
and we want to automate that transcription.`;

export const EXTRACT_PROMPT = (
  expectedDataSchema: Record<string, any>,
  sourceAppName: string
) => `You are MimicAI's data extractor. Extract data from "${sourceAppName}" on screen.

Expected schema: ${JSON.stringify(expectedDataSchema, null, 2)}

Respond ONLY with a JSON object matching the schema with actual values from the screenshot.
Be extremely precise with numbers — these will be written to a spreadsheet.

If you cannot find the expected data, respond with:
{ "error": "DATA_NOT_FOUND", "reason": "explanation", "whatIsVisible": "description" }`;
```

## Screenshot Storage — Local Temp Files

**No cloud storage (S3, GCS, etc.).** Screenshots are ephemeral.

```typescript
// lib/screenshots.ts
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const TEMP_DIR = join(process.cwd(), "tmp", "screenshots");

export async function saveScreenshot(base64Data: string): Promise<string> {
  const filename = `${randomUUID()}.png`;
  const filepath = join(TEMP_DIR, filename);
  await writeFile(filepath, Buffer.from(base64Data, "base64"));
  return filepath;
}

export async function getScreenshotBase64(filepath: string): Promise<string> {
  const buffer = await readFile(filepath);
  return buffer.toString("base64");
}

export async function deleteScreenshot(filepath: string): Promise<void> {
  try { await unlink(filepath); } catch { /* already deleted, ignore */ }
}

// Cleanup: delete all temp screenshots older than 1 hour
export async function cleanupOldScreenshots(): Promise<void> {
  // Run on interval or after each recording completes
  const files = await readdir(TEMP_DIR);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const file of files) {
    const filepath = join(TEMP_DIR, file);
    const stats = await stat(filepath);
    if (stats.mtimeMs < oneHourAgo) await unlink(filepath);
  }
}
```

### Lifecycle of a Screenshot

```
1. Browser captures frame → base64 PNG
2. POST /api/capture → server saves to /tmp/mimicai/{uuid}.png
3. Worker picks up job → reads file → sends base64 to AI provider
4. AI returns structured JSON → stored in database
5. If LearningConversation needs to show the screenshot → read from /tmp
6. Recording completes → ALL temp files for this recording are deleted
7. Hourly cleanup cron → deletes any orphaned files older than 1 hour

After learning is complete:
  - The reasoning model (JSON) lives in the database forever
  - The screenshots are GONE — they served their purpose
  - Zero storage costs
```

## Database Schema (Key Tables)

**See `prisma/schema.prisma` for the actual source of truth.** The implemented schema includes:
- **User** — auth0Id, email, displayName, avatarUrl, soft delete
- **Workflow** — full reasoning model (steps, rules, edgeCases, variables as JSON), trigger config, marketplace fields
- **Recording** — learnedSteps, questions, extractedRules, status flow (recording → learning → complete)
- **Installation** — per-user workflow installs, connected services, unique constraint [userId, workflowId]
- **Execution** — tracks runs with stepsCompleted/stepsTotal, rulesApplied, variableInputs
- **AIUsage** — cost tracking per provider/model/operation

All models have proper indexes on foreign keys and query fields. Uses `prisma-client-js` generator (Prisma 6).

## Build Order (Phase by Phase)

### Phase 1 — Auth & Foundation ✅ COMPLETE
1. ✅ Next.js 14 project scaffold with Tailwind v3 + shadcn/ui (Radix UI)
2. ✅ Auth0 v4 integration (middleware-based, `Auth0Client`)
3. ✅ Token Vault helpers stubbed (needs Auth0 tenant credentials to wire up)
4. ✅ Prisma 6 schema with all 6 models (User, Workflow, Recording, Installation, Execution, AIUsage)
5. ✅ Dashboard, Record, Workflows, Marketplace, Settings pages with UI
6. ✅ Service adapters for Gmail, Sheets, Slack (via Token Vault)
7. ✅ Type system (workflow, action, marketplace types)
8. ✅ Custom error classes
9. ✅ Build passing (`npx next build` succeeds)

### Phase 2 — Screen Recording & Visual Data Extraction ✅ REDESIGNED
1. ✅ `useScreenCapture` hook — `getDisplayMedia()` + periodic JPEG capture every 2s + start/stop/pause/resume
2. ✅ Screenshot pipeline — client captures frame → POST `/api/capture` → saves to `tmp/screenshots/` → AI provider interprets → action returned → temp file cleaned up on session end
3. ✅ Multi-provider AI engine — `AIProvider` interface with `GeminiProvider`, `OpenAIProvider`, `AnthropicProvider` adapters; shared `INTERPRET_PROMPT` + `EXTRACT_PROMPT`; `createProvider()` factory
4. ✅ AI Vision interpretation endpoint — `POST /api/ai/interpret` (standalone) + `POST /api/capture` (integrated pipeline)
5. ✅ Action timeline UI — `ScreenCapture.tsx` (live preview + REC badge + controls) + `ActionTimeline.tsx` (reverse-chronological action list with extracted data preview, confidence badges)
6. ✅ Real-time SSE stream — `GET /api/capture/stream?sessionId=xxx` with heartbeat, replay of existing actions, listener-based push
7. ✅ Record page — full recording interface with inline AI config (provider + API key), screen capture panel, action timeline sidebar, stats bar
8. ✅ Session management — `lib/sessions.ts` in-memory session store with action history, temp file tracking, SSE listener registry
9. ✅ Demo mode — works without API key (captures screenshots, returns placeholder actions)
10. ✅ Build passing (`npx next build` succeeds)

### Phase 3 — Workflow Inference Engine ✅ REDESIGNED ("Infer First, Ask Later")
1. ✅ Multi-provider AI setup (done in Phase 2 — Gemini default, OpenAI + Claude as options)
2. ✅ Question generation via AI (identity, reason, rule, edge_case categories) — `src/lib/ai/learning.ts` + prompts
3. ✅ ClarifyDialog / ConversationPanel UI (screenshot + question + answer chat interface)
4. ✅ LearningFlow UI component (full Q&A flow after recording, with ActionReview + ConversationPanel)
5. ✅ Rule extraction from Q&A pairs (AI synthesizes IF/THEN logic via SYNTHESIS_PROMPT)
6. ✅ Edge case handling from Q&A (extracted during synthesis, editable in UnderstandingPanel)
7. ✅ UnderstandingPanel UI (tabbed view: Rules, Edge Cases, Variables, Step Summary — all editable)
8. ✅ Variable detection (VARIABLE_DETECTION_PROMPT identifies values that change between runs)
9. ✅ Recording status flow: recording → learning (questioning → synthesizing → reviewing → complete)

### Phase 4 — Workflow Generation & Execution ✅ COMPLETE
1. ✅ AI synthesizes recordings + Q&A into WorkflowTemplate with reasoning (`WORKFLOW_GENERATION_PROMPT` + `generateWorkflow()`)
2. ✅ Execution engine that follows learned rules (`lib/execution.ts` — step-by-step runner with rule evaluation, service calls, variable resolution)
3. ✅ Screen-to-API execution (AI Vision placeholder for screen reads → writes to Gmail/Sheets/Slack via service adapters)
4. ✅ Variable input UI (`WorkflowRunner.tsx` — collects user inputs before each run, type coercion, default values)
5. ✅ Conditional step execution (rule evaluation via AI, step skipping, mid-execution re-evaluation)
6. ✅ Workflow CRUD API (`/api/workflows` + `/api/workflows/[id]` — create, list, get, update, soft-delete)
7. ✅ Execution API (`/api/execute` + `/api/execute/[id]` �� start with variable inputs, poll status)
8. ✅ Workflow UI (`WorkflowCard`, `StepEditor`, `WorkflowRunner`) + updated list page with real data
9. ✅ Workflow detail page (`/workflows/[id]` — steps, rules, edge cases, variables, recordings, run panel)
10. ✅ Learning-to-workflow pipeline (finalize generates WorkflowTemplate via AI, saves to DB, redirects to detail page)
11. ✅ Build passing (`npx next build` succeeds)

### Phase 5 — Marketplace ✅ COMPLETE
1. ✅ Publish flow — Workflow detail page already has Publish/Unpublish toggle (Phase 4)
2. ✅ Browse / search marketplace — `/marketplace` page with search, service filters, sort (popular/newest/price)
3. ✅ Install flow with service connections — `InstallFlow` component simulates Auth0 Token Vault consent per service; POST/DELETE `/api/marketplace/[id]/install`
4. ✅ Run installed automation — buyers can open installed workflow and use `WorkflowRunner` from Phase 4
5. ✅ Show rules the automation uses — marketplace detail page has Rules tab with IF/THEN rules + WHEN/THEN edge cases for full transparency
6. ✅ Marketplace API — `GET /api/marketplace` (list + search + filter + sort), `GET /api/marketplace/[id]` (detail with step/rule/variable previews), install/uninstall endpoints
7. ✅ Build passing (`npx next build` succeeds)

### Phase 6 — Polish for Hackathon ✅ COMPLETE
1. ✅ Landing page — full-width hero with gradient, how-it-works, differentiators, live Q&A example, Auth0 Token Vault section, AI providers, CTA
2. ✅ 3-minute demo video script — `docs/DEMO_SCRIPT.md` with timed sections, speaker notes, and demo tips
3. ✅ Blog post draft — `docs/BLOG_POST.md` — "The Screen Is the Only API You Need"
4. ✅ README with setup instructions — complete with prerequisites, env vars, Auth0 config, project structure, deployment guide + Bonus Blog Post section
5. ✅ GitHub repository — [github.com/arkhangio10/mimicAI](https://github.com/arkhangio10/mimicAI)
6. Deploy to Vercel + Railway — ready to deploy (environment-dependent)

## Key Commands

```bash
# Infrastructure (Docker required)
docker-compose up -d     # Start PostgreSQL + Redis containers
npx prisma migrate dev   # Create/apply database migrations
npm run db:seed          # Seed demo data (4 workflows, 4 users, marketplace listings)
npm run db:setup         # Migrate + seed in one command

# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Open Prisma visual DB browser

# Production
npm run build            # Build (currently passing ✅)
npm run start
```

## Current Architecture Decisions (Updated 2026-04-06)

### Collect-Then-Process Recording Flow
Screenshots are collected locally in the browser during recording (every 3s, max 2 min). Zero API calls during recording. After stop, all screenshots are batch-sent to AI with a progress bar. This replaced the original real-time processing which was fragile (hot-reloads killed in-memory sessions, API calls slowed capture).

### "Infer First, Ask Later" Learning
The original Q&A flow asked 2-4 questions per screenshot (28+ questions for a 1-min recording = terrible UX). Replaced with a single `INFER_WORKFLOW_PROMPT` that analyzes all actions at once and produces the complete workflow. User reviews and confirms instead of answering questions. Old Q&A endpoints still exist but are not the primary flow.

### Client-Side Session Recovery
All learning endpoints accept a `recovery` context from the client. If the server loses the in-memory session (e.g., hot-reload during dev), the client resends the actions to rebuild it. This makes the flow resilient to server restarts.

### Server-Side API Key Resolution
AI API keys are resolved server-side: client key → env var fallback. No API key input needed in the frontend for the demo. The `GEMINI_API_KEY` in `.env` is used automatically.

### Gemini 2.5 Flash
Using `gemini-2.5-flash` (stable, good vision, ~$0.02/demo run). Gemini 2.0 Flash is deprecated. Free tier has 20 req/day limit — billing must be enabled for demo use.

### Token Vault — Gmail & Sheets Only (Demo Scope)
Service adapters use `auth0.getAccessTokenForConnection("google-oauth2")` to get Google tokens. Slack is stubbed out. Needs: Google OAuth credentials in Auth0 Dashboard + Token Vault enabled on the Auth0 application.

### Demo Data
`prisma/seed.ts` creates 4 users, 4 workflows (3 published on marketplace, 1 draft), and 2 installations. Run with `npm run db:seed`.

## Environment Variables

See `.env.example` for the template. Key variables:

```
# Auth0 (required for auth to work)
AUTH0_SECRET=             # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Database (required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mimicai?schema=public

# AI Providers (users provide their own via Settings UI)
DEFAULT_AI_PROVIDER=gemini
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Redis (required for BullMQ workers)
REDIS_URL=redis://localhost:6379
```

## Critical Constraints

- **NEVER store OAuth tokens in our database.** All token storage and refresh goes through Auth0 Token Vault. This is the #1 hackathon requirement.
- **Screenshots are temp files.** Saved to `/tmp/mimicai/` during recording, deleted after AI processes them. Hourly cleanup cron catches orphans. Zero cloud storage.
- **AI API keys resolved server-side.** For the demo, `GEMINI_API_KEY` in `.env` is used automatically. No key input needed in frontend. In production, users would enter their own keys.
- **Gemini 2.5 Flash is the default.** Stable model with good vision (~$0.02/demo run). Billing must be enabled — free tier is only 20 req/day.
- **AI calls must be cost-conscious.** Batch screenshots when possible. Use the cheapest model that gives good vision results.
- **Every API call to a third-party service must go through a service adapter** in `lib/services/`. No raw fetch calls to Gmail/Slack/etc scattered in components.
- **Mobile-responsive UI.** Judges may test on mobile.
- **Error handling everywhere.** Token Vault connections can fail, screenshots can be blurry, AI can hallucinate actions. Handle all gracefully.
