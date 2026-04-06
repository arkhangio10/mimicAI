"use client";

import { useState, useCallback, useRef } from "react";
import type { CapturedAction, LearnedStep, QuestionAnswer } from "@/types/action";
import type { LearnedRule, EdgeCase, WorkflowVariable } from "@/types/workflow";
import type { LearningPhase, GeneratedQuestion } from "@/lib/learning-sessions";

interface UseLearningOptions {
  sessionId: string;
  provider: string;
  apiKey: string;
  actions?: CapturedAction[];
}

interface UseLearningReturn {
  phase: LearningPhase | "idle";
  currentAction: CapturedAction | null;
  currentActionIndex: number;
  totalActions: number;
  currentQuestion: GeneratedQuestion | null;
  conversation: QuestionAnswer[];
  rules: LearnedRule[];
  edgeCases: EdgeCase[];
  variables: WorkflowVariable[];
  learnedSteps: LearnedStep[];
  questionsAnswered: number;
  screenshotFilename: string | null;
  isLoading: boolean;
  error: string | null;
  workflowId: string | null;
  workflowData: Record<string, unknown> | null;
  startLearning: () => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  skipQuestion: () => Promise<void>;
  synthesize: () => Promise<void>;
  updateRule: (ruleId: string, updates: Partial<LearnedRule>) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  updateEdgeCase: (id: string, updates: Partial<EdgeCase>) => Promise<void>;
  deleteEdgeCase: (id: string) => Promise<void>;
  updateVariable: (name: string, updates: Partial<WorkflowVariable>) => Promise<void>;
  deleteVariable: (name: string) => Promise<void>;
  finalize: (name?: string, description?: string) => Promise<void>;
}

export function useLearning({
  sessionId,
  provider,
  apiKey,
  actions: preloadedActions,
}: UseLearningOptions): UseLearningReturn {
  const [phase, setPhase] = useState<LearningPhase | "idle">("idle");
  const [currentAction, setCurrentAction] = useState<CapturedAction | null>(null);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState<GeneratedQuestion[]>([]);
  const [conversation, setConversation] = useState<QuestionAnswer[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [screenshotFilename, setScreenshotFilename] = useState<string | null>(null);
  const [rules, setRules] = useState<LearnedRule[]>([]);
  const [edgeCases, setEdgeCases] = useState<EdgeCase[]>([]);
  const [variables, setVariables] = useState<WorkflowVariable[]>([]);
  const [learnedSteps, setLearnedSteps] = useState<LearnedStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<Record<string, unknown> | null>(null);

  // Track all Q&A across all actions for session recovery
  const allQuestionsRef = useRef<QuestionAnswer[]>([]);

  const currentQuestion = pendingQuestions[0] ?? null;

  // Session recovery context — sent with every request so the server can
  // rebuild the session if it was lost (e.g. hot-reload in dev)
  const getRecoveryContext = useCallback(() => ({
    actions: preloadedActions,
    provider,
    apiKey: apiKey || undefined,
    currentActionIndex,
    allQuestions: allQuestionsRef.current,
    pendingQuestions,
    followUpCount: 0,
  }), [preloadedActions, provider, apiKey, currentActionIndex, pendingQuestions]);

  const startLearning = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/learning/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          provider,
          apiKey: apiKey || undefined,
          actions: preloadedActions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPhase(data.phase);
      setTotalActions(data.totalActions);
      setCurrentActionIndex(data.currentActionIndex);
      setCurrentAction(data.currentAction);
      setPendingQuestions(data.pendingQuestions ?? []);
      setScreenshotFilename(data.screenshotFilename);
      setConversation([]);
      allQuestionsRef.current = [];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start learning");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, provider, apiKey, preloadedActions]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/learning/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            answer,
            recovery: getRecoveryContext(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Track Q&A locally
        if (currentQuestion) {
          const qa: QuestionAnswer = {
            id: crypto.randomUUID(),
            category: currentQuestion.category,
            question: currentQuestion.question,
            answer,
            timestamp: Date.now(),
            screenshotUrl: currentAction?.screenshotUrl ?? "",
          };
          setConversation((prev) => [...prev, qa]);
          allQuestionsRef.current = [...allQuestionsRef.current, qa];
        }

        setQuestionsAnswered(data.progress?.questionsAnswered ?? questionsAnswered + 1);

        if (data.allComplete) {
          setPhase("synthesizing");
          setPendingQuestions([]);
          return;
        }

        if (data.actionAdvanced) {
          setCurrentActionIndex(data.currentActionIndex);
          setCurrentAction(data.currentAction);
          setScreenshotFilename(data.screenshotFilename);
          setPendingQuestions(data.pendingQuestions ?? []);
          setConversation([]);
        } else {
          setPendingQuestions(data.pendingQuestions ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit answer");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, currentQuestion, currentAction, questionsAnswered, getRecoveryContext]
  );

  const skipQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/learning/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          skip: true,
          recovery: getRecoveryContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.allComplete) {
        setPhase("synthesizing");
        setPendingQuestions([]);
        return;
      }

      if (data.actionAdvanced) {
        setCurrentActionIndex(data.currentActionIndex);
        setCurrentAction(data.currentAction);
        setScreenshotFilename(data.screenshotFilename);
        setPendingQuestions(data.pendingQuestions ?? []);
        setConversation([]);
      } else {
        setPendingQuestions(data.pendingQuestions ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip question");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getRecoveryContext]);

  const synthesize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPhase("synthesizing");
    try {
      const res = await fetch("/api/learning/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          recovery: getRecoveryContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRules(data.rules ?? []);
      setEdgeCases(data.edgeCases ?? []);
      setVariables(data.variables ?? []);
      setLearnedSteps(data.learnedSteps ?? []);
      setPhase("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to synthesize rules");
      setPhase("questioning");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getRecoveryContext]);

  // Local-only rule/edge-case/variable edits (no server roundtrip needed)
  const updateRule = useCallback(
    async (ruleId: string, updates: Partial<LearnedRule>) => {
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const deleteRule = useCallback(async (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const updateEdgeCase = useCallback(
    async (id: string, updates: Partial<EdgeCase>) => {
      setEdgeCases((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const deleteEdgeCase = useCallback(async (id: string) => {
    setEdgeCases((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateVariable = useCallback(
    async (name: string, updates: Partial<WorkflowVariable>) => {
      setVariables((prev) =>
        prev.map((v) => (v.name === name ? { ...v, ...updates } : v))
      );
    },
    []
  );

  const deleteVariable = useCallback(async (name: string) => {
    setVariables((prev) => prev.filter((v) => v.name !== name));
  }, []);

  const finalize = useCallback(async (name?: string, description?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/learning/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          workflowName: name,
          workflowDescription: description,
          saveToDb: true,
          recovery: getRecoveryContext(),
          // Send current client state for synthesis
          clientRules: rules,
          clientEdgeCases: edgeCases,
          clientVariables: variables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhase("complete");
      if (data.workflowId) setWorkflowId(data.workflowId);
      if (data.workflow) setWorkflowData(data.workflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize learning");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getRecoveryContext, rules, edgeCases, variables]);

  return {
    phase,
    currentAction,
    currentActionIndex,
    totalActions,
    currentQuestion,
    conversation,
    rules,
    edgeCases,
    variables,
    learnedSteps,
    questionsAnswered,
    screenshotFilename,
    isLoading,
    error,
    workflowId,
    workflowData,
    startLearning,
    submitAnswer,
    skipQuestion,
    synthesize,
    updateRule,
    deleteRule,
    updateEdgeCase,
    deleteEdgeCase,
    updateVariable,
    deleteVariable,
    finalize,
  };
}
