import { NextRequest, NextResponse } from "next/server";
import { getLearningSession } from "@/lib/learning-sessions";
import { synthesizeFromQA, detectVariables } from "@/lib/ai/learning";
import type { AIProviderConfig } from "@/lib/ai/provider";
import type { LearnedStep } from "@/types/action";
import { randomUUID } from "crypto";

/**
 * POST /api/learning/synthesize
 * Synthesizes rules, edge cases, and variables from all Q&A.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, recovery } = (await request.json()) as {
      sessionId: string;
      recovery?: {
        actions?: import("@/types/action").CapturedAction[];
        provider?: string;
        apiKey?: string;
        allQuestions?: import("@/types/action").QuestionAnswer[];
      };
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    let session = getLearningSession(sessionId);

    // Recover session if lost
    if (!session && recovery?.actions && recovery.actions.length > 0) {
      const { getOrCreateSession } = await import("@/lib/sessions");
      const { createLearningSession: createLS } = await import("@/lib/learning-sessions");
      const recSession = getOrCreateSession(sessionId);
      recSession.actions = recovery.actions;
      recSession.screenshotPaths = recovery.actions.map((a) => a.screenshotUrl);
      recSession.isLearning = true;

      const resolvedKey =
        recovery.apiKey ||
        (recovery.provider === "gemini" ? process.env.GEMINI_API_KEY : null) ||
        (recovery.provider === "openai" ? process.env.OPENAI_API_KEY : null) ||
        (recovery.provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ||
        "";

      session = createLS(sessionId, recSession, recovery.provider || "gemini", resolvedKey as string);
      session.allQuestions = recovery.allQuestions ?? [];
    }

    if (!session) {
      return NextResponse.json(
        { error: "Learning session not found" },
        { status: 404 }
      );
    }

    session.phase = "synthesizing";

    if (!session.apiKey) {
      // Demo mode — return placeholder synthesis
      session.extractedRules = [
        {
          id: randomUUID(),
          condition: "Example: value > threshold",
          action: "Mark as flagged and notify",
          source: "demo",
          confidence: 0.8,
        },
      ];
      session.extractedEdgeCases = [
        {
          id: randomUUID(),
          scenario: "Example: source application is unavailable",
          response: "Retry after 30 seconds, then skip and log",
          source: "demo",
        },
      ];
      session.detectedVariables = [];
      session.learnedSteps = session.actions.map((action, i) => ({
        id: randomUUID(),
        recordingId: session.sessionId,
        observation: {
          screenshotUrl: action.screenshotUrl,
          sourceApp: action.sourceApp,
          action: action.action,
          extractedData: action.extractedData,
          destinationService: action.destinationService,
          destinationTarget: action.destinationTarget,
        },
        reasoning: {
          questions: session.allQuestions.filter(
            (q) => q.screenshotUrl === action.screenshotUrl
          ),
          rules: [],
          edgeCases: [],
        },
        understanding: {
          purposeDescription: `Step ${i + 1}: ${action.action} on ${action.sourceApp}`,
          conditionLogic: "",
          isConditional: false,
          condition: null,
          consequences: [],
        },
      }));
      session.phase = "reviewing";

      return NextResponse.json({
        rules: session.extractedRules,
        edgeCases: session.extractedEdgeCases,
        variables: session.detectedVariables,
        learnedSteps: session.learnedSteps,
        phase: "reviewing",
      });
    }

    const config: AIProviderConfig = {
      provider: session.provider as AIProviderConfig["provider"],
      apiKey: session.apiKey,
    };

    // Step 1: Synthesize rules and edge cases
    const synthesis = await synthesizeFromQA(
      config,
      session.actions,
      session.allQuestions
    );

    session.extractedRules = synthesis.rules;
    session.extractedEdgeCases = synthesis.edgeCases;

    // Step 2: Detect variables
    const variables = await detectVariables(
      config,
      session.actions,
      session.allQuestions,
      synthesis.rules
    );
    session.detectedVariables = variables;

    // Step 3: Assemble LearnedSteps
    const learnedSteps: LearnedStep[] = session.actions.map((action) => {
      const stepUnderstanding = synthesis.stepUnderstandings.find(
        (s) => s.actionId === action.id
      );
      const actionQA = session.allQuestions.filter(
        (q) => q.screenshotUrl === action.screenshotUrl
      );
      const actionRules = synthesis.rules.filter((r) =>
        actionQA.some((q) => q.id === r.source)
      );
      const actionEdgeCases = synthesis.edgeCases.filter((e) =>
        actionQA.some((q) => q.id === e.source)
      );

      return {
        id: randomUUID(),
        recordingId: session.sessionId,
        observation: {
          screenshotUrl: action.screenshotUrl,
          sourceApp: action.sourceApp,
          action: action.action,
          extractedData: action.extractedData,
          destinationService: action.destinationService,
          destinationTarget: action.destinationTarget,
        },
        reasoning: {
          questions: actionQA,
          rules: actionRules,
          edgeCases: actionEdgeCases,
        },
        understanding: stepUnderstanding
          ? {
              purposeDescription: stepUnderstanding.purposeDescription,
              conditionLogic: stepUnderstanding.conditionLogic,
              isConditional: stepUnderstanding.isConditional,
              condition: stepUnderstanding.condition,
              consequences: stepUnderstanding.consequences,
            }
          : {
              purposeDescription: `${action.action} on ${action.sourceApp}`,
              conditionLogic: "",
              isConditional: false,
              condition: null,
              consequences: [],
            },
      };
    });

    session.learnedSteps = learnedSteps;
    session.phase = "reviewing";

    return NextResponse.json({
      rules: session.extractedRules,
      edgeCases: session.extractedEdgeCases,
      variables: session.detectedVariables,
      learnedSteps,
      phase: "reviewing",
    });
  } catch (err) {
    console.error("[learning/synthesize] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to synthesize workflow",
      },
      { status: 500 }
    );
  }
}
