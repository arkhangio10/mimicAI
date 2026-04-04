# RULES.md — MimicAI Coding Standards & Conventions

## Golden Rules

1. **Token Vault is sacred.** Zero tokens stored outside Auth0. If you're tempted to cache a token in Redis or a variable, stop. Call Token Vault.
2. **Privacy by default.** Screenshots are processed then deleted. User data never leaves the pipeline without explicit consent.
3. **Fail gracefully.** Every external call (Claude API, Token Vault, third-party APIs) can fail. Show the user what happened and what to do next.
4. **Ship the demo.** This is a hackathon. Perfect is the enemy of shipped. If a feature doesn't improve the 3-minute demo, skip it.

---

## TypeScript

- **Strict mode enabled.** No `any` types unless wrapping an untyped third-party library, and even then, cast immediately.
- **Interfaces over types** for object shapes. Use `type` only for unions, intersections, and utility types.
- **Zod for runtime validation.** Every API route validates input with Zod schemas. Never trust `req.body` raw.
- **No enums.** Use `as const` objects with derived types:
  ```typescript
  export const ServiceNames = {
    GMAIL: "gmail",
    SHEETS: "sheets",
    SLACK: "slack",
    LINEAR: "linear",
  } as const;
  export type ServiceName = (typeof ServiceNames)[keyof typeof ServiceNames];
  ```
- **Explicit return types** on all exported functions and API handlers.
- **No default exports** except for Next.js pages/layouts (required by framework).

---

## File & Naming Conventions

| Item                  | Convention            | Example                    |
| --------------------- | --------------------- | -------------------------- |
| React components      | PascalCase            | `WorkflowCard.tsx`         |
| Hooks                 | camelCase, `use` prefix | `useScreenCapture.ts`    |
| Utilities / libs      | camelCase              | `claude.ts`, `auth0.ts`   |
| API routes            | kebab-case dirs        | `api/workflows/route.ts`  |
| Types / interfaces    | PascalCase             | `WorkflowTemplate`        |
| Constants             | UPPER_SNAKE_CASE       | `MAX_SCREENSHOT_INTERVAL`  |
| Database fields       | camelCase (Prisma)     | `createdAt`, `workflowId` |
| CSS classes           | Tailwind only          | No custom CSS files        |
| Test files            | `*.test.ts(x)`         | `claude.test.ts`           |

---

## React & Next.js

- **Server Components by default.** Only add `"use client"` when the component needs state, effects, or browser APIs.
- **No prop drilling past 2 levels.** Use React Context or pass data via server component composition.
- **Component structure:**
  ```
  1. Imports
  2. Types / interfaces (if local to this file)
  3. Constants
  4. Component function
  5. Helper functions (below component, or extracted to utils)
  ```
- **No inline styles.** Tailwind classes only.
- **shadcn/ui for all primitives.** Don't rebuild buttons, modals, inputs, etc.
- **Loading states are mandatory.** Every async operation shows a skeleton or spinner.
- **Error boundaries** on every page-level component.
- **Image optimization:** Use `next/image` for all images. Screenshots use blur placeholders.

---

## API Routes

- **One route file per resource.** `api/workflows/route.ts` handles GET (list) and POST (create). `api/workflows/[id]/route.ts` handles GET (detail), PATCH (update), DELETE.
- **Standard response shape:**
  ```typescript
  // Success
  { data: T, meta?: { page, total } }

  // Error
  { error: { code: string, message: string, details?: any } }
  ```
- **HTTP status codes:** 200 success, 201 created, 400 bad input, 401 unauthenticated, 403 forbidden, 404 not found, 500 server error. No others.
- **Auth middleware on every route.** Use `withApiAuthRequired` from Auth0 SDK.
- **Rate limiting:** Apply `ratelimit` middleware to AI and capture endpoints.
- **Request validation pattern:**
  ```typescript
  const schema = z.object({ name: z.string().min(1).max(100) });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: parsed.error.message } },
      { status: 400 }
    );
  }
  ```

---

## Auth0 & Token Vault

- **Never store tokens.** Not in DB, not in cookies, not in localStorage, not in memory longer than a single request.
- **Token Vault is the only source of truth** for OAuth access tokens.
- **Connection names are constants.** Define in `lib/auth0.ts`:
  ```typescript
  export const CONNECTIONS = {
    GOOGLE: "google-oauth2",
    SLACK: "slack",
    LINEAR: "linear",
  } as const;
  ```
- **Handle token expiry gracefully.** If Token Vault returns an expired token error, redirect the user to re-authorize.
- **Scopes are minimal.** Request only the scopes each workflow step needs. Document every scope in `lib/services/`.
- **Step-up auth pattern:** For sensitive actions (sending emails on behalf of user, posting to Slack), require explicit user confirmation even after initial Token Vault authorization.

---

## AI Providers (Multi-Provider)

- **Default provider:** Gemini 2.5 Flash (cheapest with good vision: $0.30/$2.50 per MTok).
- **Supported providers:** Gemini, OpenAI (GPT-4o / GPT-4o-mini), Anthropic (Claude Sonnet 4). User selects in Settings.
- **All AI calls go through the `AIProvider` interface** in `lib/ai/provider.ts`. Never call a provider SDK directly from components or API routes.
- **Prompts are provider-agnostic.** All prompts live in `lib/ai/prompts.ts` as plain string functions. Same prompt works for Gemini, OpenAI, and Claude — no provider-specific formatting in prompts.
- **Structured output:** Always instruct the AI to return JSON only. Parse with `JSON.parse` wrapped in try-catch. If parsing fails, retry once with a stricter prompt.
- **Image payload:** Send screenshots as base64 PNG. Resize to max 1024px wide before sending (cost optimization for all providers).
- **Context window management:** Send only the last 5 actions as context when interpreting a new screenshot. Never send the full history.
- **Rate limiting:** Max 10 AI calls per minute per user during recording. Queue excess frames.
- **Cost tracking:** Log every AI call with provider name, model, and estimated token count to an `ai_usage` table.
- **API keys belong to users.** Users enter their own API key in Settings. Keys are encrypted in session, never stored in plain text in the database.
- **Fallback behavior:** If a user's API key is invalid or their provider is down, show a clear error. Don't silently fall back to a different provider without telling the user (different cost implications).

---

## Database (Prisma)

- **Migrations only.** Never use `db push` in production. Use `prisma migrate dev` locally, `prisma migrate deploy` in CI.
- **Soft deletes** for workflows and installations. Add `deletedAt DateTime?` field.
- **JSON columns** for flexible schema (steps, variables, actions). Validate JSON shape with Zod on read and write.
- **Indexes:** Add indexes on all foreign keys and any field used in `WHERE` clauses.
- **Transactions** for multi-table writes (e.g., creating a workflow + first recording).
- **No raw SQL** unless Prisma can't express the query. Document with a comment explaining why.

---

## Error Handling

- **Custom error classes:**
  ```typescript
  export class TokenVaultError extends Error { code = "TOKEN_VAULT_ERROR"; }
  export class ServiceError extends Error { code = "SERVICE_ERROR"; service: string; }
  export class InterpretationError extends Error { code = "INTERPRETATION_ERROR"; }
  ```
- **Try-catch at API boundary.** Catch errors in route handlers, not in lib functions. Lib functions throw.
- **Log errors with context.** Include userId, workflowId, service name, action attempted.
- **User-facing messages are friendly.** "We couldn't connect to Gmail right now. Please try reconnecting in Settings." Not "Error: 401 Unauthorized."

---

## Service Adapters (`lib/services/`)

Every third-party API gets an adapter file. The adapter:

1. Takes a `userId` parameter
2. Fetches the token from Token Vault internally
3. Makes the API call
4. Returns a normalized response
5. Throws `ServiceError` on failure

```typescript
// lib/services/gmail.ts
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string }> {
  const token = await getTokenForUser(userId, CONNECTIONS.GOOGLE);
  const response = await fetch("https://gmail.googleapis.com/...", {
    headers: { Authorization: `Bearer ${token}` },
    // ...
  });
  if (!response.ok) throw new ServiceError("gmail", response.statusText);
  return response.json();
}
```

**Never call a third-party API outside of an adapter.** This is how we ensure Token Vault is always used.

---

## Screen Capture

- **Frame interval:** 1 screenshot every 2 seconds during active recording. Increase to 5 seconds during idle detection.
- **Resolution:** Capture at native resolution, resize to 1024px max width before sending to AI (cost optimization for all providers).
- **Format:** PNG for clarity (screenshots with text need to be readable by AI Vision).
- **Storage:** Save to `/tmp/mimicai/{uuid}.png` during recording. These temp files serve two purposes: (1) sent to AI for interpretation, (2) shown in LearningConversation UI so user sees the screenshot the AI is asking about.
- **Cleanup:** Delete all temp files for a recording when the recording completes and the workflow is learned. Run an hourly cleanup cron that deletes any files older than 1 hour to catch orphans.
- **NEVER use cloud storage (S3, GCS, etc.) for screenshots.** Temp files on the server are sufficient. Zero storage cost.
- **Privacy indicator:** Recording screen MUST show a visible red dot / banner. User must always know they're being recorded.
- **Stop conditions:** Recording stops on user click, tab close, or 10 minutes max.

---

## Testing

- **Unit tests** for: AI response parsing (all 3 providers), workflow template generation, Zod schemas, service adapter response normalization.
- **Integration tests** for: API routes with mocked Auth0 session, Token Vault with mocked tokens, AI provider with mocked responses.
- **E2E tests** (Playwright): Full recording flow, marketplace install flow.
- **No tests for UI styling.** Waste of time in a hackathon.
- **Test files live next to source:** `provider.ts` → `provider.test.ts` in the same directory.

---

## Git Conventions

- **Branch naming:** `feat/screen-capture`, `fix/token-refresh`, `chore/prisma-migration`
- **Commit messages:** Conventional commits. `feat: add screenshot upload pipeline`, `fix: handle Token Vault 401`, `docs: update README setup steps`
- **PR size:** Max 400 lines changed. Break larger work into stacked PRs.
- **Main is always deployable.** No broken builds on main.

---

## Performance

- **Lazy load** the screen capture module. It's heavy and only needed on the /record page.
- **Debounce** clarification dialog — don't show a new question if one is already visible.
- **Virtualize** long action timelines (react-window).
- **Cache marketplace listings** with ISR (60 second revalidation).
- **Connection pooling** for Prisma in serverless (use `prisma` singleton pattern).

---

## Security

- **CORS:** Restrict to your domain only.
- **CSRF:** Next.js handles via SameSite cookies.
- **Input sanitization:** Zod handles schema validation. Additionally sanitize any user text rendered in UI to prevent XSS.
- **No screenshot storage.** Screenshots exist only in memory during processing. Nothing to leak.
- **Rate limiting:** 100 req/min per user on API routes. 10 req/min on Claude endpoints.
- **Audit log:** Log every automation execution with userId, workflowId, services used, and timestamp.
- **No secrets in client code.** All API keys server-side only. Check with `NEXT_PUBLIC_` prefix awareness.

---

## Hackathon-Specific Rules

- **If it doesn't demo, it doesn't exist.** Focus on the happy path.
- **Hardcode fallbacks.** If Claude Vision is slow, have a pre-recorded demo workflow ready.
- **Three services max for MVP.** Gmail + Google Sheets + Slack. Don't spread thin.
- **The blog post matters.** Write it while building, not after. Capture screenshots of your progress.
- **Video first.** Plan the 3-minute demo video before writing code. Build what the video needs.
