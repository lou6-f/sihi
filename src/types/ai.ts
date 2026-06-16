// ═══════════════════════════════════════
// AI Types
// ═══════════════════════════════════════

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export interface EmbedResponse {
  embedding: number[];
  model?: string;
}

export interface EmbedBatchResponse {
  embeddings: number[][];
  model?: string;
}

export interface AIKeyStatus {
  alias: string;
  available: boolean;
  cooldownUntil: Date | null;
  totalRequests: number;
  failedRequests: number;
  lastUsed: Date | null;
}
