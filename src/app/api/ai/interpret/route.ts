import { NextRequest, NextResponse } from "next/server";
import { createProvider, type AIProviderConfig } from "@/lib/ai/provider";
import { getScreenshotBase64 } from "@/lib/screenshots";
import type { CapturedAction } from "@/types/action";

/**
 * POST /api/ai/interpret
 * Sends a screenshot to the selected AI provider for interpretation.
 * Can accept either a base64 string directly or a file path to read.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      screenshot,
      filepath,
      provider: providerType = "gemini",
      apiKey,
      previousActions = [],
      context = "",
    } = body as {
      screenshot?: string;
      filepath?: string;
      provider?: string;
      apiKey: string;
      previousActions?: CapturedAction[];
      context?: string;
    };

    if (!apiKey) {
      return NextResponse.json(
        { error: "apiKey is required" },
        { status: 400 }
      );
    }

    // Get base64 screenshot from either direct input or file path
    let base64: string;
    if (screenshot) {
      base64 = screenshot;
    } else if (filepath) {
      base64 = await getScreenshotBase64(filepath);
    } else {
      return NextResponse.json(
        { error: "Either screenshot (base64) or filepath is required" },
        { status: 400 }
      );
    }

    const config: AIProviderConfig = {
      provider: providerType as AIProviderConfig["provider"],
      apiKey,
    };
    const provider = createProvider(config);

    const interpretation = await provider.interpretScreenshot(
      base64,
      previousActions,
      context
    );

    return NextResponse.json({ interpretation });
  } catch (err) {
    console.error("[ai/interpret] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "AI interpretation failed",
      },
      { status: 500 }
    );
  }
}
