import { NextRequest, NextResponse } from "next/server";
import { inferFromActions } from "@/lib/ai/learning";
import type { AIProviderConfig, AIProviderType } from "@/lib/ai/provider";
import type { CapturedAction } from "@/types/action";

/**
 * POST /api/learning/infer
 * Takes all captured actions and infers the complete workflow in one shot.
 * No Q&A needed — AI analyzes the full sequence and presents its understanding.
 */
export async function POST(request: NextRequest) {
  try {
    const { actions, provider = "gemini", apiKey } = (await request.json()) as {
      actions: CapturedAction[];
      provider?: string;
      apiKey?: string;
    };

    if (!actions || actions.length === 0) {
      return NextResponse.json(
        { error: "actions array is required" },
        { status: 400 }
      );
    }

    // Resolve API key
    const resolvedKey =
      apiKey ||
      (provider === "gemini" ? process.env.GEMINI_API_KEY : null) ||
      (provider === "openai" ? process.env.OPENAI_API_KEY : null) ||
      (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ||
      null;

    if (!resolvedKey) {
      return NextResponse.json(
        { error: "No API key available" },
        { status: 400 }
      );
    }

    const config: AIProviderConfig = {
      provider: provider as AIProviderType,
      apiKey: resolvedKey,
    };

    const result = await inferFromActions(config, actions);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[learning/infer] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to infer workflow",
      },
      { status: 500 }
    );
  }
}
