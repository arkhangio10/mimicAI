import { NextRequest, NextResponse } from "next/server";
import { saveScreenshot } from "@/lib/screenshots";
import { createProvider, type AIProviderConfig } from "@/lib/ai/provider";
import {
  getOrCreateSession,
  deleteSession,
  notifyListeners,
} from "@/lib/sessions";
import type { CapturedAction } from "@/types/action";
import { randomUUID } from "crypto";

/**
 * POST /api/capture
 * Receives a screenshot from the client, saves to temp, sends to AI for interpretation.
 * Returns the interpreted action.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      screenshot,
      sessionId,
      provider: providerType = "gemini",
      apiKey,
      context = "",
    } = body as {
      screenshot: string;
      sessionId: string;
      provider?: string;
      apiKey?: string;
      context?: string;
    };

    if (!screenshot || !sessionId) {
      return NextResponse.json(
        { error: "screenshot and sessionId are required" },
        { status: 400 }
      );
    }

    const session = getOrCreateSession(sessionId);

    // Save screenshot to temp
    const filepath = await saveScreenshot(screenshot);
    session.screenshotPaths.push(filepath);

    // Resolve API key: client-provided > env var > demo mode
    const resolvedKey =
      apiKey ||
      (providerType === "gemini" ? process.env.GEMINI_API_KEY : null) ||
      (providerType === "openai" ? process.env.OPENAI_API_KEY : null) ||
      (providerType === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ||
      null;

    if (!resolvedKey) {
      const action: CapturedAction = {
        id: randomUUID(),
        timestamp: Date.now(),
        screenshotUrl: filepath,
        sourceApp: "unknown",
        action: "screen_capture",
        actionTarget: "full_screen",
        extractedData: null,
        destinationService: null,
        destinationTarget: null,
        confidence: 0,
        needsClarification: false,
      };
      session.actions.push(action);
      notifyListeners(sessionId, action);

      return NextResponse.json({
        action,
        mode: "demo",
        message:
          "No API key available — screenshot saved but not interpreted. Set your API key in Settings or .env.",
      });
    }

    // Interpret via AI provider
    const config: AIProviderConfig = {
      provider: providerType as AIProviderConfig["provider"],
      apiKey: resolvedKey,
    };
    const provider = createProvider(config);

    const interpretation = await provider.interpretScreenshot(
      screenshot,
      session.actions.slice(-5),
      context
    );

    const action: CapturedAction = {
      id: randomUUID(),
      timestamp: Date.now(),
      screenshotUrl: filepath,
      sourceApp: interpretation.sourceApp,
      action: interpretation.action,
      actionTarget: interpretation.actionTarget,
      extractedData: interpretation.extractedData,
      destinationService: interpretation.destinationService,
      destinationTarget: interpretation.destinationTarget,
      confidence: interpretation.confidence,
      needsClarification: interpretation.needsClarification,
    };

    session.actions.push(action);
    notifyListeners(sessionId, action);

    return NextResponse.json({
      action,
      clarificationQuestion: interpretation.clarificationQuestion,
    });
  } catch (err) {
    console.error("[capture] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to process screenshot",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/capture
 * Ends a recording session and cleans up temp files.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const session = getOrCreateSession(sessionId);
  const actions = [...session.actions];
  deleteSession(sessionId);

  return NextResponse.json({
    message: "Session ended",
    totalActions: actions.length,
    actions,
  });
}
