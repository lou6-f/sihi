// ═══════════════════════════════════════
// STT Types
// ═══════════════════════════════════════

export interface STTProvider {
  name: string;
  transcribe(audio: Blob): Promise<STTResult>;
}

export interface STTResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface PhoWhisperResponse {
  text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  language: string;
  duration: number;
}
