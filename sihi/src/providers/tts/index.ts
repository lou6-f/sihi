import type { TTSProvider } from "./tts-provider";
import { BrowserTTSProvider } from "./browser-tts";
import { AzureTTSProvider } from "./azure-tts";
import { ViettelTTSProvider } from "./viettel-tts";

export type { TTSOptions, TTSResult, TTSProvider } from "./tts-provider";
export { BrowserTTSProvider } from "./browser-tts";
export { AzureTTSProvider } from "./azure-tts";
export { ViettelTTSProvider } from "./viettel-tts";

/** Singleton instance – created once and reused for the lifetime of the process. */
let ttsProviderInstance: TTSProvider | null = null;

/**
 * Instantiate the TTS provider configured via the `TTS_PROVIDER` environment
 * variable. Falls back to `"browser"` when the variable is absent.
 *
 * Supported values: `"browser"` | `"azure"` | `"viettel"`
 */
function createTTSProvider(): TTSProvider {
  const providerName = (
    process.env.TTS_PROVIDER ?? "browser"
  ).toLowerCase();

  switch (providerName) {
    case "browser":
      return new BrowserTTSProvider();

    case "azure":
      return new AzureTTSProvider();

    case "viettel":
      return new ViettelTTSProvider();

    default:
      console.warn(
        `[TTS] Provider "${providerName}" không hợp lệ, sử dụng browser`
      );
      return new BrowserTTSProvider();
  }
}

/**
 * Return the singleton TTS provider instance, creating it on first call.
 *
 * @example
 * ```ts
 * const tts = getTTSProvider();
 * await tts.synthesize("Xin chào!", { language: "vi-VN" });
 * ```
 */
export function getTTSProvider(): TTSProvider {
  if (!ttsProviderInstance) {
    ttsProviderInstance = createTTSProvider();
    console.log(`[TTS] Đã khởi tạo provider: ${ttsProviderInstance.name}`);
  }
  return ttsProviderInstance;
}
