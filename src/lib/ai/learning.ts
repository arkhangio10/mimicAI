import type { CapturedAction, QuestionAnswer } from "@/types/action";
import type { LearnedRule, EdgeCase, WorkflowVariable, WorkflowStep } from "@/types/workflow";
import type { AIProviderConfig } from "./provider";
import { createProvider } from "./provider";
import {
  QUESTION_GENERATION_PROMPT,
  FOLLOW_UP_PROMPT,
  SYNTHESIS_PROMPT,
  VARIABLE_DETECTION_PROMPT,
  WORKFLOW_GENERATION_PROMPT,
  RULE_EVALUATION_PROMPT,
  INFER_WORKFLOW_PROMPT,
} from "./prompts";
import type {
  GeneratedQuestion,
  SynthesisResult,
  StepUnderstanding,
} from "@/lib/learning-sessions";
import { LearningError } from "@/lib/errors";

const MAX_FOLLOW_UPS_PER_ACTION = 3;

/** Strip markdown code fences and parse JSON */
function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Generate clarifying questions for a specific action.
 */
export async function generateQuestionsForAction(
  config: AIProviderConfig,
  action: CapturedAction,
  actionIndex: number,
  allActions: CapturedAction[],
  previousQA: QuestionAnswer[],
  screenshotBase64?: string
): Promise<GeneratedQuestion[]> {
  try {
    const provider = createProvider(config);
    const prompt = QUESTION_GENERATION_PROMPT(
      action,
      actionIndex,
      allActions.length,
      allActions,
      previousQA
    );
    const response = await provider.generateText(prompt, screenshotBase64);
    const questions = parseJSON<GeneratedQuestion[]>(response);

    // Validate structure
    return questions.filter(
      (q) =>
        q.category &&
        q.question &&
        ["identity", "reason", "rule", "edge_case"].includes(q.category)
    );
  } catch (err) {
    if (err instanceof LearningError) throw err;
    throw new LearningError(
      `Failed to generate questions: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Check if the AI wants to ask a follow-up question based on the conversation so far.
 * Returns null if no follow-up is needed or max follow-ups reached.
 */
export async function generateFollowUp(
  config: AIProviderConfig,
  action: CapturedAction,
  conversation: QuestionAnswer[],
  currentFollowUpCount: number,
  screenshotBase64?: string
): Promise<GeneratedQuestion | null> {
  if (currentFollowUpCount >= MAX_FOLLOW_UPS_PER_ACTION) {
    return null;
  }

  try {
    const provider = createProvider(config);
    const prompt = FOLLOW_UP_PROMPT(action, conversation);
    const response = await provider.generateText(prompt, screenshotBase64);
    const result = parseJSON<{
      shouldFollowUp: boolean;
      category?: string;
      question?: string;
    }>(response);

    if (
      result.shouldFollowUp &&
      result.category &&
      result.question
    ) {
      return {
        category: result.category as GeneratedQuestion["category"],
        question: result.question,
      };
    }
    return null;
  } catch {
    // Follow-up failures are non-critical — just skip
    return null;
  }
}

/**
 * Synthesize all actions and Q&A into rules, edge cases, and step understandings.
 */
export async function synthesizeFromQA(
  config: AIProviderConfig,
  actions: CapturedAction[],
  allQA: QuestionAnswer[]
): Promise<SynthesisResult> {
  try {
    const provider = createProvider(config);
    const prompt = SYNTHESIS_PROMPT(actions, allQA);
    const response = await provider.generateText(prompt);
    return parseJSON<SynthesisResult>(response);
  } catch (err) {
    throw new LearningError(
      `Failed to synthesize rules: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Detect variables that change between runs.
 */
export async function detectVariables(
  config: AIProviderConfig,
  actions: CapturedAction[],
  allQA: QuestionAnswer[],
  rules: LearnedRule[]
): Promise<WorkflowVariable[]> {
  try {
    const provider = createProvider(config);
    const prompt = VARIABLE_DETECTION_PROMPT(actions, allQA, rules);
    const response = await provider.generateText(prompt);
    return parseJSON<WorkflowVariable[]>(response);
  } catch {
    // Variable detection failure is non-critical — return empty
    return [];
  }
}

/**
 * Generate a WorkflowTemplate from learning session results.
 */
export async function generateWorkflow(
  config: AIProviderConfig,
  actions: CapturedAction[],
  allQA: QuestionAnswer[],
  rules: LearnedRule[],
  edgeCases: EdgeCase[],
  variables: WorkflowVariable[],
  stepUnderstandings: StepUnderstanding[]
): Promise<{
  steps: WorkflowStep[];
  services: string[];
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  suggestedName: string;
  suggestedDescription: string;
}> {
  try {
    const provider = createProvider(config);
    const prompt = WORKFLOW_GENERATION_PROMPT(
      actions,
      allQA,
      rules,
      edgeCases,
      variables,
      stepUnderstandings
    );
    const response = await provider.generateText(prompt);
    return parseJSON(response);
  } catch (err) {
    throw new LearningError(
      `Failed to generate workflow: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Evaluate rules against current data during execution.
 */
export async function evaluateRules(
  config: AIProviderConfig,
  rules: LearnedRule[],
  currentData: Record<string, unknown>,
  variables: Record<string, unknown>
): Promise<{
  evaluations: Array<{
    ruleId: string;
    condition: string;
    result: boolean;
    reason: string;
    actions: string[];
  }>;
  activeRules: string[];
  skipSteps: string[];
  modifiedParameters: Record<string, unknown>;
}> {
  try {
    const provider = createProvider(config);
    const prompt = RULE_EVALUATION_PROMPT(rules, currentData, variables);
    const response = await provider.generateText(prompt);
    return parseJSON(response);
  } catch {
    return { evaluations: [], activeRules: [], skipSteps: [], modifiedParameters: {} };
  }
}

/**
 * Infer the complete workflow from actions alone — no Q&A needed.
 * This is the "smart apprentice" mode: analyze everything, present understanding, let user correct.
 */
export async function inferFromActions(
  config: AIProviderConfig,
  actions: CapturedAction[]
): Promise<{
  summary: string;
  steps: WorkflowStep[];
  rules: LearnedRule[];
  variables: WorkflowVariable[];
  edgeCases: EdgeCase[];
  confidenceNotes: string[];
  services: string[];
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  suggestedName: string;
  suggestedDescription: string;
}> {
  try {
    const provider = createProvider(config);
    const prompt = INFER_WORKFLOW_PROMPT(actions);
    const response = await provider.generateText(prompt);
    return parseJSON(response);
  } catch (err) {
    throw new LearningError(
      `Failed to infer workflow: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Generate demo questions when no API key is provided.
 */
export function generateDemoQuestions(
  action: CapturedAction,
  actionIndex: number
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  if (actionIndex === 0) {
    questions.push({
      category: "identity",
      question: `What software is "${action.sourceApp}" and what kind of data does it show?`,
    });
  }

  questions.push({
    category: "reason",
    question: `Why did you ${action.action.replace(/_/g, " ")} on "${action.actionTarget}"?`,
  });

  if (action.extractedData) {
    questions.push({
      category: "rule",
      question: `Are these values always in this format, or do they change between sessions?`,
    });
  }

  if (action.destinationService) {
    questions.push({
      category: "edge_case",
      question: `What should happen if ${action.destinationService} is unavailable when running this automation?`,
    });
  }

  return questions;
}
