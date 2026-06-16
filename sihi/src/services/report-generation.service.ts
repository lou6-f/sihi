import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";
import { buildEvaluatorPrompt } from "@/prompts/evaluator";
import { aggregateVocalMetrics, computeVocalMetrics } from "@/prompts/vocal-analyzer";
import type { ResourceRecommendationService } from "./resource-recommendation.service";
import type { AnalyticsEngineService } from "./analytics-engine.service";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface GenerateReportInput {
  interviewId: string;
}

export interface InterviewReportResult {
  reportId: string;
  overallScore: number;
  readinessLevel: string;
  criteriaScores: Record<string, { score: number; weight: number; comment: string }>;
  strengths: string[];
  weaknesses: string[];
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class ReportGenerationService {
  constructor(
    private ai: AIProvider,
    private prisma: PrismaClient,
    private resourceRecommendation?: ResourceRecommendationService,
    private analyticsEngine?: AnalyticsEngineService
  ) {}

  /**
   * Generate full post-interview report.
   * Orchestrates: vocal analysis → AI evaluation → score breakdown → skills → recommendations.
   */
  async generate(input: GenerateReportInput): Promise<InterviewReportResult> {
    // 1. Load interview data with all messages
    const interview = await this.prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        cv: true,
        template: {
          include: { rubric: { orderBy: { orderIndex: "asc" } } },
        },
      },
    });

    if (!interview) throw new Error("Phỏng vấn không tồn tại");

    // 2. Compute vocal analysis from saved vocalMetrics on USER messages
    const userMessages = interview.messages
      .filter(m => m.role === "USER")
      .map(m => ({
        text: m.content,
        metrics: m.vocalMetrics as unknown as ReturnType<typeof computeVocalMetrics> | undefined,
      }));

    const vocalAnalysis = aggregateVocalMetrics(userMessages);

    // 3. Build transcript for evaluator
    const transcript = interview.messages.map((m) => ({
      role: m.role as "AI" | "USER",
      content: m.content,
      questionNumber: m.questionNumber ?? undefined,
      category: m.category ?? undefined,
      difficulty: m.difficulty ?? undefined,
      vocalMetrics: m.vocalMetrics
        ? {
            wpm: (m.vocalMetrics as { wordsPerMinute?: number }).wordsPerMinute ?? 0,
            fillerCount: (m.vocalMetrics as { fillerCount?: number }).fillerCount ?? 0,
          }
        : undefined,
    }));

    const cvSummary = interview.cv?.analysis ? JSON.stringify(interview.cv.analysis) : undefined;

    // 5. Call AI for full evaluation
    const messages = buildEvaluatorPrompt({
      field: interview.field,
      level: interview.level,
      transcript,
      cvSummary,
      targetRole: interview.targetRole ?? undefined,
      jobDescription: interview.jobDescription ?? undefined,
      vocalSummary: {
        avgWpm: vocalAnalysis.avgWpm,
        totalFillers: vocalAnalysis.totalFillers,
        totalSpeakingMs: vocalAnalysis.totalSpeakingMs,
        wpmWarning: vocalAnalysis.wpmWarning,
        communicationPenalty: vocalAnalysis.communicationPenalty,
        confidencePenalty: vocalAnalysis.confidencePenalty,
      },
    });

    const response = await this.ai.chat(messages, { temperature: 0.2, responseFormat: "json" });

    let evaluation: Record<string, unknown>;
    try {
      evaluation = JSON.parse(response.content);
    } catch {
      throw new Error("AI trả về kết quả đánh giá không hợp lệ");
    }

    // 6. Adjust dimension scores for vocal penalties (max ±10 on communication)
    const dimensionScores = evaluation.dimensionScores as Record<string, { score: number; comment: string; reason: string }> | undefined;
    const hasVoiceData = vocalAnalysis.totalSpeakingMs > 0;
    if (dimensionScores && hasVoiceData) {
      dimensionScores.communication.score = Math.max(0, Math.min(100,
        dimensionScores.communication.score - Math.min(vocalAnalysis.communicationPenalty, 10)
      ));
    }

    const competencyProfile = evaluation.competencyProfile as Record<string, { score: number; comment: string }> | undefined;

    // Tính overallScore từ Group 1 theo trọng số
    const calcOverallScore = dimensionScores ? Math.round(
      (dimensionScores.technicalKnowledge?.score ?? 0) * 0.35 +
      (dimensionScores.problemSolving?.score ?? 0) * 0.30 +
      (dimensionScores.practicalExperience?.score ?? 0) * 0.20 +
      (dimensionScores.communication?.score ?? 0) * 0.15
    ) : (evaluation.overallScore as number ?? 0);

    // 7. Create/update report in DB with all advanced fields
    const reportData = {
      interviewId: input.interviewId,
      overallScore: calcOverallScore,
      criteriaScores: evaluation.criteriaScores as object || {},
      overallComment: evaluation.overallComment as string,
      strengths: evaluation.strengths as string[],
      weaknesses: evaluation.weaknesses as string[],
      goodAnswers: (evaluation.goodAnswers as object[]) || [],
      improvementAreas: (evaluation.improvementAreas as object[]) || [],
      suggestedAnswers: (evaluation.suggestedAnswers as object[]) || [],
      learningPath: (evaluation.learningPath as object[]) || [],
      recommendedResources: [] as object[],
      readinessLevel: (evaluation.readinessLevel as string || "NEEDS_PRACTICE") as "NOT_READY" | "NEEDS_PRACTICE" | "GOOD" | "READY",
      // v5.1 fields
      dimensionScores: dimensionScores ? JSON.parse(JSON.stringify(dimensionScores)) : null,
      competencyProfile: competencyProfile ? JSON.parse(JSON.stringify(competencyProfile)) : null,
      vocalAnalysis: hasVoiceData ? JSON.parse(JSON.stringify({
        avgWpm: vocalAnalysis.avgWpm,
        totalFillers: vocalAnalysis.totalFillers,
        fillerWords: vocalAnalysis.fillerWords,
        totalSpeakingMs: vocalAnalysis.totalSpeakingMs,
        wpmWarning: vocalAnalysis.wpmWarning,
      })) : null,
      softSkillsRadar: null,   // Deprecated - replaced by competencyProfile
      skillGaps: evaluation.skillGaps ? JSON.parse(JSON.stringify(evaluation.skillGaps)) : null,
      starEvaluations: evaluation.starEvaluations
        ? JSON.parse(JSON.stringify((evaluation.starEvaluations as unknown[]).filter(Boolean)))
        : null,
      learningRoadmap: evaluation.learningRoadmap ? JSON.parse(JSON.stringify(evaluation.learningRoadmap)) : null,
    };

    const report = await this.prisma.interviewReport.upsert({
      where: { interviewId: input.interviewId },
      update: reportData,
      create: reportData,
    });

    // 8. Create score breakdown entries (6 dimensions)
    if (evaluation.criteriaScores) {
      // Delete existing breakdowns first to avoid duplicates
      await this.prisma.interviewScoreBreakdown.deleteMany({
        where: { interviewId: input.interviewId },
      });

      const breakdownData = Object.entries(
        evaluation.criteriaScores as Record<string, { score: number; weight: number; comment?: string }>
      ).map(([criteriaName, data]) => ({
        interviewId: input.interviewId,
        criteriaName,
        score: data.score,
        weight: data.weight,
        comment: data.comment || null,
      }));

      await this.prisma.interviewScoreBreakdown.createMany({ data: breakdownData });
    }

    // 9. Update skills (analytics) — include all 6 dimensions
    if (this.analyticsEngine) {
      const skillScores: Record<string, number> = {};

      // Add criteria scores
      if (evaluation.criteriaScores) {
        Object.entries(evaluation.criteriaScores as Record<string, { score: number }>).forEach(
          ([k, v]) => { skillScores[k] = v.score; }
        );
      }

      // Add dimension scores  
      if (dimensionScores) {
        Object.entries(dimensionScores).forEach(([k, v]) => { skillScores[`dim_${k}`] = v; });
      }

      await this.analyticsEngine.updateSkills({
        userId: interview.userId,
        interviewId: input.interviewId,
        criteriaScores: skillScores,
      });

      await this.analyticsEngine.createProgressSnapshot({
        userId: interview.userId,
        interviewId: input.interviewId,
      });
    }

    // 10. Resource recommendations
    if (this.resourceRecommendation && (evaluation.weaknesses as string[])?.length > 0) {
      try {
        const suggestions = await this.resourceRecommendation.recommend({
          userId: interview.userId,
          interviewId: input.interviewId,
          weaknesses: evaluation.weaknesses as string[],
          field: interview.field,
        });

        if (suggestions.length > 0) {
          await this.prisma.interviewReport.update({
            where: { id: report.id },
            data: {
              recommendedResources: suggestions.map((s) => ({
                resourceId: s.resourceId,
                title: s.title,
                reason: s.reason,
                relevanceScore: s.relevanceScore,
              })),
            },
          });
        }
      } catch (err) {
        console.warn("Resource recommendation failed:", err);
      }
    }

    // 11. Update interview status
    await this.prisma.interview.update({
      where: { id: input.interviewId },
      data: { status: "COMPLETED", totalScore: calcOverallScore },
    });

    return {
      reportId: report.id,
      overallScore: calcOverallScore,
      readinessLevel: evaluation.readinessLevel as string,
      criteriaScores: {} as Record<string, { score: number; weight: number; comment: string }>,
      strengths: evaluation.strengths as string[],
      weaknesses: evaluation.weaknesses as string[],
    };
  }
}
