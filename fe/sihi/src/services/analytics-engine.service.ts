import type { PrismaClient, ReadinessLevel } from "@prisma/client";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface UpdateSkillsInput {
  userId: string;
  interviewId: string;
  criteriaScores: Record<string, number>;
}

export interface CreateSnapshotInput {
  userId: string;
  interviewId?: string;
}

export interface ProgressSnapshotResult {
  snapshotId: string;
  overallScore: number;
  readinessLevel: string;
  topSkills: Array<{ name: string; score: number }>;
  weakSkills: Array<{ name: string; score: number }>;
  totalInterviews: number;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class AnalyticsEngineService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Update user skills based on interview criteria scores.
   * Uses exponential moving average for score smoothing.
   */
  async updateSkills(input: UpdateSkillsInput): Promise<void> {
    const { userId, interviewId, criteriaScores } = input;
    const SMOOTHING_FACTOR = 0.3; // New score weight

    for (const [skillName, newScore] of Object.entries(criteriaScores)) {
      // Find or create skill
      let skill = await this.prisma.userSkill.findUnique({
        where: { userId_skillName: { userId, skillName } },
      });

      if (skill) {
        // Exponential moving average
        const smoothedScore =
          skill.currentScore * (1 - SMOOTHING_FACTOR) +
          newScore * SMOOTHING_FACTOR;

        await this.prisma.userSkill.update({
          where: { id: skill.id },
          data: {
            currentScore: Math.round(smoothedScore * 100) / 100,
            totalAssessments: { increment: 1 },
            lastAssessedAt: new Date(),
          },
        });
      } else {
        skill = await this.prisma.userSkill.create({
          data: {
            userId,
            skillName,
            currentScore: newScore,
            totalAssessments: 1,
            lastAssessedAt: new Date(),
          },
        });
      }

      // Record individual assessment
      await this.prisma.skillAssessment.create({
        data: {
          skillId: skill.id,
          interviewId,
          score: newScore,
          evidence: `Từ phỏng vấn ${interviewId}`,
        },
      });
    }
  }

  /**
   * Create a progress snapshot for the user.
   * Captures current state of all skills and overall metrics.
   */
  async createProgressSnapshot(
    input: CreateSnapshotInput
  ): Promise<ProgressSnapshotResult> {
    const { userId, interviewId } = input;

    // Get all user skills
    const skills = await this.prisma.userSkill.findMany({
      where: { userId },
      orderBy: { currentScore: "desc" },
    });

    // Tính điểm tổng — chỉ dùng dim_ skills, trọng số cho 4 chiều cốt lõi
    const WEIGHTS: Record<string, number> = {
      dim_technicalKnowledge:  0.35,
      dim_problemSolving:      0.30,
      dim_practicalExperience: 0.20,
      dim_communication:       0.15,
    };

    const dimSkills = skills.filter(s => s.skillName.startsWith("dim_"));

    let overallScore: number;
    if (dimSkills.length === 0) {
      overallScore = 0;
    } else {
      // Có đủ 4 chiều cốt lõi → dùng trọng số
      const coreSkills = dimSkills.filter(s => s.skillName in WEIGHTS);
      if (coreSkills.length === 4) {
        overallScore = Math.round(
          coreSkills.reduce((sum, s) => sum + s.currentScore * (WEIGHTS[s.skillName] ?? 0), 0)
        );
      } else {
        // Chưa đủ 4 chiều (mới có 1-2 buổi) → trung bình giản
        overallScore = Math.round(
          dimSkills.reduce((sum, s) => sum + s.currentScore, 0) / dimSkills.length
        );
      }
    }

    // Determine readiness level
    const readinessLevel = this.calculateReadiness(overallScore);

    // Count total interviews
    const totalInterviews = await this.prisma.interview.count({
      where: { userId, status: "COMPLETED" },
    });

    // Top and weak skills
    const topSkills = skills.slice(0, 3).map((s) => ({
      name: s.skillName,
      score: s.currentScore,
    }));

    const weakSkills = skills
      .slice(-3)
      .reverse()
      .map((s) => ({
        name: s.skillName,
        score: s.currentScore,
      }));

    // Get field scores
    const fieldScores: Record<string, number> = {};
    for (const skill of skills) {
      if (skill.field) {
        if (!fieldScores[skill.field]) fieldScores[skill.field] = 0;
        fieldScores[skill.field] += skill.currentScore;
      }
    }

    // Create snapshot
    const snapshot = await this.prisma.userProgressSnapshot.create({
      data: {
        userId,
        interviewId,
        overallScore,
        readinessLevel: readinessLevel as ReadinessLevel,
        topSkills: JSON.parse(JSON.stringify(topSkills)),
        weakSkills: JSON.parse(JSON.stringify(weakSkills)),
        fieldScores: JSON.parse(JSON.stringify(fieldScores)),
        totalInterviews,
        suggestion: this.generateSuggestion(
          overallScore,
          weakSkills,
          totalInterviews
        ),
      },
    });

    return {
      snapshotId: snapshot.id,
      overallScore,
      readinessLevel,
      topSkills,
      weakSkills,
      totalInterviews,
    };
  }

  // ═══════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════

  private calculateReadiness(score: number): string {
    if (score >= 80) return "READY";
    if (score >= 65) return "GOOD";
    if (score >= 45) return "NEEDS_PRACTICE";
    return "NOT_READY";
  }

  private generateSuggestion(
    score: number,
    weakSkills: Array<{ name: string; score: number }>,
    totalInterviews: number
  ): string {
    if (totalInterviews < 3) {
      return "Hãy thực hiện thêm ít nhất 3 buổi phỏng vấn để có đánh giá chính xác hơn.";
    }

    if (score >= 80) {
      return "Bạn đã sẵn sàng cho phỏng vấn thực tế! Tiếp tục duy trì và cải thiện các kỹ năng hiện có.";
    }

    if (weakSkills.length > 0) {
      const weakNames = weakSkills
        .map((s) => s.name)
        .join(", ");
      return `Tập trung cải thiện: ${weakNames}. Hãy ôn luyện thêm và thử lại.`;
    }

    return "Tiếp tục luyện phỏng vấn để nâng cao điểm số tổng thể.";
  }
}
