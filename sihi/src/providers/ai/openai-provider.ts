import type { AIProvider, AIMessage, AIChatOptions, AIResponse } from "./ai-provider";

/**
 * OpenAIProvider — Placeholder for future implementation.
 *
 * This provider is NOT implemented in the MVP.
 * If AI_PROVIDER=openai is set, all method calls will throw an error
 * instructing the user to switch to gemini.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  async chat(
    _messages: AIMessage[],
    _options?: AIChatOptions
  ): Promise<AIResponse> {
    throw new Error(
      "OpenAIProvider chưa được triển khai trong phiên bản MVP. " +
        "Vui lòng sử dụng AI_PROVIDER=gemini trong file .env"
    );
  }

  async *chatStream(
    _messages: AIMessage[],
    _options?: AIChatOptions
  ): AsyncGenerator<string> {
    throw new Error(
      "OpenAIProvider chưa được triển khai trong phiên bản MVP. " +
        "Vui lòng sử dụng AI_PROVIDER=gemini trong file .env"
    );
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      "OpenAIProvider chưa được triển khai trong phiên bản MVP. " +
        "Vui lòng sử dụng AI_PROVIDER=gemini trong file .env"
    );
  }

  async embedBatch(_texts: string[]): Promise<number[][]> {
    throw new Error(
      "OpenAIProvider chưa được triển khai trong phiên bản MVP. " +
        "Vui lòng sử dụng AI_PROVIDER=gemini trong file .env"
    );
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
