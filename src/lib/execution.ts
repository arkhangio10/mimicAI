import type {
  WorkflowStep,
  WorkflowTemplate,
  WorkflowVariable,
} from "@/types/workflow";
import type { AIProviderConfig } from "./ai/provider";
import { evaluateRules } from "./ai/learning";
import { services } from "./services";
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
}

// In-memory execution store
const activeExecutions = new Map<string, ExecutionState>();

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
  aiConfig?: AIProviderConfig
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
  };

  activeExecutions.set(executionId, state);

  // Run execution asynchronously
  runExecution(state, workflow, aiConfig).catch((err) => {
    state.status = "failed";
    state.error = err instanceof Error ? err.message : "Unknown execution error";
    state.completedAt = Date.now();
  });

  return state;
}

async function runExecution(
  state: ExecutionState,
  workflow: WorkflowTemplate,
  aiConfig?: AIProviderConfig
): Promise<void> {
  const steps = [...workflow.steps].sort((a, b) => a.order - b.order);

  // Evaluate rules upfront if AI config available
  let skipSteps: string[] = [];
  if (aiConfig && workflow.rules.length > 0) {
    const ruleResult = await evaluateRules(
      aiConfig,
      workflow.rules,
      state.collectedData,
      state.variableInputs
    );
    state.rulesApplied = ruleResult.activeRules;
    skipSteps = ruleResult.skipSteps;
  }

  for (let i = 0; i < steps.length; i++) {
    if (state.status !== "running") break;

    const step = steps[i];
    state.currentStepIndex = i;

    // Check if step should be skipped (conditional logic)
    if (shouldSkipStep(step, skipSteps, state.collectedData, state.variableInputs)) {
      state.stepResults.push({
        stepId: step.id,
        status: "skipped",
        output: {},
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
      state.stepsCompleted++;
      continue;
    }

    const startedAt = Date.now();
    try {
      const output = await executeStep(step, state);
      state.stepResults.push({
        stepId: step.id,
        status: "success",
        output,
        startedAt,
        completedAt: Date.now(),
      });
      state.stepsCompleted++;

      // Merge step output into collected data for downstream steps
      Object.assign(state.collectedData, output);

      // Re-evaluate rules mid-execution if data changed
      if (aiConfig && workflow.rules.length > 0 && Object.keys(output).length > 0) {
        const ruleResult = await evaluateRules(
          aiConfig,
          workflow.rules,
          state.collectedData,
          state.variableInputs
        );
        state.rulesApplied = Array.from(new Set([...state.rulesApplied, ...ruleResult.activeRules]));
        skipSteps = ruleResult.skipSteps;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Step execution failed";
      state.stepResults.push({
        stepId: step.id,
        status: "failed",
        output: {},
        error: errorMsg,
        startedAt,
        completedAt: Date.now(),
      });
      state.status = "failed";
      state.error = `Step "${step.action}" failed: ${errorMsg}`;
      state.completedAt = Date.now();
      return;
    }
  }

  if (state.status === "running") {
    state.status = "completed";
    state.completedAt = Date.now();
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
  state: ExecutionState
): Promise<Record<string, unknown>> {
  switch (step.type) {
    case "read_screen":
      return executeScreenRead(step);
    case "write_api":
      return executeAPIWrite(step, state);
    case "transform":
      return executeTransform(step, state);
    case "decision":
      return executeDecision(step);
    case "notify":
      return executeNotify(step, state);
    default:
      throw new ExecutionError(`Unknown step type: ${step.type}`, step.id);
  }
}

async function executeScreenRead(
  step: WorkflowStep
): Promise<Record<string, unknown>> {
  // Screen reading requires active screen capture — return placeholder
  // In production, this would use AI Vision on a live screenshot
  return {
    [`${step.id}_data`]: step.parameters["expectedData"] ?? {},
    _source: "screen_read",
    _note: "Screen capture execution requires active browser session",
  };
}

async function executeAPIWrite(
  step: WorkflowStep,
  state: ExecutionState
): Promise<Record<string, unknown>> {
  const params = resolveParameters(step.parameters, state);

  switch (step.service) {
    case "sheets": {
      const result = await services.sheets.appendRows(
        params["spreadsheetId"] as string,
        params["range"] as string,
        params["values"] as unknown[][]
      );
      return { updatedRows: result.updatedRows };
    }
    case "gmail": {
      const result = await services.gmail.sendEmail(
        params["to"] as string,
        params["subject"] as string,
        params["body"] as string
      );
      return { messageId: result.messageId };
    }
    case "slack": {
      const result = await services.slack.sendMessage(
        params["channel"] as string,
        params["text"] as string
      );
      return { messageTs: result.ts };
    }
    default:
      throw new ExecutionError(
        `Unsupported service: ${step.service}`,
        step.id
      );
  }
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
  // Decision steps just evaluate and record — actual branching is handled
  // by the step skip logic and rule evaluation
  return {
    decision: step.condition,
    evaluated: true,
  };
}

async function executeNotify(
  step: WorkflowStep,
  state: ExecutionState
): Promise<Record<string, unknown>> {
  const params = resolveParameters(step.parameters, state);

  if (step.service === "gmail") {
    const result = await services.gmail.sendEmail(
      params["to"] as string,
      params["subject"] as string,
      params["body"] as string
    );
    return { messageId: result.messageId, notified: true };
  }

  if (step.service === "slack") {
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
  params: Record<string, unknown>,
  state: ExecutionState
): Record<string, unknown> {
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
