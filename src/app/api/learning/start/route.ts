import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import {
  createLearningSession,
  getLearningSession,
} from "@/lib/learning-sessions";
import {
  generateQuestionsForAction,
  generateDemoQuestions,
} from "@/lib/ai/learning";
import { getScreenshotBase64 } from "@/lib/screenshots";
import type { AIProviderConfig } from "@/lib/ai/provider";
import { basename } from "path";

/**
 * POST /api/learning/start
 * Initializes a learning session from a recording session.
 * Generates questions for the first action.
 */
export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      provider = "gemini",
      apiKey: clientKey,
      actions: clientActions,
    } = (await request.json()) as {
      sessionId: string;
      provider?: string;
      apiKey?: string;
      actions?: import("@/types/action").CapturedAction[];
    };

    // Resolve API key: client-provided > env var
    const apiKey =
      clientKey ||
      (provider === "gemini" ? process.env.GEMINI_API_KEY : null) ||
      (provider === "openai" ? process.env.OPENAI_API_KEY : null) ||
      (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ||
      undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Check if learning session already exists
    const existing = getLearningSession(sessionId);
    if (existing) {
      return NextResponse.json({
        sessionId: existing.sessionId,
        totalActions: existing.actions.length,
        currentActionIndex: existing.currentActionIndex,
        phase: existing.phase,
        pendingQuestions: existing.pendingQuestions,
        currentAction: existing.actions[existing.currentActionIndex] ?? null,
        screenshotFilename: existing.actions[existing.currentActionIndex]
          ? basename(existing.actions[existing.currentActionIndex].screenshotUrl)
          : null,
      });
    }

    // Get the recording session from server memory, or rebuild from client-provided actions
    let recordingSession = getSession(sessionId);

    if ((!recordingSession || recordingSession.actions.length === 0) && clientActions && clientActions.length > 0) {
      // Server lost the session (e.g. hot-reload). Rebuild from client data.
      const { getOrCreateSession } = await import("@/lib/sessions");
      recordingSession = getOrCreateSession(sessionId);
      recordingSession.actions = clientActions;
      recordingSession.screenshotPaths = clientActions.map((a) => a.screenshotUrl);
    }

    if (!recordingSession || recordingSession.actions.length === 0) {
      return NextResponse.json(
        { error: "No recording session found or no actions recorded" },
        { status: 404 }
      );
    }

    // Mark recording session as learning (prevent screenshot cleanup)
    recordingSession.isLearning = true;

    // Create learning session
    const learning = createLearningSession(
      sessionId,
      recordingSession,
      provider,
      apiKey || ""
    );

    const firstAction = learning.actions[0];

    // Generate questions for the first action
    let questions;
    if (apiKey) {
      let screenshotBase64: string | undefined;
      try {
        screenshotBase64 = await getScreenshotBase64(firstAction.screenshotUrl);
      } catch {
        // Screenshot may not exist, proceed without it
      }

      const config: AIProviderConfig = {
        provider: provider as AIProviderConfig["provider"],
        apiKey,
      };
      questions = await generateQuestionsForAction(
        config,
        firstAction,
        0,
        learning.actions,
        [],
        screenshotBase64
      );
    } else {
      questions = generateDemoQuestions(firstAction, 0);
    }

    learning.pendingQuestions = questions;

    return NextResponse.json({
      sessionId: learning.sessionId,
      totalActions: learning.actions.length,
      currentActionIndex: 0,
      phase: learning.phase,
      pendingQuestions: questions,
      currentAction: firstAction,
      screenshotFilename: basename(firstAction.screenshotUrl),
    });
  } catch (err) {
    console.error("[learning/start] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to start learning",
      },
      { status: 500 }
    );
  }
}
