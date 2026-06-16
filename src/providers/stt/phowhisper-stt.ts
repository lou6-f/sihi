import type { STTProvider, STTResult } from "./stt-provider";
import type { PhoWhisperResponse } from "@/types/stt";

/** Timeout mặc định cho mỗi request đến PhoWhisper (ms) */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * PhoWhisperSTTProvider — Gọi endpoint `/transcribe` của PhoWhisper server
 * thông qua multipart FormData.
 *
 * Cấu hình env:
 *   PHOWHISPER_URL  URL gốc của PhoWhisper server, ví dụ: http://localhost:8000
 */
export class PhoWhisperSTTProvider implements STTProvider {
  readonly name = "phowhisper";

  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.PHOWHISPER_URL ?? "").replace(/\/$/, "");
  }

  /** Kiểm tra PHOWHISPER_URL đã được thiết lập và server có thể truy cập. */
  async isAvailable(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Gửi audio blob lên PhoWhisper và trả về kết quả nhận dạng.
   * @param audioBlob - Dữ liệu âm thanh (webm, wav, mp3, …)
   * @param language  - Gợi ý ngôn ngữ (tuỳ chọn, mặc định server tự phát hiện)
   */
  async transcribe(audioBlob: Blob, language?: string): Promise<STTResult> {
    if (!this.baseUrl) {
      throw new Error(
        "[PhoWhisper] PHOWHISPER_URL chưa được cấu hình trong biến môi trường."
      );
    }

    const startTime = Date.now();

    const form = new FormData();
    form.append("audio", audioBlob, "audio.webm");
    if (language) {
      form.append("language", language);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/transcribe`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        throw new Error(
          `[PhoWhisper] Request timeout sau ${DEFAULT_TIMEOUT_MS / 1000}s.`
        );
      }
      throw new Error(`[PhoWhisper] Lỗi kết nối: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `[PhoWhisper] Server trả về HTTP ${response.status}: ${body}`
      );
    }

    const data: PhoWhisperResponse = await response.json();
    const durationMs = Date.now() - startTime;

    // Tính confidence trung bình từ các segments (nếu có)
    const confidence =
      data.segments && data.segments.length > 0
        ? data.segments.reduce((sum, s) => sum + s.confidence, 0) /
          data.segments.length
        : undefined;

    return {
      text: data.text,
      confidence,
      language: data.language,
      durationMs,
    };
  }
}
