import type { CapturedAction, ExtractedData } from "@/types/action";

export interface ScreenInterpretation {
  sourceApp: string;
  action: string;
  actionTarget: string;
  extractedData: ExtractedData | null;
  destinationService:
    | "gmail"
    | "sheets"
    | "slack"
    | "browser"
    | "unknown"
    | null;
  destinationTarget: string | null;
  dataFlow:
    | "read_from_screen"
    | "write_to_app"
    | "transform"
    | "navigate";
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface DataNotFoundError {
  error: "DATA_NOT_FOUND";
  reason: string;
  whatIsVisible: string;
}

export interface AIProvider {
  name: string;

  interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation>;

  extractDataFromScreen(
    screenshotBase64: string,
    expectedDataSchema: Record<string, unknown>,
    sourceAppName: string
  ): Promise<ExtractedData | DataNotFoundError>;

  generateText(
    prompt: string,
    imageBase64?: string
  ): Promise<string>;
}

export type AIProviderType = "gemini" | "openai" | "anthropic";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
}

export async function createProviderAsync(
  config: AIProviderConfig
): Promise<AIProvider> {
  switch (config.provider) {
    case "gemini": {
      const { GeminiProvider } = await import("./gemini");
      return new GeminiProvider(config.apiKey);
    }
    case "openai": {
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider(config.apiKey);
    }
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic");
      return new AnthropicProvider(config.apiKey);
    }
    default: {
      const { GeminiProvider } = await import("./gemini");
      return new GeminiProvider(config.apiKey);
    }
  }
}

// Synchronous version — imports all providers upfront (used in API routes)
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";

export function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider(config.apiKey);
    case "openai":
      return new OpenAIProvider(config.apiKey);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    default:
      return new GeminiProvider(config.apiKey);
  }
}
