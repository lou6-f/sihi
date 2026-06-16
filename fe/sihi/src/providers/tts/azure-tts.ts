import type { TTSOptions, TTSProvider, TTSResult } from "./tts-provider";

/** @internal Reusable error for unimplemented cloud providers. */
function notImplemented(providerName: string): never {
  throw new Error(
    `[${providerName}] Provider is not yet implemented. ` +
      "Please configure the necessary credentials and complete the integration."
  );
}

/**
 * Azure Cognitive Services TTS provider (stub).
 *
 * @todo Integrate with Azure Speech SDK:
 *   https://learn.microsoft.com/azure/cognitive-services/speech-service/
 *   Required env vars: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`
 */
export class AzureTTSProvider implements TTSProvider {
  readonly name = "azure";

  async isAvailable(): Promise<boolean> {
    return (
      Boolean(process.env.AZURE_SPEECH_KEY) &&
      Boolean(process.env.AZURE_SPEECH_REGION)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async synthesize(_text: string, _options?: TTSOptions): Promise<TTSResult> {
    notImplemented("AzureTTS");
  }
}
