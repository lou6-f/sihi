// ═══════════════════════════════════════
// WebSocket Types
// ═══════════════════════════════════════

export type WSMessageType =
  | "INTERVIEW_START"
  | "INTERVIEW_QUESTION"
  | "INTERVIEW_ANSWER"
  | "INTERVIEW_EVALUATION"
  | "INTERVIEW_END"
  | "STT_RESULT"
  | "TTS_REQUEST"
  | "ERROR"
  | "PING"
  | "PONG";

export interface WSMessage {
  type: WSMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface WSInterviewStart {
  type: "INTERVIEW_START";
  payload: {
    interviewId: string;
  };
}

export interface WSInterviewQuestion {
  type: "INTERVIEW_QUESTION";
  payload: {
    question: string;
    questionNumber: number;
    category: string;
    difficulty: number;
  };
}

export interface WSInterviewAnswer {
  type: "INTERVIEW_ANSWER";
  payload: {
    transcript: string;
    questionNumber: number;
  };
}

export interface WSError {
  type: "ERROR";
  payload: {
    code: string;
    message: string;
  };
}
