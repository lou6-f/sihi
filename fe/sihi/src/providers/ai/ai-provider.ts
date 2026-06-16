export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: "text" | "json";
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface AIProvider {
  readonly name: string;

  /**
   * Send a chat message and get a response.
   */
  chat(messages: AIMessage[], options?: AIChatOptions): Promise<AIResponse>;

  /**
   * Send a chat message and stream the response.
   */
  chatStream(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<string>;

  /**
   * Generate an embedding vector for a single text.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embedding vectors for multiple texts.
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Check if the provider is available and has active keys.
   */
  isAvailable(): Promise<boolean>;
}
