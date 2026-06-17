import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";
import { buildAnswerEvaluationPrompt } from "@/prompts/evaluator";
import type { RichEvaluation, AdaptiveAction } from "@/prompts/interviewer";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface AnswerEvaluationInput {
  question: string;
  answer: string;
  category: string;
  difficulty: number;
  field: string;
  level: string;
  previousAnswers?: Array<{ question: string; answer: string }>;
  mentionedProjects?: string[];
}

// Re-export RichEvaluation for consumers
export type { RichEvaluation, AdaptiveAction };

// Legacy type kept for backwards compat
export interface InternalEvaluation {
  score: number;
  keyPointsCovered: string[];
  keyPointsMissed: string[];
  feedback: string;
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

/**
 * Trích xuất JSON từ response của AI — tương đương _extract_json() trong Python.
 * Xử lý cả trường hợp AI bọc JSON trong markdown code block (```json ... ```).
 */
function extractJSON(text: string): unknown {
  let s = text.trim();
  // Bóc markdown code block nếu có
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  // Tìm object JSON đầu tiên và cuối cùng (bỏ text thừa trước/sau)
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    return JSON.parse(s.slice(start, end + 1));
  }
  return JSON.parse(s);
}

/** Các chuỗi placeholder đại diện cho câu trả lời im lặng */
const SILENT_PLACEHOLDERS = new Set([
  "(không trả lời)",
  "(im lặng)",
  "(silence)",
  "(no answer)",
  "(không có câu trả lời)",
  "...",
]);

function isSilentAnswer(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();
  return trimmed === "" || SILENT_PLACEHOLDERS.has(trimmed);
}

/** RichEvaluation trả về khi ứng viên hoàn toàn không trả lời */
const SILENT_EVALUATION: RichEvaluation = {
  score: 0,
  accuracy: 0,
  depth: 0,
  confidence: 0,
  communication: 0,
  understanding: 0,
  isUnknown: true,
  mentionedProjects: [],
  suggestedAction: "GIVE_HINT",
  keyPointsCovered: [],
  keyPointsMissed: [],
  feedback: "Ứng viên không trả lời câu hỏi này.",
};

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class InterviewEvaluationService {
  constructor(
    private ai: AIProvider,
    private prisma: PrismaClient
  ) {}

  /**
   * Evaluate a single answer during the interview.
   * Returns rich multi-dimensional evaluation with adaptive signals.
   */
  async evaluateAnswer(input: AnswerEvaluationInput): Promise<RichEvaluation> {
    // ── Bắt im lặng trước, không gọi AI ──
    if (isSilentAnswer(input.answer)) {
      return SILENT_EVALUATION;
    }

    const messages = buildAnswerEvaluationPrompt({
      question: input.question,
      answer: input.answer,
      category: input.category,
      difficulty: input.difficulty,
      field: input.field,
      level: input.level,
      previousAnswers: input.previousAnswers,
      mentionedProjects: input.mentionedProjects,
    });

    const response = await this.ai.chat(messages, {
      temperature: 0.2,
      responseFormat: "json",
    });

    try {
      const raw = extractJSON(response.content) as Record<string, unknown>;

      // Clamp all scores 0-10
      const clamp = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 0));

      const evaluation: RichEvaluation = {
        score: clamp(raw.score),
        accuracy: clamp(raw.accuracy),
        depth: clamp(raw.depth),
        confidence: clamp(raw.confidence),
        communication: clamp(raw.communication),
        understanding: clamp(raw.understanding),
        isUnknown: Boolean(raw.isUnknown),
        mentionedProjects: Array.isArray(raw.mentionedProjects) ? raw.mentionedProjects : [],
        suggestedAction: (raw.suggestedAction as AdaptiveAction) || "ASK_NEW_QUESTION",
        keyPointsCovered: Array.isArray(raw.keyPointsCovered) ? raw.keyPointsCovered : [],
        keyPointsMissed: Array.isArray(raw.keyPointsMissed) ? raw.keyPointsMissed : [],
        feedback: String(raw.feedback || ""),
        starEval: raw.starEval as RichEvaluation["starEval"] ?? undefined,
      };

      return evaluation;
    } catch {
      // Fallback khi AI trả về response không parse được — dùng 0 thay vì 5
      // để tránh làm lệch điểm tổng kết
      return {
        score: 0,
        accuracy: 0,
        depth: 0,
        confidence: 0,
        communication: 0,
        understanding: 0,
        isUnknown: false,
        mentionedProjects: [],
        suggestedAction: "ASK_NEW_QUESTION",
        keyPointsCovered: [],
        keyPointsMissed: [],
        feedback: "Không thể đánh giá tự động. Sẽ được đánh giá trong báo cáo tổng hợp.",
      };
    }
  }
}

