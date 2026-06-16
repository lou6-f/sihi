import type { STTProvider, STTResult } from "./stt-provider";

/**
 * GoogleSTTProvider — Placeholder cho Google Cloud Speech-to-Text.
 *
 * Provider này CHƯA được triển khai trong phiên bản MVP.
 * Mọi lời gọi method sẽ ném lỗi NotImplementedError.
 * Để sử dụng STT, hãy dùng STT_PROVIDER=phowhisper hoặc STT_PROVIDER=webspeech.
 */
export class GoogleSTTProvider implements STTProvider {
  readonly name = "google";

  /** Google STT chưa được triển khai — luôn trả về false. */
  async isAvailable(): Promise<boolean> {
    return false;
  }

  /**
   * Chưa được triển khai.
   * @throws Error - NotImplementedError
   */
  async transcribe(_audioBlob: Blob, _language?: string): Promise<STTResult> {
    throw new Error(
      "GoogleSTTProvider chưa được triển khai trong phiên bản MVP. " +
        "Vui lòng sử dụng STT_PROVIDER=phowhisper hoặc STT_PROVIDER=webspeech trong file .env"
    );
  }
}
