/**
 * Options for TTS synthesis requests.
 */
export interface TTSOptions {
  /** BCP-47 language tag, e.g. "vi-VN", "en-US" */
  language?: string;
  /** Voice identifier (provider-specific) */
  voice?: string;
  /** Speaking rate multiplier (0.1 – 10, default 1.0) */
  rate?: number;
  /** Pitch multiplier (0 – 2, default 1.0) */
  pitch?: number;
  /** Volume level (0 – 1, default 1.0) */
  volume?: number;
}

/**
 * Result returned after a successful synthesis.
 */
export interface TTSResult {
  /** URL to the generated audio (cloud providers) */
  audioUrl?: string;
  /** Raw audio blob (cloud providers) */
  audioBlob?: Blob;
  /** The original text that was synthesised */
  text: string;
  /** Approximate playback duration in milliseconds */
  durationMs?: number;
}

/**
 * Common contract for all Text-to-Speech provider implementations.
 */
export interface TTSProvider {
  /** Human-readable provider name (e.g. "browser", "azure", "viettel") */
  readonly name: string;

  /**
   * Convert `text` to speech and return a result object.
   * Browser-based providers play audio immediately and resolve when done.
   * Cloud providers return an audio URL / Blob without auto-playing.
   */
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;

  /**
   * Check whether the provider is usable in the current environment.
   */
  isAvailable(): Promise<boolean>;
}
