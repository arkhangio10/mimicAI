import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CapturedAction, ExtractedData } from "@/types/action";
import type {
  AIProvider,
  ScreenInterpretation,
  DataNotFoundError,
} from "./provider";
import { INTERPRET_PROMPT, EXTRACT_PROMPT } from "./prompts";
import { AIProviderError } from "@/lib/errors";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private model;

  constructor(apiKey: string) {
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async interpretScreenshot(
    screenshotBase64: string,
    previousActions: CapturedAction[],
    context: string
  ): Promise<ScreenInterpretation> {
    try {
      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: screenshotBase64,
          },
        },
        INTERPRET_PROMPT(previousActions, context),
      ]);

      const text = result.response.text();
      return parseJSON<ScreenInterpretation>(text);
    } catch (err) {
      throw new AIProviderError(
        "gemini",
        err instanceof Error ? err.message : "Gemini interpretation failed"
      );
    }
  }

  async extractDataFromScreen(
    screenshotBase64: string,
    expectedDataSchema: Record<string, unknown>,
    sourceAppName: string
  ): Promise<ExtractedData | DataNotFoundError> {
    try {
      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: screenshotBase64,
          },
        },
        EXTRACT_PROMPT(expectedDataSchema, sourceAppName),
      ]);

      const text = result.response.text();
      return parseJSON<ExtractedData | DataNotFoundError>(text);
    } catch (err) {
      throw new AIProviderError(
        "gemini",
        err instanceof Error ? err.message : "Gemini extraction failed"
      );
    }
  }

  async generateText(prompt: string, imageBase64?: string): Promise<string> {
    try {
      const parts: ({ inlineData: { mimeType: string; data: string } } | string)[] = [];
      if (imageBase64) {
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: imageBase64 },
        });
      }
      parts.push(prompt);
      const result = await this.model.generateContent(parts);
      return result.response.text();
    } catch (err) {
      throw new AIProviderError(
        "gemini",
        err instanceof Error ? err.message : "Gemini text generation failed"
      );
    }
  }
}

/** Strip markdown code fences and parse JSON */
function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
