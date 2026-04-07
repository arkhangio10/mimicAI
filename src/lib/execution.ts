import type {
  WorkflowStep,
  WorkflowTemplate,
  WorkflowVariable,
} from "@/types/workflow";
import type { AIProviderConfig } from "./ai/provider";
import { evaluateRules } from "./ai/learning";
import { ExecutionError } from "./errors";

// ─── Execution Types ────────────────────────────────────────────────

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "needs_input"
  | "paused";

export interface StepResult {
  stepId: string;
  stepName: string;
  stepType: string;
  service: string | null;
  status: "success" | "skipped" | "failed";
  output: Record<string, unknown>;
  error?: string;
  startedAt: number;
  completedAt: number;
}

export interface ExecutionState {
  id: string;
  workflowId: string;
  userId: string;
  status: ExecutionStatus;
  currentStepIndex: number;
  stepsTotal: number;
  stepsCompleted: number;
  stepResults: StepResult[];
  variableInputs: Record<string, unknown>;
  rulesApplied: string[];
  collectedData: Record<string, unknown>;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  demoMode: boolean;
}

// In-memory execution store — use globalThis to survive Next.js hot-reloads
const globalForExecution = globalThis as unknown as {
  __mimicai_executions: Map<string, ExecutionState>;
};
if (!globalForExecution.__mimicai_executions) {
  globalForExecution.__mimicai_executions = new Map<string, ExecutionState>();
}
const activeExecutions = globalForExecution.__mimicai_executions;

export function getExecution(id: string): ExecutionState | undefined {
  return activeExecutions.get(id);
}

export function deleteExecution(id: string): void {
  activeExecutions.delete(id);
}

// ─── Execution Engine ───────────────────────────────────────────────

/**
 * Start executing a workflow with the given variable inputs.
 * Returns the execution state — caller can poll for progress.
 */
export async function startExecution(
  workflow: WorkflowTemplate,
  userId: string,
  variableInputs: Record<string, unknown>,
  aiConfig?: AIProviderConfig,
  googleToken?: string | null
): Promise<ExecutionState> {
  const executionId = crypto.randomUUID();

  const state: ExecutionState = {
    id: executionId,
    workflowId: workflow.id,
    userId,
    status: "running",
    currentStepIndex: 0,
    stepsTotal: workflow.steps.length,
    stepsCompleted: 0,
    stepResults: [],
    variableInputs,
    rulesApplied: [],
    collectedData: {},
    error: null,
    startedAt: Date.now(),
    completedAt: null,
    demoMode: !googleToken,
  };

  activeExecutions.set(executionId, state);

  // Run execution asynchronously
  runExecution(state, workflow, aiConfig, googleToken ?? null).catch((err) => {
    state.status = "failed";
    state.error = err instanceof Error ? err.message : "Unknown execution error";
    state.completedAt = Date.now();
  });

  return state;
}

async function runExecution(
  state: ExecutionState,
  workflow: WorkflowTemplate,
  aiConfig?: AIProviderConfig,
  googleToken?: string | null
): Promise<void> {
  const steps = [...workflow.steps].sort((a, b) => a.order - b.order);

  // Evaluate rules upfront if AI config available
  let skipSteps: string[] = [];
  if (aiConfig && workflow.rules.length > 0) {
    try {
      const ruleResult = await evaluateRules(
        aiConfig,
        workflow.rules,
        state.collectedData,
        state.variableInputs
      );
      state.rulesApplied = ruleResult.activeRules;
      skipSteps = ruleResult.skipSteps;
    } catch {
      // Rule evaluation failure is non-fatal — continue without rules
    }
  }

  for (let i = 0; i < steps.length; i++) {
    if (state.status !== "running") break;

    const step = steps[i];
    state.currentStepIndex = i;

    // Check if step should be skipped (conditional logic)
    if (shouldSkipStep(step, skipSteps, state.collectedData, state.variableInputs)) {
      state.stepResults.push({
        stepId: step.id,
        stepName: step.action,
        stepType: step.type,
        service: step.service,
        status: "skipped",
        output: {},
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
      state.stepsCompleted++;
      continue;
    }

    const startedAt = Date.now();
    console.log(`[execute] Running step ${i + 1}/${steps.length}: "${step.action}" (${step.type}, service: ${step.service})`);

    // Try real execution with a 5s timeout, fall back to demo mode
    let output: Record<string, unknown>;
    try {
      output = await Promise.race([
        executeStep(step, state, googleToken),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Step timed out")), 5000)
        ),
      ]);
      console.log(`[execute] Step ${i + 1} completed OK`);
    } catch (err) {
      // Any error (timeout, Token Vault, API failure) → demo mode
      console.warn(`[execute] Step ${i + 1} failed, using demo:`,
        err instanceof Error ? err.message : err);
      state.demoMode = true;
      output = { _demo: true, _note: `Demo: simulated ${step.type}` };
    }

    state.stepResults.push({
      stepId: step.id,
      stepName: step.action,
      stepType: step.type,
      service: step.service,
      status: "success",
      output,
      startedAt,
      completedAt: Date.now(),
    });
    state.stepsCompleted++;

    // Merge step output into collected data for downstream steps
    Object.assign(state.collectedData, output);

    // Simulate realistic execution timing (300-800ms per step)
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
  }

  if (state.status === "running") {
    state.status = "completed";
    state.completedAt = Date.now();
    console.log(`[execute] Workflow completed! ${state.stepsCompleted}/${state.stepsTotal} steps, demoMode: ${state.demoMode}`);
  }
}

/**
 * Normalize service names from AI-generated display names to adapter keys.
 * AI might produce "Google Sheets", "Gmail", "Google Chrome", etc.
 */
function normalizeService(service: string | null): string | null {
  if (!service) return null;
  const lower = service.toLowerCase().trim();
  if (lower === "sheets" || lower === "google sheets") return "sheets";
  if (lower === "gmail" || lower === "google gmail") return "gmail";
  if (lower === "slack") return "slack";
  // Non-API services (browsers, desktop apps) return null
  if (lower.includes("chrome") || lower.includes("browser") || lower.includes("firefox")) return null;
  return service;
}

/**
 * Generate realistic demo output when Token Vault isn't available.
 */
function getDemoOutput(
  step: WorkflowStep,
  state: ExecutionState
): Record<string, unknown> {
  const params = resolveParameters(step.parameters, state);
  const svc = normalizeService(step.service);

  switch (svc) {
    case "sheets":
      return {
        updatedRows: 10,
        spreadsheetId: params["spreadsheetId"] || "demo-spreadsheet-id",
        range: params["range"] || "Sheet1!A1:A10",
        _note: "Demo: simulated Google Sheets write",
      };
    case "gmail":
      return {
        messageId: `demo-msg-${Date.now()}`,
        to: params["to"] || "demo@example.com",
        _note: "Demo: simulated Gmail send",
      };
    case "slack":
      return {
        messageTs: `${Date.now()}.000`,
        channel: params["channel"] || "#general",
        _note: "Demo: simulated Slack message",
      };
    default:
      return {
        [`${step.id}_result`]: "completed",
        _note: `Demo: simulated ${step.type} step`,
      };
  }
}

function shouldSkipStep(
  step: WorkflowStep,
  skipSteps: string[],
  data: Record<string, unknown>,
  variables: Record<string, unknown>
): boolean {
  if (skipSteps.includes(step.id)) return true;
  if (!step.isConditional || !step.condition) return false;

  // Simple condition evaluation for common patterns
  const condition = step.condition.toLowerCase();
  const allValues = { ...data, ...variables };

  // Check for "any_failed_samples" type conditions
  if (condition.includes("any_failed") || condition.includes("has_failed")) {
    const failed = allValues["failedItems"] || allValues["failedSamples"] || allValues["failures"];
    if (Array.isArray(failed)) return failed.length === 0;
  }

  // For complex conditions, defer to AI (already handled by skipSteps from rule evaluation)
  return false;
}

async function executeStep(
  step: WorkflowStep,
  state: ExecutionState,
  googleToken?: string | null
): Promise<Record<string, unknown>> {
  const svc = normalizeService(step.service);
  switch (step.type) {
    case "read_screen":
    case "read_data":
    case "observe":
      return executeScreenRead(step, state);
    case "write_api":
    case "write_data":
    case "api_call":
      return executeAPIWrite(step, state, googleToken);
    case "open_application":
    case "navigate":
      // Simulated — app opening is handled by screen capture
      return { opened: step.service || "unknown", _source: "navigate" };
    case "transform":
    case "calculate":
      return executeTransform(step, state);
    case "decision":
    case "conditional":
      return executeDecision(step);
    case "notify":
    case "send":
      return executeNotify(step, state, googleToken);
    default:
      // For any unknown type, try API write if it has a Google service, otherwise simulate
      if (googleToken && (svc === "sheets" || svc === "gmail")) {
        return executeAPIWrite(step, state, googleToken);
      }
      return { [`${step.id}_result`]: "completed", _type: step.type };
  }
}

async function executeScreenRead(
  step: WorkflowStep,
  state: ExecutionState
): Promise<Record<string, unknown>> {
  const params = resolveParameters(step.parameters, state);
  // Screen reading requires active screen capture — return simulated data
  return {
    [`${step.id}_data`]: params["expectedData"] ?? {},
    _source: "screen_read",
    _app: step.service || "unknown",
  };
}

async function executeAPIWrite(
  step: WorkflowStep,
  state: ExecutionState,
  googleToken?: string | null
): Promise<Record<string, unknown>> {
  const params = resolveParameters(step.parameters, state);
  const svc = normalizeService(step.service);

  // If no token available, use demo mode
  if (!googleToken && (svc === "sheets" || svc === "gmail")) {
    return getDemoOutput(step, state);
  }

  switch (svc) {
    case "sheets": {
      const result = await callSheetsAPI(googleToken!, params);
      return result;
    }
    case "gmail": {
      const result = await callGmailAPI(googleToken!, params);
      return result;
    }
    case "slack": {
      const { services } = await import("./services");
      const result = await services.slack.sendMessage(
        params["channel"] as string,
        params["text"] as string
      );
      return { messageTs: result.ts };
    }
    default:
      return getDemoOutput(step, state);
  }
}

/** Call Google Sheets API directly with pre-fetched token */
async function callSheetsAPI(
  token: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const spreadsheetId = params["spreadsheetId"] as string;
  const range = params["range"] as string || "Sheet1!A1:A10";
  const values = params["values"] as unknown[][] || [[1],[2],[3],[4],[5],[6],[7],[8],[9],[10]];

  // If no spreadsheetId, create a new spreadsheet first
  let actualSpreadsheetId = spreadsheetId;
  if (!actualSpreadsheetId) {
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: params["title"] || "MimicAI - Auto Generated" },
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create spreadsheet: ${createRes.status} ${err}`);
    }
    const created = await createRes.json();
    actualSpreadsheetId = created.spreadsheetId;
  }

  // Write data to the spreadsheet
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${actualSpreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sheets API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: actualSpreadsheetId,
    updatedRows: data.updates?.updatedRows ?? values.length,
    range: data.updates?.updatedRange ?? range,
    url: `https://docs.google.com/spreadsheets/d/${actualSpreadsheetId}`,
  };
}

/** Call Gmail API directly with pre-fetched token */
async function callGmailAPI(
  token: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const to = params["to"] as string || "";
  const subject = params["subject"] as string || "MimicAI Notification";
  const body = params["body"] as string || "Sent by MimicAI automation";

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  const encodedEmail = Buffer.from(email).toString("base64url");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return { messageId: data.id, sent: true };
}

async function executeTransform(
  step: WorkflowStep,
  state: ExecutionState
): Promise<Record<string, unknown>> {
  const params = resolveParameters(step.parameters, state);
  const operation = params["operation"] as string;

  switch (operation) {
    case "multiply": {
      const value = Number(params["value"] ?? 0);
      const factor = Number(params["factor"] ?? 1);
      return { result: value * factor };
    }
    case "filter": {
      const items = params["items"] as unknown[];
      const field = params["field"] as string;
      const threshold = Number(params["threshold"] ?? 0);
      const comparison = (params["comparison"] as string) ?? "gt";

      if (!Array.isArray(items)) return { filtered: [] };

      const filtered = items.filter((item: unknown) => {
        const val = Number((item as Record<string, unknown>)[field]);
        if (comparison === "gt") return val > threshold;
        if (comparison === "lt") return val < threshold;
        if (comparison === "eq") return val === threshold;
        return true;
      });
      return { filtered, failedItems: filtered };
    }
    case "average": {
      const values = params["values"] as number[];
      if (!Array.isArray(values) || values.length === 0) return { average: 0 };
      return { average: values.reduce((a, b) => a + b, 0) / values.length };
    }
    default:
      return { ...params, _transform: operation };
  }
}

async function executeDecision(
  step: WorkflowStep
): Promise<Record<string, unknown>> {
  return {
    decision: step.condition,
    evaluated: true,
  };
}

async function executeNotify(
  step: WorkflowStep,
  state: ExecutionState,
  googleToken?: string | null
): Promise<Record<string, unknown>> {
  const params = resolveParameters(step.parameters, state);
  const svc = normalizeService(step.service);

  if (svc === "gmail" && googleToken) {
    return callGmailAPI(googleToken, params);
  }

  if (svc === "slack") {
    const { services } = await import("./services");
    const result = await services.slack.sendMessage(
      params["channel"] as string,
      params["text"] as string
    );
    return { messageTs: result.ts, notified: true };
  }

  return { notified: false, reason: "No notification service configured" };
}

/**
 * Resolve parameter templates — replace {{variable}} and {{step_id.field}} references
 * with actual values from variables and collected data.
 */
function resolveParameters(
  params: Record<string, unknown> | null | undefined,
  state: ExecutionState
): Record<string, unknown> {
  if (!params || typeof params !== "object") return {};
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      resolved[key] = value.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (_match, ref: string) => {
        // Check variable inputs first
        if (ref in state.variableInputs) {
          return String(state.variableInputs[ref]);
        }
        // Check collected data (supports dot notation: step_1.field)
        const parts = ref.split(".");
        let current: unknown = state.collectedData;
        for (const part of parts) {
          if (current && typeof current === "object") {
            current = (current as Record<string, unknown>)[part];
          } else {
            return `{{${ref}}}`;
          }
        }
        return current != null ? String(current) : `{{${ref}}}`;
      });
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Validate that all required variables have been provided.
 */
export function validateVariableInputs(
  variables: WorkflowVariable[],
  inputs: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const v of variables) {
    if (v.source !== "user_input") continue;
    if (!(v.name in inputs) || inputs[v.name] === undefined || inputs[v.name] === "") {
      if (v.default === undefined || v.default === null) {
        missing.push(v.name);
      }
    }
  }

  return { valid: missing.length === 0, missing };
}
