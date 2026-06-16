import type { TTSOptions, TTSProvider, TTSResult } from "./tts-provider";

/**
 * Browser-native TTS provider backed by the Web Speech Synthesis API.
 * Works only in browser environments that expose `window.speechSynthesis`.
 */
export class BrowserTTSProvider implements TTSProvider {
  readonly name = "browser";

  /** Returns true when the Web Speech Synthesis API is present. */
  async isAvailable(): Promise<boolean> {
    return (
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }

  /**
   * Synthesise `text` using SpeechSynthesisUtterance.
   * Resolves when speech ends; rejects on error or if the API is unavailable.
   */
  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        "[BrowserTTS] Web Speech Synthesis API is not available in this environment."
      );
    }

    const startedAt = Date.now();

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      if (options?.language) utterance.lang = options.language;
      if (options?.rate !== undefined) utterance.rate = options.rate;
      if (options?.pitch !== undefined) utterance.pitch = options.pitch;
      if (options?.volume !== undefined) utterance.volume = options.volume;

      if (options?.voice) {
        const voices = window.speechSynthesis.getVoices();
        const matched = voices.find(
          (v) =>
            v.name === options.voice ||
            v.voiceURI === options.voice
        );
        if (matched) utterance.voice = matched;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (evt) =>
        reject(
          new Error(`[BrowserTTS] SpeechSynthesisErrorEvent: ${evt.error}`)
        );

      // Cancel any ongoing speech before starting
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });

    return {
      text,
      durationMs: Date.now() - startedAt,
    };
  }
}
