import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";
import { buildEvaluatorPrompt } from "@/prompts/evaluator";
import { aggregateVocalMetrics, computeVocalMetrics } from "@/prompts/vocal-analyzer";
import type { ResourceRecommendationService } from "./resource-recommendation.service";
import type { AnalyticsEngineService } from "./analytics-engine.service";
import { getCVModuleClient, type CVModuleEvalResult } from "./cv-module-client";

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

    // 4. Build Gemini prompt (always needed — provides detail even in Hybrid mode)
    const geminiMessages = buildEvaluatorPrompt({
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

    // 5. HYBRID: call cv-module + Gemini in PARALLEL
    const cvSessionId = (interview.cv as unknown as { cvModuleSessionId?: string } | null)?.cvModuleSessionId;

    const cvModuleTranscript = interview.messages.map((m) => ({
      role: m.role === "USER" ? "user" : "model" as "user" | "model",
      text: m.content,
    }));

    const [cvModuleSettled, geminiSettled] = await Promise.allSettled([
      // cv-module: chỉ chạy nếu có CV session
      cvSessionId
        ? getCVModuleClient().isAvailable().then((ok) => {
            if (!ok) throw new Error("cv-module not available");
            console.log(`[Report] cv-module starting (KG session: ${cvSessionId})`);
            return getCVModuleClient().evaluateAndWait({
              transcript: cvModuleTranscript,
              cvSessionId,
              userId: interview.userId,
              interviewSessionId: interview.id,
            });
          })
        : Promise.reject(new Error("no CV session")),
      // Gemini: luôn chạy
      this.ai.chat(geminiMessages, { temperature: 0.2, responseFormat: "json" }),
    ]);

    // 6. Parse Gemini result (required)
    let evaluation: Record<string, unknown>;
    if (geminiSettled.status === "fulfilled") {
      try {
        evaluation = JSON.parse(geminiSettled.value.content);
      } catch {
        throw new Error("AI trả về kết quả đánh giá không hợp lệ");
      }
    } else {
      throw new Error("Gemini evaluation failed: " + geminiSettled.reason);
    }

    // 7. Apply vocal penalty to Gemini communication score
    const dimensionScores = evaluation.dimensionScores as Record<string, { score: number; comment: string; reason: string }> | undefined;
    const hasVoiceData = vocalAnalysis.totalSpeakingMs > 0;
    if (dimensionScores && hasVoiceData) {
      dimensionScores.communication.score = Math.max(0, Math.min(100,
        dimensionScores.communication.score - Math.min(vocalAnalysis.communicationPenalty, 10)
      ));
    }

    // 8. HYBRID MERGE: override overallScore với cv-module nếu thành công
    let calcOverallScore: number;
    if (cvModuleSettled.status === "fulfilled") {
      const cvResult = cvModuleSettled.value;
      const cvScore100 = Math.round(cvResult.overall.overall_score * 10); // 0-10 → 0-100
      console.log(`[Report] Hybrid: cv-module score=${cvScore100}, Gemini detail used`);

      // overallScore = cv-module (KG-enriched, sát CV thực tế hơn)
      calcOverallScore = cvScore100;

      // Merge strengths/weaknesses từ cả 2 nguồn
      const geminiStrengths = (evaluation.strengths as string[]) ?? [];
      const geminiWeaknesses = (evaluation.weaknesses as string[]) ?? [];
      const cvStrengths = cvResult.overall.strengths ?? [];
      const cvWeaknesses = cvResult.overall.key_improvements ?? [];

      evaluation.strengths = [...new Set([...cvStrengths, ...geminiStrengths])].slice(0, 6);
      evaluation.weaknesses = [...new Set([...cvWeaknesses, ...geminiWeaknesses])].slice(0, 6);
      evaluation.overallComment = `[KG] ${cvResult.overall.overall_comment}\n\n${evaluation.overallComment ?? ""}`.trim();
    } else {
      // cv-module không có / thất bại → dùng Gemini score
      console.warn("[Report] cv-module unavailable, using Gemini score:", cvModuleSettled.reason);
      calcOverallScore = dimensionScores ? Math.round(
        (dimensionScores.technicalKnowledge?.score ?? 0) * 0.35 +
        (dimensionScores.problemSolving?.score ?? 0) * 0.30 +
        (dimensionScores.practicalExperience?.score ?? 0) * 0.20 +
        (dimensionScores.communication?.score ?? 0) * 0.15
      ) : (evaluation.overallScore as number ?? 0);
    }

    const competencyProfile = evaluation.competencyProfile as Record<string, { score: number; comment: string }> | undefined;

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

    // 9. Update skills (analytics) — chỉ dùng dim_ keys (8 chiều chuẩn)
    if (this.analyticsEngine) {
      const skillScores: Record<string, number> = {};

      // 4 chiều phỏng vấn cốt lõi (dimensionScores)
      // v là { score, comment, reason } → phải lấy v.score, KHÔNG gán cả object
      if (dimensionScores) {
        Object.entries(dimensionScores).forEach(([k, v]) => {
          const score = typeof v === "object" && v !== null && "score" in v
            ? (v as { score: number }).score
            : Number(v);
          if (!isNaN(score)) skillScores[`dim_${k}`] = score;
        });
      }

      // 4 chiều năng lực (competencyProfile)
      if (competencyProfile) {
        Object.entries(competencyProfile).forEach(([k, v]) => {
          const score = typeof v === "object" && v !== null && "score" in v
            ? (v as { score: number }).score
            : Number(v);
          if (!isNaN(score)) skillScores[`dim_${k}`] = score;
        });
      }

      // Chỉ update nếu có ít nhất 1 chiều hợp lệ
      if (Object.keys(skillScores).length > 0) {
        await this.analyticsEngine.updateSkills({
          userId: interview.userId,
          interviewId: input.interviewId,
          criteriaScores: skillScores,
        });

        await this.analyticsEngine.createProgressSnapshot({
          userId: interview.userId,
          interviewId: input.interviewId,
        });
      } else {
        console.warn("[Report] Không có dim_ scores hợp lệ — bỏ qua analytics update");
      }
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
