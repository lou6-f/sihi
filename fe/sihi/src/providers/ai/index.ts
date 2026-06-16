import type { AIProvider } from "./ai-provider";
import { GeminiAIProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";

// Re-export types for convenience
export type {
  AIProvider,
  AIMessage,
  AIChatOptions,
  AIResponse,
} from "./ai-provider";

export { AllKeysExhaustedError, GeminiAIProvider } from "./gemini-provider";
export { GeminiKeyManager } from "./gemini-key-manager";
export type { KeyStatusReport, UsageStats, TokenUsage } from "./gemini-key-manager";

/**
 * Create an AIProvider based on the AI_PROVIDER environment variable.
 * MVP supports only "gemini". "openai" is a stub placeholder.
 */
function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "gemini";

  switch (provider) {
    case "gemini":
      return new GeminiAIProvider();
    case "openai":
      return new OpenAIProvider();
    default:
      throw new Error(
        `Unknown AI provider: "${provider}". ` +
          `Supported: gemini (MVP), openai (placeholder).`
      );
  }
}

/**
 * Singleton AIProvider instance.
 * All AI calls in the codebase MUST use this function.
 *
 * Usage:
 * ```typescript
 * import { getAIProvider } from "@/providers/ai";
 * const ai = getAIProvider();
 * const result = await ai.chat(messages);
 * ```
 */
let _instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!_instance) {
    _instance = createAIProvider();
  }
  return _instance;
}

/**
 * Reset the singleton (useful for testing).
 */
export function resetAIProvider(): void {
  _instance = null;
}
