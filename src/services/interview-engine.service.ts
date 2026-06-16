import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";
import { buildInterviewerPrompt, type AdaptiveAction, type AdaptiveAIResponse, type QuestionPlan, type RichEvaluation } from "@/prompts/interviewer";
import { buildQuestionPlannerPrompt } from "@/prompts/question-planner";
import { computeVocalMetrics, type VocalMetrics } from "@/prompts/vocal-analyzer";
import type { InterviewEvaluationService } from "./interview-evaluation.service";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface StartInterviewInput {
  interviewId: string;
  userId: string;
  cvAnalysis?: Record<string, unknown>;
  templateId?: string;
}

export interface AIQuestion {
  question: string;
  category: string;
  difficulty: number;
  expectedKeyPoints: string[];
  action?: AdaptiveAction;
  skillTarget?: string;
  isFollowUp?: boolean;
}

export interface ProcessAnswerInput {
  interviewId: string;
  transcript: string;
  questionNumber: number;
  recordingDurationMs?: number;   // From frontend recorder
  startedAt?: string;
  endedAt?: string;
}

export interface ProcessAnswerResult {
  internalEval: RichEvaluation;
  nextQuestion: AIQuestion | null;
  isComplete: boolean;
  vocalWarning?: string;          // WPM warning message if applicable
  action: AdaptiveAction;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class InterviewEngineService {
  constructor(
    private ai: AIProvider,
    private evaluationService: InterviewEvaluationService,
    private prisma: PrismaClient
  ) {}

  /**
   * Start an interview session.
   * 1. Generate Interview Plan
   * 2. Return first question
   */
  async startInterview(
    input: StartInterviewInput
  ): Promise<{ firstQuestion: AIQuestion; interviewPlan: QuestionPlan[] }> {
    const interview = await this.prisma.interview.findFirst({
      where: { id: input.interviewId, userId: input.userId },
      include: {
        template: {
          include: { sections: { orderBy: { orderIndex: "asc" } } },
        },
      },
    });

    if (!interview) throw new Error("Phỏng vấn không tồn tại");

    // Update status
    await this.prisma.interview.update({
      where: { id: input.interviewId },
      data: { status: "AI_SPEAKING", startedAt: new Date() },
    });

    const cvSummary = input.cvAnalysis ? JSON.stringify(input.cvAnalysis) : undefined;

    // 1. Generate Interview Plan
    const interviewPlan = await this.generateInterviewPlan({
      field: interview.field,
      level: interview.level,
      maxQuestions: interview.maxQuestions,
      cvSummary,
      targetRole: interview.targetRole ?? undefined,
      jobDescription: interview.jobDescription ?? undefined,
      jdMode: interview.jdMode ?? undefined,
    });

    // Save plan to DB
    await this.prisma.interview.update({
      where: { id: input.interviewId },
      data: { interviewPlan: JSON.parse(JSON.stringify(interviewPlan)) },
    });

    // 2. Generate first question using adaptive prompt
    const firstSection = interview.template?.sections?.[0];
    const category = interviewPlan[0]?.category || firstSection?.category || "FOUNDATION";
    const difficulty = interviewPlan[0]?.difficulty || firstSection?.difficultyMin || 1;

    const firstAIResponse = await this.generateAdaptiveResponse({
      field: interview.field,
      level: interview.level,
      questionNumber: 1,
      totalQuestions: interview.maxQuestions,
      category,
      difficulty,
      cvSummary,
      targetRole: interview.targetRole ?? undefined,
      jobDescription: interview.jobDescription ?? undefined,
      jdMode: interview.jdMode ?? undefined,
      interviewPlan,
    });

    const firstQuestion: AIQuestion = {
      question: firstAIResponse.question,
      category: firstAIResponse.category,
      difficulty: firstAIResponse.difficulty,
      expectedKeyPoints: firstAIResponse.expectedKeyPoints,
      action: firstAIResponse.action,
      skillTarget: firstAIResponse.skillTarget,
    };

    // Save AI message
    await this.prisma.interviewMessage.create({
      data: {
        interviewId: input.interviewId,
        role: "AI",
        content: firstQuestion.question,
        questionNumber: 1,
        category: category as "FOUNDATION",
        difficulty,
        nextAction: firstAIResponse.action,
      },
    });

    await this.prisma.interview.update({
      where: { id: input.interviewId },
      data: { questionCount: 1 },
    });

    return { firstQuestion, interviewPlan };
  }

  /**
   * Process a user's answer with adaptive decision logic.
   * AI decides the next action based on evaluation, not just sequencing.
   */
  async processAnswer(input: ProcessAnswerInput): Promise<ProcessAnswerResult> {
    const interview = await this.prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        template: {
          include: { sections: { orderBy: { orderIndex: "asc" } } },
        },
      },
    });

    if (!interview) throw new Error("Phỏng vấn không tồn tại");

    // Get current question message
    const currentQuestion = interview.messages.find(
      (m) => m.role === "AI" && m.questionNumber === input.questionNumber
    );

    // Compute vocal metrics
    const vocalMetrics = computeVocalMetrics(
      input.transcript,
      input.recordingDurationMs,
      input.startedAt && input.endedAt
        ? new Date(input.endedAt).getTime() - new Date(input.startedAt).getTime()
        : undefined
    );

    // Build previous QA context
    const previousQA = interview.messages
      .filter((m) => m.role === "AI" && m.questionNumber)
      .map((q) => {
        const answer = interview.messages.find(
          (m) => m.role === "USER" && m.questionNumber === q.questionNumber
        );
        return { question: q.content, answer: answer?.content || "(không trả lời)" };
      });

    // Add current answer for context
    previousQA.push({
      question: currentQuestion?.content || "",
      answer: input.transcript,
    });

    // Get previously mentioned projects from all USER messages
    const allMentionedProjects = this.extractAllMentionedProjects(interview.messages
      .filter(m => m.role === "USER")
      .map(m => m.content));

    // Save user answer with vocal metrics
    await this.prisma.interviewMessage.create({
      data: {
        interviewId: input.interviewId,
        role: "USER",
        content: input.transcript,
        questionNumber: input.questionNumber,
        vocalMetrics: JSON.parse(JSON.stringify(vocalMetrics)),
      },
    });

    // Evaluate answer (rich evaluation)
    const internalEval = await this.evaluationService.evaluateAnswer({
      question: currentQuestion?.content || "",
      answer: input.transcript,
      category: currentQuestion?.category || "FOUNDATION",
      difficulty: currentQuestion?.difficulty || 3,
      field: interview.field,
      level: interview.level,
      previousAnswers: previousQA.slice(-3),
      mentionedProjects: allMentionedProjects,
    });

    // Accumulate mentioned projects from this answer
    const newProjects = [...new Set([...allMentionedProjects, ...internalEval.mentionedProjects])];

    // Determine unknownAttempts for this question topic
    // Count how many consecutive USER messages were "unknown" for current question
    const unknownAttempts = internalEval.isUnknown
      ? this.getUnknownAttempts(interview.messages, input.questionNumber) + 1
      : 0;

    // Update AI question message with evaluation and action
    if (currentQuestion) {
      await this.prisma.interviewMessage.update({
        where: { id: currentQuestion.id },
        data: {
          aiEvaluation: JSON.parse(JSON.stringify(internalEval)),
          nextAction: internalEval.suggestedAction,
          unknownAttempts,
        },
      });
    }

    // Determine if we should actually complete
    // Complete only when: question count reached AND action is ASK_NEW_QUESTION
    const questionReached = input.questionNumber >= interview.maxQuestions;
    const shouldComplete = questionReached && internalEval.suggestedAction === "ASK_NEW_QUESTION";

    if (shouldComplete) {
      return { internalEval, nextQuestion: null, isComplete: true, action: "ASK_NEW_QUESTION" };
    }

    // Determine next question parameters
    const interviewPlan = interview.interviewPlan as QuestionPlan[] | null;
    const nextQuestionNumber = internalEval.suggestedAction === "ASK_NEW_QUESTION"
      ? input.questionNumber + 1
      : input.questionNumber; // Stay on same question number for follow-ups

    const sections = interview.template?.sections || [];
    const nextSection = this.getSectionForQuestion(sections, nextQuestionNumber);

    // For adaptive actions, adjust difficulty
    const baseDifficulty = nextSection?.difficultyMin || currentQuestion?.difficulty || 3;
    const nextDifficulty = this.calculateAdaptiveDifficulty(
      internalEval,
      unknownAttempts,
      baseDifficulty,
      nextSection?.difficultyMin ?? 1,
      nextSection?.difficultyMax ?? 5
    );

    // Get next planned question category
    const nextPlan = interviewPlan?.[nextQuestionNumber - 1];
    const nextCategory = internalEval.suggestedAction === "ASK_NEW_QUESTION"
      ? (nextPlan?.category || nextSection?.category || "TECHNICAL")
      : (currentQuestion?.category || "TECHNICAL");

    // Generate adaptive AI response
    const nextAIResponse = await this.generateAdaptiveResponse({
      field: interview.field,
      level: interview.level,
      questionNumber: nextQuestionNumber,
      totalQuestions: interview.maxQuestions,
      category: nextCategory,
      difficulty: nextDifficulty,
      cvSummary: undefined,
      previousQA,
      lastEvaluation: internalEval,
      unknownAttempts,
      mentionedProjects: newProjects,
      targetRole: interview.targetRole ?? undefined,
      jobDescription: interview.jobDescription ?? undefined,
      jdMode: interview.jdMode ?? undefined,
      interviewPlan: interviewPlan ?? undefined,
    });

    const nextQuestion: AIQuestion = {
      question: nextAIResponse.question,
      category: nextAIResponse.category,
      difficulty: nextAIResponse.difficulty,
      expectedKeyPoints: nextAIResponse.expectedKeyPoints,
      action: nextAIResponse.action,
      skillTarget: nextAIResponse.skillTarget,
      isFollowUp: nextAIResponse.isFollowUp,
    };

    // Save AI response — only increment questionNumber for new questions
    const savedQuestionNumber = internalEval.suggestedAction === "ASK_NEW_QUESTION"
      ? nextQuestionNumber
      : input.questionNumber;

    await this.prisma.interviewMessage.create({
      data: {
        interviewId: input.interviewId,
        role: "AI",
        content: nextQuestion.question,
        questionNumber: savedQuestionNumber,
        category: nextQuestion.category as "FOUNDATION",
        difficulty: nextQuestion.difficulty,
        nextAction: nextAIResponse.action,
        unknownAttempts: internalEval.suggestedAction === "ASK_NEW_QUESTION" ? 0 : unknownAttempts,
      },
    });

    if (internalEval.suggestedAction === "ASK_NEW_QUESTION") {
      await this.prisma.interview.update({
        where: { id: input.interviewId },
        data: { questionCount: nextQuestionNumber },
      });
    }

    // Build vocal warning message if needed
    const vocalWarning = vocalMetrics.wpmWarning
      ? `Bạn đang nói hơi nhanh (${vocalMetrics.wordsPerMinute} từ/phút). Hãy thử nói chậm lại để rõ ràng hơn.`
      : undefined;

    return {
      internalEval,
      nextQuestion,
      isComplete: false,
      vocalWarning,
      action: nextAIResponse.action,
    };
  }

  /**
   * End the interview.
   */
  async endInterview(input: { interviewId: string }): Promise<{ interviewId: string }> {
    await this.prisma.interview.update({
      where: { id: input.interviewId },
      data: { status: "COMPLETED", endedAt: new Date() },
    });
    return { interviewId: input.interviewId };
  }

  // ═══════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════

  private async generateInterviewPlan(params: {
    field: string;
    level: string;
    maxQuestions: number;
    cvSummary?: string;
    targetRole?: string;
    jobDescription?: string;
    jdMode?: string;
  }): Promise<QuestionPlan[]> {
    const messages = buildQuestionPlannerPrompt(params);
    const response = await this.ai.chat(messages, { temperature: 0.5, responseFormat: "json" });

    try {
      const plan = JSON.parse(response.content);
      return Array.isArray(plan) ? plan : [];
    } catch {
      // Fallback: empty plan, AI will improvise
      return [];
    }
  }

  private async generateAdaptiveResponse(params: {
    field: string;
    level: string;
    questionNumber: number;
    totalQuestions: number;
    category: string;
    difficulty: number;
    cvSummary?: string;
    previousQA?: Array<{ question: string; answer: string }>;
    lastEvaluation?: RichEvaluation;
    unknownAttempts?: number;
    mentionedProjects?: string[];
    targetRole?: string;
    jobDescription?: string;
    jdMode?: string;
    interviewPlan?: QuestionPlan[];
  }): Promise<AdaptiveAIResponse> {
    const messages = buildInterviewerPrompt(params);
    const response = await this.ai.chat(messages, { temperature: 0.7, responseFormat: "json" });

    try {
      const parsed = JSON.parse(response.content);
      return {
        action: parsed.action || "ASK_NEW_QUESTION",
        question: parsed.question || response.content,
        category: parsed.category || params.category,
        difficulty: parsed.difficulty || params.difficulty,
        expectedKeyPoints: Array.isArray(parsed.expectedKeyPoints) ? parsed.expectedKeyPoints : [],
        skillTarget: parsed.skillTarget,
        reasonForAction: parsed.reasonForAction,
        isFollowUp: Boolean(parsed.isFollowUp),
      };
    } catch {
      return {
        action: "ASK_NEW_QUESTION",
        question: response.content,
        category: params.category,
        difficulty: params.difficulty,
        expectedKeyPoints: [],
      };
    }
  }

  private getUnknownAttempts(
    messages: Array<{ role: string; questionNumber: number | null; aiEvaluation: unknown }>,
    questionNumber: number
  ): number {
    // Count how many times user already answered "unknown" for this question
    const questionMessages = messages.filter(
      m => m.role === "AI" && m.questionNumber === questionNumber && m.aiEvaluation
    );
    if (questionMessages.length === 0) return 0;
    const lastAI = questionMessages[questionMessages.length - 1];
    const eval_ = lastAI.aiEvaluation as { isUnknown?: boolean } | null;
    return (lastAI as { unknownAttempts?: number }).unknownAttempts ?? 0;
  }

  private extractAllMentionedProjects(answerTexts: string[]): string[] {
    const projects = new Set<string>();
    // Simple heuristic: detect patterns like "website X", "app Y", "project Z", "hệ thống X"
    const patterns = [
      /(?:website|web|app|ứng dụng|hệ thống|dự án|project)\s+([A-Za-zÀ-ỹ0-9\s]{2,30}?)(?:\s|$|,|\.)/gi,
      /(?:làm|xây dựng|phát triển)\s+(?:một\s+)?([A-Za-zÀ-ỹ0-9\s]{3,40}?)(?:\s|$|,|\.)/gi,
    ];
    for (const text of answerTexts) {
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(m => {
          const name = m[1]?.trim();
          if (name && name.length > 2 && name.length < 40) {
            projects.add(name);
          }
        });
      }
    }
    return Array.from(projects).slice(0, 5); // Max 5 projects
  }

  private getSectionForQuestion(
    sections: Array<{ category: string; questionCount: number; difficultyMin?: number; difficultyMax?: number }>,
    questionNumber: number
  ): { category: string; difficultyMin?: number; difficultyMax?: number } | null {
    let cumulative = 0;
    for (const section of sections) {
      cumulative += section.questionCount;
      if (questionNumber <= cumulative) return section;
    }
    return sections[sections.length - 1] ?? null;
  }

  private calculateAdaptiveDifficulty(
    eval_: RichEvaluation,
    unknownAttempts: number,
    baseDifficulty: number,
    minDiff: number,
    maxDiff: number
  ): number {
    // If unknown, reduce difficulty
    if (eval_.isUnknown || unknownAttempts > 0) {
      return Math.max(minDiff, baseDifficulty - 1);
    }
    // Adaptive difficulty based on score
    if (eval_.score >= 8) return Math.min(maxDiff, baseDifficulty + 2);
    if (eval_.score >= 6) return Math.min(maxDiff, baseDifficulty + 1);
    if (eval_.score < 4) return Math.max(minDiff, baseDifficulty - 1);
    return baseDifficulty;
  }
}

// Re-export types
export type { AdaptiveAIResponse };
