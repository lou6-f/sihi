import type { STTProvider } from "./stt-provider";
import { PhoWhisperSTTProvider } from "./phowhisper-stt";
import { WebSpeechSTTProvider } from "./webspeech-stt";
import { GoogleSTTProvider } from "./google-stt";

export type { STTResult, STTProvider } from "./stt-provider";
export { PhoWhisperSTTProvider } from "./phowhisper-stt";
export { WebSpeechSTTProvider } from "./webspeech-stt";
export { GoogleSTTProvider } from "./google-stt";

/** Singleton instance — khởi tạo lần đầu rồi tái sử dụng. */
let sttProviderInstance: STTProvider | null = null;

/**
 * Tạo STT provider dựa trên biến môi trường `STT_PROVIDER`.
 *
 * Giá trị hợp lệ:
 *   - `phowhisper`  → PhoWhisperSTTProvider (mặc định)
 *   - `webspeech`   → WebSpeechSTTProvider (chỉ client-side)
 *   - `google`      → GoogleSTTProvider (stub, chưa triển khai)
 */
function createSTTProvider(): STTProvider {
  const providerName = (process.env.STT_PROVIDER ?? "phowhisper").toLowerCase();

  switch (providerName) {
    case "phowhisper":
      return new PhoWhisperSTTProvider();

    case "webspeech":
      return new WebSpeechSTTProvider();

    case "google":
      return new GoogleSTTProvider();

    default:
      console.warn(
        `[STT] Provider "${providerName}" không hợp lệ, sử dụng phowhisper`
      );
      return new PhoWhisperSTTProvider();
  }
}

/**
 * Trả về STT provider singleton.
 * Instance được tạo một lần duy nhất tại lần gọi đầu tiên.
 */
export function getSTTProvider(): STTProvider {
  if (!sttProviderInstance) {
    sttProviderInstance = createSTTProvider();
    console.log(`[STT] Đã khởi tạo provider: ${sttProviderInstance.name}`);
  }
  return sttProviderInstance;
}
