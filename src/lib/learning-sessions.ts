import type { CapturedAction, LearnedStep, QuestionAnswer } from "@/types/action";
import type { LearnedRule, EdgeCase, WorkflowVariable } from "@/types/workflow";
import type { RecordingSession } from "@/lib/sessions";
import { deleteScreenshot } from "@/lib/screenshots";

export type LearningPhase =
  | "questioning"
  | "synthesizing"
  | "reviewing"
  | "complete";

export interface GeneratedQuestion {
  category: "identity" | "reason" | "rule" | "edge_case";
  question: string;
}

export interface StepUnderstanding {
  actionId: string;
  purposeDescription: string;
  conditionLogic: string;
  isConditional: boolean;
  condition: string | null;
  consequences: string[];
}

export interface SynthesisResult {
  rules: LearnedRule[];
  edgeCases: EdgeCase[];
  stepUnderstandings: StepUnderstanding[];
}

export interface LearningSession {
  sessionId: string;
  actions: CapturedAction[];
  screenshotPaths: string[];

  // Learning state machine
  phase: LearningPhase;
  currentActionIndex: number;

  // Per-action learned state
  learnedSteps: LearnedStep[];

  // Q&A tracking
  allQuestions: QuestionAnswer[];
  currentConversation: QuestionAnswer[];
  pendingQuestions: GeneratedQuestion[];
  followUpCount: number;

  // Synthesis results
  extractedRules: LearnedRule[];
  extractedEdgeCases: EdgeCase[];
  detectedVariables: WorkflowVariable[];

  // Provider config
  provider: string;
  apiKey: string;

  // Timestamps
  startedAt: number;
  completedAt: number | null;
}

// In-memory store for active learning sessions
const activeLearning = new Map<string, LearningSession>();

export function createLearningSession(
  sessionId: string,
  recordingSession: RecordingSession,
  provider: string,
  apiKey: string
): LearningSession {
  const session: LearningSession = {
    sessionId,
    actions: [...recordingSession.actions],
    screenshotPaths: [...recordingSession.screenshotPaths],
    phase: "questioning",
    currentActionIndex: 0,
    learnedSteps: [],
    allQuestions: [],
    currentConversation: [],
    pendingQuestions: [],
    followUpCount: 0,
    extractedRules: [],
    extractedEdgeCases: [],
    detectedVariables: [],
    provider,
    apiKey,
    startedAt: Date.now(),
    completedAt: null,
  };
  activeLearning.set(sessionId, session);
  return session;
}

export function getLearningSession(
  sessionId: string
): LearningSession | undefined {
  return activeLearning.get(sessionId);
}

export function updateLearningSession(
  sessionId: string,
  updates: Partial<LearningSession>
): LearningSession | undefined {
  const session = activeLearning.get(sessionId);
  if (!session) return undefined;
  Object.assign(session, updates);
  return session;
}

export function deleteLearningSession(sessionId: string): void {
  const session = activeLearning.get(sessionId);
  if (session) {
    // Clean up screenshot temp files
    session.screenshotPaths.forEach((p) => deleteScreenshot(p));
    activeLearning.delete(sessionId);
  }
}
