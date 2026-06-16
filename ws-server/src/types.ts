export type InterviewState =
  | "CONNECTING"
  | "READY"
  | "AI_SPEAKING"
  | "USER_SPEAKING"
  | "PROCESSING"
  | "PAUSED"
  | "COMPLETED"
  | "ERROR";

export type ClientMessage =
  | { type: "START_INTERVIEW" }
  | { type: "USER_AUDIO"; format: "webm" | "wav" }
  | { type: "USER_TEXT"; text: string }
  | { type: "TTS_DONE" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "END_INTERVIEW" }
  | { type: "PING" };

export type ServerMessage =
  | { type: "STATE_CHANGE"; state: InterviewState }
  | {
      type: "AI_QUESTION";
      text: string;
      questionNumber: number;
      category: string;
      difficulty: number;
    }
  | { type: "TRANSCRIPT_UPDATE"; text: string; isFinal: boolean }
  | {
      type: "PROGRESS";
      current: number;
      total: number;
      elapsed: number;
    }
  | { type: "COMPLETED"; reportId: string }
  | { type: "ERROR"; message: string; code: string }
  | { type: "PONG" };

export interface WSTokenPayload {
  sub: string;
  email: string;
  role: string;
  purpose: string;
}
