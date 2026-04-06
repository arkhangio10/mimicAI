import { NextRequest, NextResponse } from "next/server";
import { getLearningSession } from "@/lib/learning-sessions";
import { basename } from "path";

/**
 * GET /api/learning/status?sessionId=xxx
 * Returns the current learning session status.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const session = getLearningSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Learning session not found" },
      { status: 404 }
    );
  }

  const currentAction = session.actions[session.currentActionIndex] ?? null;

  return NextResponse.json({
    sessionId: session.sessionId,
    phase: session.phase,
    currentActionIndex: session.currentActionIndex,
    totalActions: session.actions.length,
    questionsAnswered: session.allQuestions.length,
    pendingQuestions: session.pendingQuestions,
    currentAction,
    screenshotFilename: currentAction ? basename(currentAction.screenshotUrl) : null,
    rules: session.extractedRules,
    edgeCases: session.extractedEdgeCases,
    variables: session.detectedVariables,
    learnedSteps: session.learnedSteps,
  });
}
