import OpenAI from "openai";
import type { CapturedAction, ExtractedData } from "@/types/action";
import type {
  AIProvider,
  ScreenInterpretation,
  DataNotFoundError,
} from "./provider";
import { INTERPRET_PROMPT, EXTRACT_PROMPT } from "./prompts";
import { AIProviderError } from "@/lib/errors";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${screenshotBase64}`,
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

      const text = response.choices[0].message.content!;
      return parseJSON<ScreenInterpretation>(text);
    } catch (err) {
      throw new AIProviderError(
        "openai",
        err instanceof Error ? err.message : "OpenAI interpretation failed"
      );
    }
  }

  async extractDataFromScreen(
    screenshotBase64: string,
    expectedDataSchema: Record<string, unknown>,
    sourceAppName: string
  ): Promise<ExtractedData | DataNotFoundError> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${screenshotBase64}`,
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

      const text = response.choices[0].message.content!;
      return parseJSON<ExtractedData | DataNotFoundError>(text);
    } catch (err) {
      throw new AIProviderError(
        "openai",
        err instanceof Error ? err.message : "OpenAI extraction failed"
      );
    }
  }
  async generateText(prompt: string, imageBase64?: string): Promise<string> {
    try {
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
      if (imageBase64) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        });
      }
      content.push({ type: "text", text: prompt });
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [{ role: "user", content }],
      });
      return response.choices[0].message.content!;
    } catch (err) {
      throw new AIProviderError(
        "openai",
        err instanceof Error ? err.message : "OpenAI text generation failed"
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
