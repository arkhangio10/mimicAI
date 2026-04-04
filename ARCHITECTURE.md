# ARCHITECTURE.md — MimicAI System Architecture

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER'S SCREEN                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ANY APPLICATION (spectrophotometer, ERP, legacy software)   │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  Data visible on screen = MimicAI's data source        │  │   │
│  │  │  No API needed. No file export. Just pixels.           │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Recording    │  │  Workflow     │  │  Marketplace           │    │
│  │  Interface    │  │  Dashboard    │  │  Browse / Install      │    │
│  │              │  │              │  │                        │    │
│  │  MediaStream │  │  Timeline    │  │  Auth0 Consent Flow   │    │
│  │  Screenshots │  │  Editor      │  │  for Buyers            │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────────┘    │
│         │                 │                    │                    │
└─────────┼─────────────────┼────────────────────┼────────────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                            │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ /api/      │  │ /api/      │  │ /api/      │  │ /api/       │  │
│  │ capture    │  │ workflows  │  │ marketplace│  │ execute     │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
│        │               │               │                │          │
│  ┌─────▼───────────────▼───────────────▼────────────────▼──────┐   │
│  │                    SERVICE LAYER                              │   │
│  │  ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │ AI       │ │ gmail   │ │ sheets  │ │ slack   │          │   │
│  │  │ provider │ │ .ts     │ │ .ts     │ │ .ts     │          │   │
│  │  │ .ts      │ └────┬────┘ └────┬────┘ └───┬─────┘          │   │
│  │  │          │      │          │           │                │   │
│  │  │ READS    │      │   WRITES VIA TOKEN VAULT              │   │
│  │  │ SCREEN   │      │          │           │                │   │
│  │  └────┬─────┘ ┌────▼──────────▼───────────▼──────────┐     │   │
│  │       │       │        AUTH0 TOKEN VAULT              │     │   │
│  │       │       │  Per-user token isolation             │     │   │
│  │       │       │  Auto-refresh, consent management     │     │   │
│  │       │       └──────────────────────────────────────┘     │   │
│  └───────┼────────────────────────────────────────────────────┘   │
│          │                                                         │
└──────────┼─────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  AI VISION PROVIDER (user chooses one)            │
│                                                   │
│  ┌──────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Gemini 2.5   │ │ OpenAI      │ │ Anthropic │ │
│  │ Flash        │ │ GPT-4o      │ │ Claude    │ │
│  │ $0.30/MTok   │ │ $2.50/MTok  │ │ $3/MTok   │ │
│  │ ★ DEFAULT    │ │             │ │           │ │
│  └──────────────┘ └─────────────┘ └───────────┘ │
│                                                   │
│  Vision: reads screen pixels into structured data │
│  Text: generates questions, rules, transforms     │
└──────────────────────────────────────────────────┘

DATA FLOW SUMMARY:
  Screen (any app) ──AI Vision──▶ Structured Data ──Token Vault──▶ Google/Slack/etc
  
  INPUT = pixels on screen (no API required from source app)
  OUTPUT = API calls via Token Vault (Auth0 manages all tokens)
  BRIDGE = Claude Vision (the AI that reads like a human)
```

---

## 2. Data Flow: Recording a Workflow

```
User clicks "Record"
        │
        ▼
┌───────────────────┐
│ Browser requests   │
│ getDisplayMedia()  │──── User grants screen share permission
└────────┬──────────┘
         │
         ▼ Every 2 seconds
┌───────────────────┐
│ Capture frame      │
│ as PNG blob        │
│ (max 1024px wide)  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────────────┐
│ POST /api/capture │────▶│ Save to /tmp/mimicai/     │
│ with base64 frame │     │ {uuid}.png (temp file)    │
└────────┬──────────┘     └──────────────────────────┘
         │
         ▼
┌───────────────────┐
│ Add to BullMQ     │
│ interpret queue   │
│ (includes filepath│
│  to temp file)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ INTERPRETER WORKER                             │
│                                                │
│  1. Read screenshot from /tmp/mimicai/{uuid}   │
│  2. Load last 5 actions from Recording         │
│  3. Send to user's AI provider:                │
│     ┌─────────────────────────────────────┐    │
│     │ Gemini 2.5 Flash (default, $0.30)   │    │
│     │ — OR OpenAI GPT-4o ($2.50)          │    │
│     │ — OR Claude Sonnet 4 ($3.00)        │    │
│     └─────────────────────────────────────┘    │
│  4. TWO parallel outputs from AI:              │
│     a) ACTION: what the user did               │
│     b) DATA: what values are on screen         │
│  5. Build data-flow graph:                     │
│     "Data X was READ from App A screen"        │
│     "Data X was WRITTEN to App B"              │
│  6. Generate learning question (WHY?)          │
│  7. Append action + data to Recording in DB    │
│  8. Push real-time update to client via SSE    │
│  9. Keep temp file (needed for Learning UI)    │
│                                                │
│  KEY INSIGHT: The worker maps DATA FLOW, not   │
│  just actions. It tracks where each value      │
│  comes from (screen) and where it goes (API).  │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────┐
│ Client receives action via SSE     │
│                                    │
│ LearningConversation UI shows:     │
│   - Screenshot (loaded from temp)  │
│   - AI's question: "WHY did you    │
│     do this?"                      │
│   - User answers                   │
│   - AI stores rule/reasoning       │
│                                    │
│ This happens for EVERY step,       │
│ not just low-confidence ones.      │
└───────────────────┬───────────────┘
                    │
                    ▼ When user clicks "Stop Recording"
┌───────────────────────────────────┐
│ CLEANUP                            │
│                                    │
│ 1. AI synthesizes workflow from    │
│    all steps + Q&A → reasoning     │
│    model stored as JSON in DB      │
│ 2. Delete ALL temp screenshots     │
│    from /tmp/mimicai/              │
│ 3. Recording status → "complete"   │
│                                    │
│ After this point, screenshots      │
│ are GONE. Only the learned         │
│ reasoning model remains.           │
└───────────────────────────────────┘
```

---

## 3. Data Flow: Generating a Workflow Template

```
User completes 2-3 recordings of the same task
        │
        ▼
┌───────────────────────────────────────────────┐
│ POST /api/ai/generate-template                 │
│                                                │
│  Input:                                        │
│    - Recording 1: [action + extractedData...]  │
│    - Recording 2: [action + extractedData...]  │
│    - Recording 3: [action + extractedData...]  │
│    - All clarification Q&A pairs               │
│                                                │
│  Claude analyzes patterns:                     │
│    - What data was READ FROM SCREEN?           │
│    - What data was WRITTEN to which service?   │
│    - What transformations happened in between? │
│    - What varies across recordings?            │
│    - Which services need Token Vault tokens?   │
└────────┬──────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ WORKFLOW TEMPLATE (output)                     │
│                                                │
│  {                                             │
│    name: "Spectrophotometer → Analysis Sheet", │
│    dataSources: [                              │
│      {                                         │
│        type: "screen",                         │
│        app: "spectrophotometer_pro",           │
│        dataSchema: {                           │
│          "rows": [{                            │
│            "wavelength": "number",             │
│            "absorbance": "number"              │
│          }]                                    │
│        }                                       │
│      }                                         │
│    ],                                          │
│    services: ["sheets", "slack"],              │
│    steps: [                                    │
│      { type: "screen_read",                    │
│        source: "spectrophotometer_pro",        │
│        extract: "dataSchema above"             │
│      },                                        │
│      { type: "transform",                      │
│        action: "filter_zeros",                 │
│        rule: "exclude absorbance == 0.000"     │
│      },                                        │
│      { type: "transform",                      │
│        action: "calculate",                    │
│        formula: "concentration = absorbance *  │
│                  $dilution_factor"              │
│      },                                        │
│      { type: "api_write",                      │
│        service: "sheets",                      │
│        action: "append_rows",                  │
│        target: "Analysis!A:D",                 │
│        data: ["$wavelength", "$absorbance",    │
│               "$concentration", "$timestamp"]  │
│      },                                        │
│      { type: "api_write",                      │
│        service: "slack",                       │
│        action: "send_message",                 │
│        channel: "#lab-results",                │
│        template: "New reading: $row_count      │
│                   samples processed"           │
│      }                                         │
│    ],                                          │
│    variables: [                                │
│      { name: "dilution_factor",               │
│        type: "number",                         │
│        source: "user_input",                   │
│        default: 10 }                           │
│    ]                                           │
│  }                                             │
│                                                │
│  NOTE: "screen_read" steps use Claude Vision   │
│  at execution time. "api_write" steps use      │
│  Token Vault. This hybrid is MimicAI's moat.  │
└───────────────────────────────────────────────┘
```

---

## 4. Data Flow: Marketplace Install & Execute

```
Buyer browses marketplace → finds "Process Client Invoices"
        │
        ▼
┌──────────────────────┐
│ Click "Install"       │
│                       │
│ Required services:    │
│   ✗ Gmail             │
│   ✗ Google Sheets     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ AUTH0 TOKEN VAULT CONSENT FLOW            │
│                                          │
│  For each required service:              │
│    1. Redirect to Auth0 authorize URL    │
│    2. User logs into their Gmail/Sheets  │
│    3. User grants scopes                 │
│    4. Auth0 stores token in Token Vault  │
│    5. Redirect back to MimicAI           │
│                                          │
│  CRITICAL: Buyer's tokens are completely │
│  isolated from Creator's tokens.         │
│  Token Vault manages this automatically. │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Installation created  │
│ in database           │
│                       │
│ connectedServices:    │
│   ✓ Gmail             │
│   ✓ Google Sheets     │
│ isActive: true        │
└────────┬─────────────┘
         │
         ▼  (On trigger or manual run)
┌──────────────────────────────────────────┐
│ EXECUTOR WORKER                           │
│                                          │
│  For each step in workflow:              │
│    1. Get buyer's token from Token Vault │
│    2. Call service adapter               │
│    3. Pass output as input to next step  │
│    4. Log execution result               │
│                                          │
│  Token Vault handles refresh silently.   │
│  If re-auth needed → notify buyer.       │
└──────────────────────────────────────────┘
```

---

## 4b. Data Flow: Screen-Reading Execution (The Key Innovation)

This flow handles automations where the SOURCE is a screen (no API), 
and the DESTINATION is a Token Vault service.

```
Buyer clicks "Run Automation" while spectrophotometer app is visible
        │
        ▼
┌──────────────────────────────────────────────────┐
│ SCREEN-TO-API EXECUTION                           │
│                                                   │
│  Phase 1 — CAPTURE SOURCE DATA FROM SCREEN        │
│  ┌──────────────────────────────────────────┐     │
│  │ 1. Browser captures current screen        │     │
│  │ 2. Screenshot sent to user's AI provider  │     │
│  │    (Gemini / OpenAI / Claude — in memory, │     │
│  │     no temp file needed for execution)    │     │
│  │ 3. AI extracts data using the schema      │     │
│  │    learned during recording:              │     │
│  │                                           │     │
│  │    Expected: { wavelength: number,        │     │
│  │               absorbance: number }[]      │     │
│  │                                           │     │
│  │    Extracted: [                            │     │
│  │      { wavelength: 450, absorbance: 0.832 }│    │
│  │      { wavelength: 500, absorbance: 0.654 }│    │
│  │      { wavelength: 550, absorbance: 0.441 }│    │
│  │    ]                                      │     │
│  │                                           │     │
│  │ 4. If data doesn't match schema:          │     │
│  │    → Ask user "I can't find the readings. │     │
│  │       Is the spectrophotometer app open?" │     │
│  └──────────────────────────────────────────┘     │
│                                                   │
│  Phase 2 — TRANSFORM (learned from recording)     │
│  ┌──────────────────────────────────────────┐     │
│  │ Apply transformations the user taught:    │     │
│  │  - Filter out absorbance == 0.000         │     │
│  │  - Calculate concentration using formula  │     │
│  │  - Flag values above threshold 1.5        │     │
│  └──────────────────────────────────────────┘     │
│                                                   │
│  Phase 3 — WRITE TO DESTINATION VIA TOKEN VAULT   │
│  ┌──────────────────────────────────────────┐     │
│  │ 1. Get buyer's Google token from Vault    │     │
│  │ 2. Open Google Sheets via API             │     │
│  │ 3. Write extracted data to correct cells  │     │
│  │ 4. Apply formatting (highlight >1.5 red)  │     │
│  │ 5. Save with naming convention            │     │
│  │ 6. Get buyer's Slack token from Vault     │     │
│  │ 7. Post "Analysis complete" to #lab       │     │
│  └──────────────────────────────────────────┘     │
│                                                   │
│  The screen is the INPUT.                         │
│  Token Vault APIs are the OUTPUT.                 │
│  Claude Vision is the bridge.                     │
└──────────────────────────────────────────────────┘
```

### The Two Execution Patterns

```
PATTERN A: API → API (traditional automation)
  Gmail (via Token Vault) → transform → Sheets (via Token Vault)
  
PATTERN B: SCREEN → API (MimicAI's innovation)
  Spectrophotometer screen → AI Vision reads data (in memory, no temp file) → 
  transform → Sheets (via Token Vault)
  
PATTERN C: SCREEN → API → API (hybrid)
  Lab software screen → AI Vision reads patient ID →
  Gmail (search by patient ID via Token Vault) → 
  Sheets (log results via Token Vault)

NOTE: During execution, screenshots are processed in memory only.
Temp files are only used during RECORDING (learning phase).
```

---

## 5. Auth0 Token Vault — Multi-Tenant Token Isolation

```
┌─────────────────────────────────────────────────┐
│              AUTH0 TOKEN VAULT                    │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │  Creator (Alice)                         │     │
│  │  ┌────────────┐  ┌────────────┐         │     │
│  │  │ Gmail      │  │ Sheets     │         │     │
│  │  │ read+send  │  │ read+write │         │     │
│  │  │ Token: A1  │  │ Token: A2  │         │     │
│  │  └────────────┘  └────────────┘         │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │  Buyer (Bob)                             │     │
│  │  ┌────────────┐  ┌────────────┐         │     │
│  │  │ Gmail      │  │ Sheets     │         │     │
│  │  │ read+send  │  │ read+write │         │     │
│  │  │ Token: B1  │  │ Token: B2  │         │     │
│  │  └────────────┘  └────────────┘         │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │  Buyer (Carol)                           │     │
│  │  ┌────────────┐  ┌────────────┐         │     │
│  │  │ Gmail      │  │ Sheets     │         │     │
│  │  │ read only  │  │ read+write │         │     │
│  │  │ Token: C1  │  │ Token: C2  │         │     │
│  │  └────────────┘  └────────────┘         │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  Tokens NEVER cross user boundaries.             │
│  Each user authorizes independently.             │
│  Refresh handled per-user automatically.         │
└─────────────────────────────────────────────────┘
```

---

## 6. Component Architecture

```
App Layout
├── Navbar
│   ├── Logo
│   ├── Navigation Links
│   ├── TokenStatus (connected services indicator)
│   └── UserMenu (Auth0 profile / logout)
│
├── /record (Recording + Learning Page)
│   ├── ScreenCapture
│   │   ├── CapturePreview (live screen thumbnail)
│   │   ├── RecordButton (start / stop / pause)
│   │   └── PrivacyIndicator (red dot when recording)
│   ├── ActionTimeline
│   │   ├── ActionCard (per detected action)
│   │   │   ├── ServiceBadge (source app icon)
│   │   │   ├── ActionDescription ("Read data from SpectroPro")
│   │   │   ├── ExtractedDataPreview (values found on screen)
│   │   │   ├── ReasoningBadge (shows learned WHY)
│   │   │   └── ScreenshotThumbnail
│   │   └── TimelineConnector (visual line between actions)
│   ├── LearningConversation (THE CORE UI)
│   │   ├── ScreenshotHighlight (zoomed screenshot with highlight)
│   │   ├── QuestionBubble (MimicAI's question)
│   │   ├── AnswerInput (text + quick-reply buttons)
│   │   ├── CategoryIndicator (identity / reason / rule / edge_case)
│   │   ├── LearnedRulePreview ("I now understand: IF x THEN y")
│   │   └── ConversationHistory (all Q&A for this recording)
│   └── UnderstandingPanel (sidebar)
│       ├── LearnedRules list ("IF absorbance > 1.5 → fail")
│       ├── Variables detected ("dilution_factor: user input")
│       ├── EdgeCases covered ("all pass → no email")
│       └── ConfidenceScore ("I understand 7/10 steps")
│
├── /workflows (My Workflows)
│   ├── WorkflowCard (per workflow)
│   │   ├── ServiceBadges
│   │   ├── StepCount
│   │   ├── RecordingCount
│   │   ├── PublishStatus
│   │   └── Actions (Edit / Record More / Publish / Run)
│   └── CreateWorkflowButton
│
├── /workflows/[id] (Workflow Detail)
│   ├── StepEditor
│   │   ├── StepCard (draggable, per step)
│   │   │   ├── ServiceSelector
│   │   │   ├── ActionConfig
│   │   │   └── VariableMapper
│   │   └── AddStepButton
│   ├── VariablePanel (list of extracted variables)
│   ├── TriggerConfig (manual / schedule / event)
│   ├── TestRunner (dry-run with real tokens)
│   └── PublishPanel (name, price, description, demo)
│
├── /marketplace (Browse)
│   ├── SearchBar
│   ├── FilterSidebar (service, price, category)
│   ├── AutomationCard (per listing)
│   │   ├── CreatorAvatar
│   │   ├── StepPreview (visual flow)
│   │   ├── RequiredServices
│   │   ├── Price
│   │   └── InstallButton
│   └── Pagination
│
├── /marketplace/[id] (Automation Detail)
│   ├── DemoVideo
│   ├── StepByStepPreview (read-only visual flow)
│   ├── RequiredServices with scope descriptions
│   ├── InstallFlow
│   │   ├── ServiceConnectionChecklist
│   │   ├── Auth0ConsentButton (per service)
│   │   └── ActivateButton
│   └── Reviews / Ratings
│
└── /settings
    ├── ConnectedServices
    │   ├── ServiceCard (per connection)
    │   │   ├── ConnectionStatus
    │   │   ├── ScopesGranted
    │   │   ├── ReconnectButton
    │   │   └── DisconnectButton
    │   └── AddServiceButton
    ├── InstalledAutomations
    │   ├── AutomationCard (per install)
    │   │   ├── Toggle (active/paused)
    │   │   ├── LastRunStatus
    │   │   └── UninstallButton
    │   └── ExecutionLog
    └── EarningsDashboard (for creators)
        ├── RevenueChart
        ├── InstallCount
        └── PayoutSettings
```

---

## 7. Database Schema (ERD)

```
┌──────────────┐       ┌───────────────┐       ┌──────────────────┐
│    User       │       │   Workflow     │       │   Recording       │
├──────────────┤       ├───────────────┤       ├──────────────────┤
│ id (PK)      │◄──┐   │ id (PK)       │◄──┐   │ id (PK)          │
│ email        │   │   │ name          │   │   │ workflowId (FK)  │──►│
│ auth0Id      │   │   │ description   │   │   │ actions (JSON)   │
│ displayName  │   │   │ creatorId(FK) │───┘   │ clarifications   │
│ avatarUrl    │   │   │ services[]    │       │ status           │
│ createdAt    │   │   │ steps (JSON)  │       │ createdAt        │
└──────────────┘   │   │ variables     │       └──────────────────┘
       │           │   │ triggerType   │
       │           │   │ triggerConfig │       ┌──────────────────┐
       │           │   │ isPublished   │       │  Installation     │
       │           │   │ price         │       ├──────────────────┤
       │           │   │ createdAt     │       │ id (PK)          │
       │           │   └───────────────┘       │ userId (FK)      │──►│
       │           │          │                │ workflowId (FK)  │──►│
       │           │          │                │ connectedSvcs[]  │
       │           └──────────┼───────────┐    │ isActive         │
       │                      │           │    │ lastRunAt        │
       │                      ▼           │    │ createdAt        │
       │           ┌───────────────┐      │    └──────────────────┘
       │           │  Execution     │      │
       │           ├───────────────┤      │    ┌──────────────────┐
       │           │ id (PK)       │      │    │  AIUsage          │
       │           │ installId(FK) │      │    ├──────────────────┤
       └──────────►│ userId (FK)   │      │    │ id (PK)          │
                   │ workflowId(FK)│──────┘    │ userId (FK)      │
                   │ status        │           │ provider         │
                   │ stepsCompleted│           │ model            │
                   │ stepsTotal    │           │ inputTokens      │
                   │ error         │           │ outputTokens     │
                   │ startedAt     │           │ estimatedCost    │
                   │ completedAt   │           └──────────────────┘
                   └───────────────┘
```

---

## 8. API Endpoints

```
Authentication
  POST   /api/auth/login           Auth0 login redirect
  POST   /api/auth/logout          Auth0 logout
  GET    /api/auth/me              Current user session
  POST   /api/auth/connect/:svc    Initiate Token Vault connection

Screen Capture
  POST   /api/capture              Upload screenshot frame
  GET    /api/capture/stream       SSE stream for real-time actions

Workflows
  GET    /api/workflows            List user's workflows
  POST   /api/workflows            Create new workflow
  GET    /api/workflows/:id        Get workflow detail
  PATCH  /api/workflows/:id        Update workflow
  DELETE /api/workflows/:id        Soft delete workflow
  POST   /api/workflows/:id/record Start new recording session
  POST   /api/workflows/:id/generate  Generate template from recordings

Marketplace
  GET    /api/marketplace          Browse published automations
  GET    /api/marketplace/:id      Automation detail
  POST   /api/marketplace/:id/install  Install automation
  DELETE /api/marketplace/:id/uninstall  Uninstall

Execution
  POST   /api/execute/:installId   Trigger manual execution
  GET    /api/execute/:installId/status  Execution status
  GET    /api/execute/history      Execution history

AI
  POST   /api/ai/interpret         Interpret single screenshot
  POST   /api/ai/clarify           Generate clarification question
  POST   /api/ai/generate-template Generate workflow from recordings
```

---

## 9. Technology Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | Next.js 14 App Router | SSR for marketplace SEO, API routes co-located, React Server Components reduce client bundle |
| Auth | Auth0 for AI Agents | Hackathon requirement. Token Vault is the entire value proposition |
| AI | **Multi-provider** (Gemini default) | Users choose: Gemini 2.5 Flash ($0.30/MTok, great vision), GPT-4o ($2.50), or Claude Sonnet 4 ($3). Provider interface makes switching zero-effort |
| DB | PostgreSQL + Prisma | Reliable, JSON column support for flexible workflow schemas, great DX with Prisma |
| Queue | BullMQ + Redis | Screenshot processing needs background workers. BullMQ is battle-tested with good retry/backoff |
| Screenshot Storage | **Local temp files** (`/tmp`) | Screenshots saved during recording only (for Learning UI), deleted after workflow is learned. Zero cloud storage cost, zero config |
| Styling | Tailwind + shadcn/ui | Fast to build, consistent, accessible. No time for custom design systems in a hackathon |
| Real-time | SSE (Server-Sent Events) | Simpler than WebSockets for one-way server→client action feed. No library needed |
| Deploy | Vercel + Railway | Vercel for Next.js (free tier), Railway for Redis + BullMQ workers (cheap) |

---

## 10. Security Model

```
┌─────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARIES                      │
│                                                         │
│  Browser ◄──── HTTPS only ────► Next.js Server          │
│                                     │                   │
│                                     │ Server-side only  │
│                                     ▼                   │
│                              ┌─────────────┐            │
│                              │ Auth0 SDK    │            │
│                              │ Session      │            │
│                              │ (httpOnly    │            │
│                              │  cookie)     │            │
│                              └──────┬──────┘            │
│                                     │                   │
│               ┌─────────────────────┼───────────┐       │
│               │                     │           │       │
│               ▼                     ▼           ▼       │
│        Token Vault           Claude API     Database    │
│        (Auth0 managed)      (API key in     (connection │
│                              env only)      string in   │
│        We NEVER see                         env only)   │
│        user tokens                                      │
│                                                         │
│  PRINCIPLE: Our server is a broker, not a token holder. │
│  We request tokens from Token Vault per-request,        │
│  use them for one API call, and discard.                │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Deployment Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│   Vercel       │     │   Railway      │     │   External         │
│                │     │                │     │                    │
│  Next.js App   │     │  BullMQ Worker │     │  Auth0             │
│  (Frontend +   │     │  (Interpreter  │     │  Token Vault       │
│   API Routes)  │     │   + Executor)  │     │                    │
│                │     │                │     │  AI Providers:     │
│  ENV:          │     │  ENV:          │     │  ┌──────────────┐ │
│  - AUTH0_*     │     │  - REDIS_URL   │     │  │ Gemini API   │ │
│  - DATABASE_URL│     │  - DATABASE_URL│     │  │ (default)    │ │
│  - REDIS_URL   │     │  - AUTH0_*     │     │  ├──────────────┤ │
│                │     │                │     │  │ OpenAI API   │ │
│  Temp files:   │     │  Temp files:   │     │  ├──────────────┤ │
│  /tmp/mimicai/ │     │  /tmp/mimicai/ │     │  │ Anthropic API│ │
│  (auto-cleaned)│     │  (auto-cleaned)│     │  └──────────────┘ │
│                │     │                │     │                    │
│                │     │                │     │  Gmail API         │
│                │     │                │     │  Sheets API        │
│                │     │                │     │  Slack API         │
└───────┬───────┘     └───────┬───────┘     └───────────────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Railway Postgres    │
        │  Railway Redis       │
        └─────────────────────┘

NO S3. NO CLOUD STORAGE. Screenshots live in /tmp and die after learning.
AI API keys are per-user (stored encrypted in session, not in our DB).
```

---

## 12. MVP Scope for Hackathon (What to Actually Build)

### Must Have (Demo Day)
- [ ] Auth0 login + 3 Token Vault connections (Gmail, Sheets, Slack)
- [ ] Screen recording with live screenshot capture to temp files
- [ ] AI Vision (Gemini default) interpreting 10+ screenshots into actions + data
- [ ] Learning conversation with WHY questions (at least 5 during demo)
- [ ] Learned rules visible in UnderstandingPanel ("IF absorbance > 1.5 THEN fail")
- [ ] One complete workflow generated from recordings with reasoning model
- [ ] Marketplace page with the workflow published
- [ ] Second user installs it, connects their own accounts via Token Vault
- [ ] Automation runs on buyer's accounts successfully (with learned rules applied)
- [ ] Temp files cleaned up after workflow is learned

### Nice to Have
- [ ] Multi-provider AI selection in Settings (Gemini / OpenAI / Claude)
- [ ] Scheduled triggers (cron-based execution)
- [ ] Workflow step editor (manual adjustments)
- [ ] Earnings dashboard for creators
- [ ] Multiple workflow categories
- [ ] Ratings/reviews on marketplace

### Skip for Now
- Real payment processing (show price but use fake checkout)
- Mobile screen recording
- More than 3 service integrations
- User-to-user messaging
- Analytics dashboard
