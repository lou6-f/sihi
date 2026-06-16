// ═══════════════════════════════════════
// TTS Types
// ═══════════════════════════════════════

export interface TTSProvider {
  name: string;
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
  isSpeaking: boolean;
}

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: string;
}
