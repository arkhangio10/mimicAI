import Anthropic from "@anthropic-ai/sdk";
import type { CapturedAction, ExtractedData } from "@/types/action";
import type {
  AIProvider,
  ScreenInterpretation,
  DataNotFoundError,
} from "./provider";
import { INTERPRET_PROMPT, EXTRACT_PROMPT } from "./prompts";
import { AIProviderError } from "@/lib/errors";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation> {
    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: screenshotBase64,
                },
              },
              {
                type: "text",
                text: INTERPRET_PROMPT(previousActions, context),
              },
            ],
          },
        ],
      });

      const block = response.content[0];
      if (block.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }
      return parseJSON<ScreenInterpretation>(block.text);
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        "anthropic",
        err instanceof Error ? err.message : "Anthropic interpretation failed"
      );
    }
  }

  async extractDataFromScreen(
    screenshotBase64: string,
    expectedDataSchema: Record<string, unknown>,
    sourceAppName: string
  ): Promise<ExtractedData | DataNotFoundError> {
    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: screenshotBase64,
                },
              },
              {
                type: "text",
                text: EXTRACT_PROMPT(expectedDataSchema, sourceAppName),
              },
            ],
          },
        ],
      });

      const block = response.content[0];
      if (block.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }
      return parseJSON<ExtractedData | DataNotFoundError>(block.text);
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        "anthropic",
        err instanceof Error ? err.message : "Anthropic extraction failed"
      );
    }
  }
  async generateText(prompt: string, imageBase64?: string): Promise<string> {
    try {
      const content: Anthropic.Messages.ContentBlockParam[] = [];
      if (imageBase64) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: imageBase64,
          },
        });
      }
      content.push({ type: "text", text: prompt });
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content }],
      });
      const block = response.content[0];
      if (block.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }
      return block.text;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        "anthropic",
        err instanceof Error ? err.message : "Anthropic text generation failed"
      );
    }
  }
}

function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
