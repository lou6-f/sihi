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
      const raw = JSON.parse(response.content);

      // Clamp all scores 0-10
      const clamp = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 0));
      const clamp100 = (v: unknown) => Math.min(100, Math.max(0, Number(v) || 0));

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
        starEval: raw.starEval ?? undefined,
      };

      return evaluation;
    } catch {
      // Fallback if AI response is malformed
      return {
        score: 5,
        accuracy: 5,
        depth: 5,
        confidence: 5,
        communication: 5,
        understanding: 5,
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
