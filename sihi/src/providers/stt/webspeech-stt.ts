import type { STTProvider, STTResult } from "./stt-provider";

/**
 * WebSpeechSTTProvider — Wrapper cho Web Speech API của trình duyệt.
 *
 * ⚠️  Chỉ hoạt động ở phía CLIENT (browser). Không dùng trong môi trường
 *     Node.js / SSR.
 *
 * Tương thích: Chrome, Edge, Safari ≥ 14.1 (Firefox chưa hỗ trợ chính thức).
 */
export class WebSpeechSTTProvider implements STTProvider {
  readonly name = "webspeech";

  async isAvailable(): Promise<boolean> {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  /**
   * Ghi âm thông qua Web Speech API.
   * Vì API này làm việc với microphone trực tiếp (không nhận Blob),
   * phương thức này khởi động phiên nhận dạng và trả kết quả đầu tiên.
   *
   * @param _audioBlob - Không dùng (Web Speech API không nhận Blob)
   * @param language   - Mã ngôn ngữ BCP-47, ví dụ: "vi-VN", "en-US"
   */
  async transcribe(_audioBlob: Blob, language?: string): Promise<STTResult> {
    if (!(await this.isAvailable())) {
      throw new Error(
        "[WebSpeech] Web Speech API không khả dụng. " +
          "Vui lòng dùng Chrome, Edge hoặc Safari."
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionImpl = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      throw new Error("[WebSpeech] Không tìm thấy SpeechRecognition constructor.");
    }

    return new Promise<STTResult>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new SpeechRecognitionImpl() as any;
      const startTime = Date.now();

      recognition.lang = language ?? "vi-VN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const result = event.results[0][0];
        resolve({
          text: result.transcript as string,
          confidence: result.confidence as number,
          language: recognition.lang as string,
          durationMs: Date.now() - startTime,
        });
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`[WebSpeech] Lỗi nhận dạng: ${event.error}`));
      };

      recognition.onnomatch = () => {
        reject(new Error("[WebSpeech] Không nhận dạng được giọng nói."));
      };

      recognition.start();
    });
  }
}
