import type { TTSOptions, TTSProvider, TTSResult } from "./tts-provider";

/** @internal Reusable error for unimplemented cloud providers. */
function notImplemented(providerName: string): never {
  throw new Error(
    `[${providerName}] Provider is not yet implemented. ` +
      "Please configure the necessary credentials and complete the integration."
  );
}

/**
 * Viettel AI TTS provider (stub).
 *
 * @todo Integrate with Viettel AI TTS REST API:
 *   https://developers.viettel.vn/
 *   Required env vars: `VIETTEL_TTS_API_KEY`, `VIETTEL_TTS_API_URL`
 */
export class ViettelTTSProvider implements TTSProvider {
  readonly name = "viettel";

  async isAvailable(): Promise<boolean> {
    return (
      Boolean(process.env.VIETTEL_TTS_API_KEY) &&
      Boolean(process.env.VIETTEL_TTS_API_URL)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async synthesize(_text: string, _options?: TTSOptions): Promise<TTSResult> {
    notImplemented("ViettelTTS");
  }
}
