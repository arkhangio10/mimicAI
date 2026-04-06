import { NextRequest, NextResponse } from "next/server";
import { getLearningSession, createLearningSession } from "@/lib/learning-sessions";
import type { GeneratedQuestion } from "@/lib/learning-sessions";
import {
  generateFollowUp,
  generateQuestionsForAction,
  generateDemoQuestions,
} from "@/lib/ai/learning";
import { getScreenshotBase64 } from "@/lib/screenshots";
import type { AIProviderConfig } from "@/lib/ai/provider";
import type { QuestionAnswer, CapturedAction } from "@/types/action";
import { getOrCreateSession } from "@/lib/sessions";
import { randomUUID } from "crypto";
import { basename } from "path";

interface RecoveryContext {
  actions?: CapturedAction[];
  provider?: string;
  apiKey?: string;
  currentActionIndex?: number;
  allQuestions?: QuestionAnswer[];
  pendingQuestions?: GeneratedQuestion[];
  followUpCount?: number;
}

/**
 * Recover a learning session from client-provided context (e.g. after hot-reload)
 */
function recoverSession(sessionId: string, recovery: RecoveryContext) {
  if (!recovery.actions || recovery.actions.length === 0) return undefined;

  const recSession = getOrCreateSession(sessionId);
  recSession.actions = recovery.actions;
  recSession.screenshotPaths = recovery.actions.map((a: CapturedAction) => a.screenshotUrl);
  recSession.isLearning = true;

  // Resolve API key
  const apiKey =
    recovery.apiKey ||
    (recovery.provider === "gemini" ? process.env.GEMINI_API_KEY : null) ||
    (recovery.provider === "openai" ? process.env.OPENAI_API_KEY : null) ||
    (recovery.provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ||
    "";

  const learning = createLearningSession(
    sessionId,
    recSession,
    recovery.provider || "gemini",
    apiKey as string
  );

  // Restore state from client
  learning.currentActionIndex = recovery.currentActionIndex ?? 0;
  learning.allQuestions = recovery.allQuestions ?? [];
  learning.pendingQuestions = recovery.pendingQuestions ?? [];
  learning.followUpCount = recovery.followUpCount ?? 0;

  return learning;
}

/**
 * POST /api/learning/answer
 * Submit an answer to a question. Returns follow-up or next question set.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, answer, skip = false, recovery } = (await request.json()) as {
      sessionId: string;
      answer?: string;
      skip?: boolean;
      recovery?: RecoveryContext;
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    let session = getLearningSession(sessionId);

    // Try to recover if session was lost
    if (!session && recovery) {
      session = recoverSession(sessionId, recovery);
    }

    if (!session) {
      return NextResponse.json(
        { error: "Learning session not found" },
        { status: 404 }
      );
    }

    if (session.phase !== "questioning") {
      session.phase = "questioning"; // Allow recovery
    }

    const currentAction = session.actions[session.currentActionIndex];
    const currentQuestion = session.pendingQuestions[0];

    if (!currentQuestion) {
      return NextResponse.json(
        { error: "No pending question" },
        { status: 400 }
      );
    }

    // Record the answer (or skip)
    if (!skip && answer) {
      const qa: QuestionAnswer = {
        id: randomUUID(),
        category: currentQuestion.category,
        question: currentQuestion.question,
        answer,
        timestamp: Date.now(),
        screenshotUrl: currentAction?.screenshotUrl ?? "",
      };

      session.allQuestions.push(qa);
      session.currentConversation.push(qa);
    }

    // Remove the answered question from pending
    session.pendingQuestions.shift();

    // Check for follow-up (only if answered, not skipped, and we have an API key)
    let followUp: GeneratedQuestion | null = null;
    if (!skip && answer && session.apiKey && currentAction) {
      let screenshotBase64: string | undefined;
      try {
        screenshotBase64 = await getScreenshotBase64(currentAction.screenshotUrl);
      } catch {
        // proceed without screenshot
      }

      const config: AIProviderConfig = {
        provider: session.provider as AIProviderConfig["provider"],
        apiKey: session.apiKey,
      };

      followUp = await generateFollowUp(
        config,
        currentAction,
        session.currentConversation,
        session.followUpCount,
        screenshotBase64
      );

      if (followUp) {
        session.followUpCount++;
        session.pendingQuestions.unshift(followUp);
      }
    }

    // If no more pending questions for this action, advance to next action
    if (session.pendingQuestions.length === 0) {
      session.currentConversation = [];
      session.followUpCount = 0;
      session.currentActionIndex++;

      if (session.currentActionIndex >= session.actions.length) {
        session.phase = "synthesizing";

        return NextResponse.json({
          allComplete: true,
          phase: "synthesizing",
          progress: {
            currentAction: session.currentActionIndex,
            totalActions: session.actions.length,
            questionsAnswered: session.allQuestions.length,
          },
        });
      }

      const nextAction = session.actions[session.currentActionIndex];
      let nextQuestions: GeneratedQuestion[];

      if (session.apiKey) {
        let screenshotBase64: string | undefined;
        try {
          screenshotBase64 = await getScreenshotBase64(nextAction.screenshotUrl);
        } catch {
          // proceed without screenshot
        }

        const config: AIProviderConfig = {
          provider: session.provider as AIProviderConfig["provider"],
          apiKey: session.apiKey,
        };

        nextQuestions = await generateQuestionsForAction(
          config,
          nextAction,
          session.currentActionIndex,
          session.actions,
          session.allQuestions,
          screenshotBase64
        );
      } else {
        nextQuestions = generateDemoQuestions(nextAction, session.currentActionIndex);
      }

      session.pendingQuestions = nextQuestions;

      return NextResponse.json({
        actionAdvanced: true,
        currentActionIndex: session.currentActionIndex,
        currentAction: nextAction,
        screenshotFilename: basename(nextAction.screenshotUrl),
        pendingQuestions: nextQuestions,
        progress: {
          currentAction: session.currentActionIndex,
          totalActions: session.actions.length,
          questionsAnswered: session.allQuestions.length,
        },
      });
    }

    return NextResponse.json({
      followUp: followUp ?? undefined,
      pendingQuestions: session.pendingQuestions,
      progress: {
        currentAction: session.currentActionIndex,
        totalActions: session.actions.length,
        questionsAnswered: session.allQuestions.length,
      },
    });
  } catch (err) {
    console.error("[learning/answer] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to process answer",
      },
      { status: 500 }
    );
  }
}
