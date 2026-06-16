// ═══════════════════════════════════════
// STT Provider Interface
// ═══════════════════════════════════════

/**
 * Kết quả trả về sau khi nhận dạng giọng nói.
 */
export interface STTResult {
  /** Văn bản đã được nhận dạng */
  text: string;
  /** Độ tin cậy từ 0–1 (không bắt buộc) */
  confidence?: number;
  /** Mã ngôn ngữ được phát hiện, ví dụ: "vi", "en" */
  language?: string;
  /** Thời gian xử lý tính bằng milliseconds */
  durationMs?: number;
}

/**
 * Contract chung cho mọi Speech-to-Text provider trong SiHi.
 */
export interface STTProvider {
  /** Tên định danh của provider */
  readonly name: string;

  /**
   * Chuyển đổi audio blob thành văn bản.
   * @param audioBlob - Dữ liệu âm thanh cần nhận dạng
   * @param language  - Gợi ý ngôn ngữ, ví dụ: "vi", "en" (tuỳ chọn)
   */
  transcribe(audioBlob: Blob, language?: string): Promise<STTResult>;

  /**
   * Kiểm tra provider có khả dụng không (API key, URL, browser support, …).
   */
  isAvailable(): Promise<boolean>;
}
