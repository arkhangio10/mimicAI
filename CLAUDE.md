# CLAUDE.md — MimicAI Master Prompt

## Identity

You are the lead engineer building **MimicAI**, a platform where users record their screen to teach AI agents repetitive workflows, then sell those learned automations on a marketplace. Think "Zapier meets screen recording meets an apprentice that learns by watching."

## Project Summary

MimicAI captures user screen activity in real-time, using AI Vision (Gemini, OpenAI, or Claude — user chooses) not just to understand WHAT the user is doing, but to READ THE ACTUAL DATA visible on screen. The screen is the data source — no file exports, no CSVs, no copy-paste. AI Vision extracts numbers, text, tables, and values directly from pixels, just like a human apprentice looking over your shoulder.

The platform then asks clarifying questions like a curious child ("Why did you put that number there?"), learns the full workflow, and produces replayable automations. Creators sell these automations on a marketplace where buyers install them and run them on their own connected accounts via Auth0 Token Vault.

### The Two Modes of Screen Reading

1. **Learning Mode (Recording):** AI Vision watches the screen to understand the PATTERN — what app is open, what data the user reads, where they put it, what transformations they apply. Screenshots are saved as temp files during recording, sent to the AI, then deleted once the workflow is learned.

2. **Execution Mode (Running):** AI Vision watches the screen AGAIN to extract REAL DATA VALUES from the source application, then writes those values to destination services (Google Sheets, Gmail, Slack) via Token Vault APIs. Screenshots are processed in-memory and never stored.

This means MimicAI can automate tasks where the source application has NO API — like reading data from a spectrophotometer program, a legacy desktop app, a PDF viewer, or any software that shows data on screen.

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Frontend         | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend API      | Next.js API Routes + Node.js                    |
| AI Engine        | **Multi-provider** — Gemini 2.5 Flash (default, cheapest), OpenAI GPT-4o, Claude Sonnet 4 |
| Auth & Tokens    | Auth0 for AI Agents — Token Vault               |
| Database         | PostgreSQL (Prisma ORM)                          |
| Queue / Cron     | BullMQ + Redis                                   |
| Screen Capture   | Browser MediaStream API + periodic screenshots   |
| Screenshot Storage | **Local temp files** (`/tmp/mimicai/`) — deleted after AI processes them |
| Deployment       | Vercel (frontend) + Railway (backend workers)    |

## Directory Structure

```
mimicai/
├── CLAUDE.md                  # This file — master prompt
├── RULES.md                   # Coding standards and conventions
├── docs/
│   └── ARCHITECTURE.md        # System architecture document
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing / dashboard
│   │   ├── record/
│   │   │   └── page.tsx       # Screen recording interface
│   │   ├── workflows/
│   │   │   ├── page.tsx       # My workflows list
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Workflow detail / edit
│   │   ├── marketplace/
│   │   │   ├── page.tsx       # Browse automations
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Automation detail / install
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...auth0]/route.ts
│   │   │   ├── capture/
│   │   │   │   └── route.ts   # Receives screenshots from client
│   │   │   ├── workflows/
│   │   │   │   └── route.ts   # CRUD workflows
│   │   │   ├── marketplace/
│   │   │   │   └── route.ts   # List / install automations
│   │   │   ├── execute/
│   │   │   │   └── route.ts   # Run an automation
│   │   │   └── ai/
│   │   │       ├── interpret/
│   │   │       │   └── route.ts  # Claude Vision: screenshot → action
│   │   │       └── clarify/
│   │   │           └── route.ts  # Claude: generate clarifying questions
│   │   └── settings/
│   │       └── page.tsx       # Connected services, Token Vault
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── recorder/
│   │   │   ├── ScreenCapture.tsx
│   │   │   ├── ActionTimeline.tsx
│   │   │   └── ClarifyDialog.tsx
│   │   ├── workflows/
│   │   │   ├── WorkflowCard.tsx
│   │   │   ├── StepEditor.tsx
│   │   │   └── WorkflowRunner.tsx
│   │   ├── marketplace/
│   │   │   ├── AutomationCard.tsx
│   │   │   └── InstallFlow.tsx
│   │   └── shared/
│   │       ├── Navbar.tsx
│   │       ├── ServiceBadge.tsx
│   │       └── TokenStatus.tsx
│   ├── lib/
│   │   ├── auth0.ts           # Auth0 SDK config + Token Vault helpers
│   │   ├── ai/                # Multi-provider AI engine
│   │   │   ├── provider.ts    # Provider interface + factory
│   │   │   ├── gemini.ts      # Google Gemini adapter (default, cheapest)
│   │   │   ├── openai.ts      # OpenAI GPT adapter
│   │   │   ├── anthropic.ts   # Anthropic Claude adapter
│   │   │   └── prompts.ts     # Shared system prompts (provider-agnostic)
│   │   ├── screenshots.ts     # Temp file management (save to /tmp, cleanup)
│   │   ├── prisma.ts          # DB client singleton
│   │   ├── queue.ts           # BullMQ job definitions
│   │   └── services/
│   │       ├── gmail.ts       # Gmail API adapter (via Token Vault)
│   │       ├── sheets.ts      # Google Sheets adapter (via Token Vault)
│   │       ├── slack.ts       # Slack API adapter (via Token Vault)
│   │       └── index.ts       # Service registry
│   ├── hooks/
│   │   ├── useScreenCapture.ts
│   │   ├── useWorkflow.ts
│   │   └── useTokenVault.ts
│   ├── types/
│   │   ├── workflow.ts
│   │   ├── action.ts
│   │   └── marketplace.ts
│   └── workers/
│       ├── interpreter.ts     # Processes screenshot queue
│       └── executor.ts        # Runs automations on schedule
├── prisma/
│   └── schema.prisma
├── public/
├── .env.example
├── package.json
├── tsconfig.json
└── tailwind.config.ts
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

```typescript
// lib/auth0.ts
import { TokenVault } from "@anthropic/auth0-ai-agents";

export async function getTokenForUser(userId: string, service: string) {
  const token = await tokenVault.getToken({
    userId,
    connection: service, // "google", "slack", "linear"
  });
  return token.access_token;
}

export async function initiateConnection(userId: string, service: string) {
  // Returns URL for Auth0 consent flow
  return tokenVault.createAuthorizationURL({
    userId,
    connection: service,
    scopes: SERVICE_SCOPES[service],
  });
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

```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  auth0Id        String          @unique
  createdAt      DateTime        @default(now())
  workflows      Workflow[]
  installations  Installation[]
}

model Workflow {
  id                   String      @id @default(cuid())
  name                 String
  description          String
  creator              User        @relation(fields: [creatorId], references: [id])
  creatorId            String
  services             String[]    // required Token Vault connections
  steps                Json        // WorkflowStep[] (includes reasoning)
  rules                Json        // LearnedRule[] (IF/THEN logic from Q&A)
  edgeCases            Json?       // EdgeCase[] (unusual situations)
  variables            Json        // WorkflowVariable[] (user inputs per run)
  triggerType          String      @default("manual")
  triggerConfig        Json?
  requiresScreenCapture Boolean    @default(false)
  sourceApp            String?     // "SpectroPro" — app that must be visible
  isPublished          Boolean     @default(false)
  price                Float       @default(0)
  recordings           Recording[]
  installations        Installation[]
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
}

model Recording {
  id             String          @id @default(cuid())
  workflow       Workflow         @relation(fields: [workflowId], references: [id])
  workflowId     String
  learnedSteps   Json            // LearnedStep[] (observation + reasoning per step)
  questions      Json            // QuestionAnswer[] (full learning conversation)
  extractedRules Json?           // LearnedRule[] (rules discovered in THIS recording)
  status         String          @default("recording") // recording | learning | complete
  createdAt      DateTime        @default(now())
}

model Installation {
  id             String          @id @default(cuid())
  user           User            @relation(fields: [userId], references: [id])
  userId         String
  workflow       Workflow         @relation(fields: [workflowId], references: [id])
  workflowId     String
  connectedServices String[]     // which Token Vault connections are active
  isActive       Boolean         @default(true)
  lastRunAt      DateTime?
  createdAt      DateTime        @default(now())

  @@unique([userId, workflowId])
}

model Execution {
  id             String          @id @default(cuid())
  installationId String
  userId         String
  workflowId     String
  status         String          @default("running") // running | completed | failed | needs_input
  stepsCompleted Int             @default(0)
  stepsTotal     Int
  rulesApplied   Json?           // which LearnedRules fired during this run
  variableInputs Json?           // user-provided values for this run
  error          String?
  startedAt      DateTime        @default(now())
  completedAt    DateTime?
}
```

## Build Order (Phase by Phase)

### Phase 1 — Auth & Foundation
1. Next.js project scaffold with Tailwind + shadcn/ui
2. Auth0 integration (login, signup, session)
3. Token Vault setup — connect Gmail, Sheets, Slack
4. Prisma schema + database migration
5. Basic dashboard layout

### Phase 2 — Screen Recording & Visual Data Extraction
1. `useScreenCapture` hook with MediaStream API
2. Screenshot pipeline (client → API → temp file → AI provider → delete temp)
3. AI Vision interpretation endpoint (action recognition + data extraction)
4. Action timeline UI with extracted data preview
5. Real-time SSE stream for live action feed

### Phase 3 — Learning Engine (THE CORE — spend the most time here)
1. Multi-provider AI setup (Gemini default, OpenAI + Claude as options)
2. Question generation via AI (identity, reason, rule, edge_case categories)
3. LearningConversation UI component (screenshot + question + answer)
4. Rule extraction from Q&A pairs (AI synthesizes IF/THEN logic)
5. Edge case handling from Q&A
6. UnderstandingPanel UI (shows learned rules, variables, confidence)
7. Variable detection (values that change between runs)
8. Recording status flow: recording → learning → complete

### Phase 4 — Workflow Generation & Execution
1. AI synthesizes recordings + Q&A into WorkflowTemplate with reasoning
2. Execution engine that follows learned rules (not just replays steps)
3. Screen-to-API execution (AI Vision reads live screen → writes to API via Token Vault)
4. Variable input UI (ask buyer for dilution_factor, etc. before each run)
5. Conditional step execution (skip email if no failures)

### Phase 5 — Marketplace
1. Publish flow (name, description, price, required apps, demo)
2. Browse / search marketplace
3. Install flow with Auth0 consent per service
4. Run installed automation (with screen capture if needed)
5. Show which rules the automation uses (transparency for buyers)

### Phase 6 — Polish for Hackathon
1. Landing page with compelling demo
2. 3-minute demo video script and recording
3. Blog post draft
4. README with setup instructions
5. Deploy to Vercel + Railway

## Key Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run db:push          # Push Prisma schema
npm run db:seed          # Seed sample data
npm run worker           # Start BullMQ workers

# Production
npm run build
npm run start

# Testing
npm run test
npm run test:e2e
```

## Environment Variables

```
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_TOKEN_VAULT_API_KEY=

# AI Providers (users provide their own via Settings UI)
# These are FALLBACK defaults for development only
DEFAULT_AI_PROVIDER=gemini           # gemini | openai | anthropic
GEMINI_API_KEY=                       # default Gemini key (dev only)
OPENAI_API_KEY=                       # optional
ANTHROPIC_API_KEY=                    # optional

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379
```

## Critical Constraints

- **NEVER store OAuth tokens in our database.** All token storage and refresh goes through Auth0 Token Vault. This is the #1 hackathon requirement.
- **Screenshots are temp files.** Saved to `/tmp/mimicai/` during recording, deleted after AI processes them. Hourly cleanup cron catches orphans. Zero cloud storage.
- **AI API keys belong to users.** Each user enters their own Gemini/OpenAI/Anthropic key in Settings. We never store keys in our database — encrypt in session or use Auth0 custom claims.
- **Gemini 2.5 Flash is the default.** Cheapest provider with good vision. Guide users toward it but let them choose.
- **AI calls must be cost-conscious.** Batch screenshots when possible. Use the cheapest model that gives good vision results.
- **Every API call to a third-party service must go through a service adapter** in `lib/services/`. No raw fetch calls to Gmail/Slack/etc scattered in components.
- **Mobile-responsive UI.** Judges may test on mobile.
- **Error handling everywhere.** Token Vault connections can fail, screenshots can be blurry, AI can hallucinate actions. Handle all gracefully.
