/**
 * GeminiAIProvider — The ONLY file allowed to import @google/generative-ai.
 *
 * All AI calls in the entire codebase MUST go through:
 * Service → getAIProvider() → GeminiAIProvider → GeminiKeyManager → Gemini API
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AIMessage, AIChatOptions, AIResponse } from "./ai-provider";
import { GeminiKeyManager } from "./gemini-key-manager";

// ═══════════════════════════════════════
// Error classes
// ═══════════════════════════════════════

export class AllKeysExhaustedError extends Error {
  constructor() {
    super(
      "Tất cả Gemini API keys đều không khả dụng. Vui lòng thử lại sau hoặc liên hệ admin."
    );
    this.name = "AllKeysExhaustedError";
  }
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || "";
    if (message.includes("429") || message.includes("Too Many Requests"))
      return "429";
    if (message.includes("RESOURCE_EXHAUSTED")) return "RESOURCE_EXHAUSTED";
    if (message.includes("RATE_LIMIT_EXCEEDED")) return "RATE_LIMIT_EXCEEDED";
    if (message.includes("QUOTA_EXCEEDED")) return "QUOTA_EXCEEDED";
    if (message.includes("500") || message.includes("Internal"))
      return "INTERNAL_ERROR";
    if (message.includes("503") || message.includes("Unavailable"))
      return "UNAVAILABLE";
    if (message.includes("DEADLINE_EXCEEDED")) return "DEADLINE_EXCEEDED";
    return message.slice(0, 100);
  }
  return "UNKNOWN_ERROR";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const RETRY_ERROR_CODES = ["INTERNAL_ERROR", "UNAVAILABLE", "DEADLINE_EXCEEDED"];

function isRetryError(errorCode: string): boolean {
  return RETRY_ERROR_CODES.includes(errorCode);
}

function convertMessages(
  messages: AIMessage[]
): { role: string; parts: { text: string }[] }[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function getSystemInstruction(messages: AIMessage[]): string | undefined {
  const systemMsg = messages.find((m) => m.role === "system");
  return systemMsg?.content;
}

// ═══════════════════════════════════════
// GeminiAIProvider
// ═══════════════════════════════════════

export class GeminiAIProvider implements AIProvider {
  readonly name = "gemini";
  private keyManager: GeminiKeyManager;
  private model: string;
  private embeddingModel: string;

  constructor() {
    this.keyManager = new GeminiKeyManager();
    this.model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    this.embeddingModel =
      process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
  }

  async chat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.keyManager.maxRetries; retry++) {
      const keyState = this.keyManager.getNextKey();
      if (!keyState) throw new AllKeysExhaustedError();

      const startTime = Date.now();
      try {
        const client = new GoogleGenerativeAI(keyState.key);
        const genModel = client.getGenerativeModel({
          model: this.model,
          systemInstruction: getSystemInstruction(messages),
          generationConfig: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
            topP: options?.topP,
            responseMimeType:
              options?.responseFormat === "json"
                ? "application/json"
                : undefined,
          },
        });

        const history = convertMessages(messages);
        const lastMessage = history.pop();
        if (!lastMessage) throw new Error("No messages provided");

        const chat = genModel.startChat({
          history: history.length > 0 ? history : undefined,
        });

        const result = await chat.sendMessage(lastMessage.parts);
        const response = result.response;
        const text = response.text();
        const latencyMs = Date.now() - startTime;

        const usage = response.usageMetadata;
        const tokenUsage = {
          promptTokens: usage?.promptTokenCount || 0,
          completionTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
        };

        await this.keyManager.recordSuccess(
          keyState.alias,
          tokenUsage,
          latencyMs,
          "chat"
        );

        return {
          content: text,
          usage: tokenUsage,
          finishReason: response.candidates?.[0]?.finishReason || undefined,
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        const errorCode = getErrorCode(error);
        const errorMsg = getErrorMessage(error);

        if (this.keyManager.isCooldownError(errorCode)) {
          await this.keyManager.recordFailure(
            keyState.alias,
            errorCode,
            errorMsg,
            "chat"
          );
          lastError = error instanceof Error ? error : new Error(errorMsg);
          continue; // Try next key
        }

        if (isRetryError(errorCode)) {
          await this.keyManager.recordFailure(
            keyState.alias,
            errorCode,
            errorMsg,
            "chat"
          );
          lastError = error instanceof Error ? error : new Error(errorMsg);
          continue; // Retry with any available key
        }

        // Non-retryable error
        await this.keyManager.recordFailure(
          keyState.alias,
          errorCode,
          errorMsg,
          "chat"
        );
        throw error;
      }
    }

    throw lastError || new AllKeysExhaustedError();
  }

  async *chatStream(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<string> {
    const keyState = this.keyManager.getNextKey();
    if (!keyState) throw new AllKeysExhaustedError();

    const startTime = Date.now();
    try {
      const client = new GoogleGenerativeAI(keyState.key);
      const genModel = client.getGenerativeModel({
        model: this.model,
        systemInstruction: getSystemInstruction(messages),
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
        },
      });

      const history = convertMessages(messages);
      const lastMessage = history.pop();
      if (!lastMessage) throw new Error("No messages provided");

      const chat = genModel.startChat({
        history: history.length > 0 ? history : undefined,
      });

      const result = await chat.sendMessageStream(lastMessage.parts);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }

      const latencyMs = Date.now() - startTime;
      await this.keyManager.recordSuccess(
        keyState.alias,
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs,
        "chat_stream"
      );
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorCode = getErrorCode(error);
      await this.keyManager.recordFailure(
        keyState.alias,
        errorCode,
        getErrorMessage(error),
        "chat_stream"
      );
      throw error;
    }
  }

  async embed(text: string): Promise<number[]> {
    const keyState = this.keyManager.getNextKey();
    if (!keyState) throw new AllKeysExhaustedError();

    const startTime = Date.now();
    try {
      const client = new GoogleGenerativeAI(keyState.key);
      const embModel = client.getGenerativeModel({
        model: this.embeddingModel,
      });

      const result = await embModel.embedContent(text);
      const embedding = result.embedding.values;
      const latencyMs = Date.now() - startTime;

      await this.keyManager.recordSuccess(
        keyState.alias,
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs,
        "embed"
      );

      return embedding;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorCode = getErrorCode(error);
      await this.keyManager.recordFailure(
        keyState.alias,
        errorCode,
        getErrorMessage(error),
        "embed"
      );

      // Retry with next key for cooldown errors
      if (this.keyManager.isCooldownError(errorCode)) {
        return this.embed(text); // Recursive retry
      }
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(
        batch.map((text) => this.embed(text))
      );
      results.push(...embeddings);
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    return this.keyManager.hasAvailableKey();
  }

  /**
   * Expose key manager for admin monitoring.
   */
  getKeyManager(): GeminiKeyManager {
    return this.keyManager;
  }
}
