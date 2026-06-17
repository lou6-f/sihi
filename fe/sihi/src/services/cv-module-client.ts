/**
 * cv-module-client.ts
 * HTTP client để gọi cv-module FastAPI (port 8002)
 * 
 * API endpoints:
 *   POST /api/cv/analyze        → { session_id, status: "processing" }
 *   GET  /api/cv/{session_id}   → { status: "processing" | "done" | "failed", ...data }
 */

import type { CVAnalysisResult } from "./cv-analysis.service";

// ─────────────────────────────────────
// Config
// ─────────────────────────────────────

const CV_MODULE_URL =
  process.env.CV_MODULE_URL || "http://localhost:8002";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 300_000; // 5 phút

// ─────────────────────────────────────
// Types từ cv-module
// ─────────────────────────────────────

export interface CVModuleSession {
  session_id: string;
  status: "processing" | "done" | "failed";
  estimated_seconds?: number;
}

interface CVModuleAnalysis {
  // Fields từ cv-module response
  overall_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  skills?: {
    technical?: string[];
    soft?: string[];
    missing?: string[];
  };
  experience?: {
    projects?: number;
    relevant_experience?: string;
    assessment?: string;
  };
  suggestions?: string[];
  interview_focus?: string[];
  readiness_level?: string;
  kg_enrichment?: unknown;
  questions?: Array<{
    question: string;
    type: string;
    difficulty: string;
    [key: string]: unknown;
  }>;
}

// cv-module evaluation result types
export interface CVModuleEvalQuestion {
  question_index: number;
  question_text: string;
  answer_text: string;
  star_scores: { situation: number; task: number; action: number; result: number };
  question_score: number; // 0-10
  comment: string;
}

export interface CVModuleEvalResult {
  questions: CVModuleEvalQuestion[];
  overall: {
    overall_score: number;  // 0-10
    strengths: string[];
    key_improvements: string[];
    overall_comment: string;
  };
  kg_context_used: boolean;
  session_id: string;
  processing_time_ms: number;
}

// ─────────────────────────────────────
// Client
// ─────────────────────────────────────

export class CVModuleClient {
  private baseUrl: string;

  constructor(baseUrl = CV_MODULE_URL) {
    this.baseUrl = baseUrl;
  }

  /** Kiểm tra cv-module có đang chạy không */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/ready`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return data.ready === true;
    } catch {
      return false;
    }
  }

  /**
   * Gửi CV lên cv-module để phân tích.
   * Trả về session_id để polling.
   */
  async submitAnalysis(params: {
    fileBuffer: Buffer;
    fileName: string;
    jobTitle: string;
    jobDescription: string;
    experienceLevel: string;
    numQuestions?: number;
    userId?: string;
  }): Promise<CVModuleSession> {
    const form = new FormData();

    // Tạo Blob từ Buffer
    const blob = new Blob([params.fileBuffer], { type: "application/pdf" });
    form.append("file", blob, params.fileName);
    form.append("job_title", params.jobTitle);
    form.append("job_description", params.jobDescription);
    form.append("experience_level", params.experienceLevel);
    form.append("num_questions", String(params.numQuestions ?? 10));
    if (params.userId) form.append("user_id", params.userId);

    const res = await fetch(`${this.baseUrl}/api/cv/analyze`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`cv-module analyze failed (${res.status}): ${err}`);
    }

    return res.json();
  }

  /**
   * Poll trạng thái session cho đến khi done hoặc failed.
   */
  async pollUntilDone(sessionId: string): Promise<CVModuleAnalysis> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const res = await fetch(`${this.baseUrl}/api/cv/${sessionId}`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 202) continue; // Still processing

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`cv-module poll failed (${res.status}): ${err}`);
      }

      const data = await res.json();

      if (data.status === "failed") {
        throw new Error(`cv-module pipeline failed: ${data.detail || data.reason}`);
      }

      if (data.status !== "processing") {
        return data as CVModuleAnalysis;
      }
    }

    throw new Error("cv-module timeout: phân tích CV quá lâu (>5 phút)");
  }

  /**
   * Submit + poll + trả về kết quả đã mapped sang CVAnalysisResult của SiHi.
   */
  async analyzeAndWait(params: {
    fileBuffer: Buffer;
    fileName: string;
    jobTitle: string;
    jobDescription: string;
    experienceLevel: string;
    numQuestions?: number;
    userId?: string;
  }): Promise<{ result: CVAnalysisResult; sessionId: string; questions?: CVModuleAnalysis["questions"] }> {
    const session = await this.submitAnalysis(params);
    const raw = await this.pollUntilDone(session.session_id);
    const result = mapToSiHiFormat(raw);
    return { result, sessionId: session.session_id, questions: raw.questions };
  }

  /**
   * Gửi transcript lên cv-module để chấm điểm (có KG context từ cv_session_id).
   * Poll cho đến khi có kết quả.
   */
  async evaluateAndWait(params: {
    transcript: Array<{ role: "user" | "model"; text: string }>;
    cvSessionId: string;
    userId?: string;
    interviewSessionId?: string;
    timeoutMs?: number;
  }): Promise<CVModuleEvalResult> {
    const timeout = params.timeoutMs ?? 120_000; // 2 phút

    // Submit evaluation job
    const submitRes = await fetch(`${this.baseUrl}/api/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interview: params.transcript,
        cv_session_id: params.cvSessionId,
        user_id: params.userId,
        interview_session_id: params.interviewSessionId,
        target_language: "vi",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!submitRes.ok) {
      const err = await submitRes.text();
      throw new Error(`cv-module evaluate submit failed (${submitRes.status}): ${err}`);
    }

    const { session_id } = await submitRes.json() as { session_id: string; status: string };

    // Poll until done
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await sleep(3000);
      const pollRes = await fetch(`${this.baseUrl}/api/evaluations/${session_id}`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (pollRes.status === 202) continue; // still processing

      if (!pollRes.ok) {
        const err = await pollRes.text();
        throw new Error(`cv-module evaluate poll failed (${pollRes.status}): ${err}`);
      }

      const data = await pollRes.json();
      if (data.status === "failed") throw new Error(`cv-module evaluation failed: ${data.detail || data.reason}`);
      if (data.status !== "processing") return { ...data, session_id } as CVModuleEvalResult;
    }

    throw new Error("cv-module evaluation timeout (>2 phút)");
  }
}

// ─────────────────────────────────────
// Map cv-module response → SiHi format
// ─────────────────────────────────────

function mapToSiHiFormat(raw: CVModuleAnalysis): CVAnalysisResult {
  return {
    overallScore: raw.overall_score ?? 0,
    strengths: raw.strengths ?? [],
    weaknesses: raw.weaknesses ?? [],
    skills: {
      technical: raw.skills?.technical ?? [],
      soft: raw.skills?.soft ?? [],
      missing: raw.skills?.missing ?? [],
    },
    experience: {
      projects: raw.experience?.projects ?? 0,
      relevantExperience: raw.experience?.relevant_experience ?? "",
      assessment: raw.experience?.assessment ?? "",
    },
    suggestions: raw.suggestions ?? [],
    interviewFocus: raw.interview_focus ?? [],
    readinessLevel: raw.readiness_level ?? "unknown",
  };
}

// ─────────────────────────────────────
// Map field/level → cv-module format
// ─────────────────────────────────────

const FIELD_TO_JOB_TITLE: Record<string, string> = {
  FRONTEND: "Frontend Developer",
  BACKEND: "Backend Developer",
  FULLSTACK: "Fullstack Developer",
  DATA: "Data Engineer / Data Scientist",
  DEVOPS: "DevOps Engineer",
  MOBILE: "Mobile Developer",
  AI: "AI / ML Engineer",
};

const LEVEL_TO_EXPERIENCE: Record<string, string> = {
  INTERN: "intern",
  FRESHER: "fresher",
  JUNIOR: "junior",
  MID: "mid",
  SENIOR: "senior",
  LEAD: "lead",
};

export function mapFieldToJobTitle(field: string): string {
  return FIELD_TO_JOB_TITLE[field.toUpperCase()] ?? field;
}

export function mapLevelToExperience(level: string): string {
  return LEVEL_TO_EXPERIENCE[level.toUpperCase()] ?? "fresher";
}

// ─────────────────────────────────────
// Singleton
// ─────────────────────────────────────

let _client: CVModuleClient | null = null;

export function getCVModuleClient(): CVModuleClient {
  if (!_client) _client = new CVModuleClient();
  return _client;
}

// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
