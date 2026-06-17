/**
 * Script khôi phục UserProgressSnapshot cho user đã có UserSkill
 * nhưng mất snapshot do SQL cleanup.
 * 
 * Tính toán overallScore từ dim_ skills hiện có → tạo snapshot mới.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Trọng số theo chiều (giống AnalyticsEngineService)
const DIMENSION_WEIGHTS: Record<string, number> = {
  dim_technicalKnowledge:  0.35,
  dim_problemSolving:      0.30,
  dim_practicalExperience: 0.20,
  dim_communication:       0.15,
  // Alias cũ → cùng trọng số
  dim_reasoningAbility:    0.30,
  dim_projectExperience:   0.20,
};

function calcOverallScore(skills: { skillName: string; currentScore: number }[]): number {
  let weighted = 0, totalWeight = 0;
  for (const s of skills) {
    const w = DIMENSION_WEIGHTS[s.skillName];
    if (w) { weighted += s.currentScore * w; totalWeight += w; }
  }
  if (totalWeight === 0) return 0;
  return Math.round(weighted / totalWeight);
}

function readinessLevel(score: number): string {
  if (score >= 80) return "READY";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "NEEDS_PRACTICE";
  return "NOT_READY";
}

async function restore() {
  console.log("🔄 Khôi phục UserProgressSnapshot...\n");

  // Lấy tất cả user có skills nhưng chưa có snapshot
  const usersWithSkills = await prisma.user.findMany({
    where: { skills: { some: {} } },
    include: {
      skills: true,
      progressSnapshots: { orderBy: { snapshotAt: "desc" }, take: 1 },
      interviews: { where: { status: "COMPLETED" } },
    },
  });

  let created = 0;
  for (const user of usersWithSkills) {
    if (user.progressSnapshots.length > 0) {
      console.log(`⏭️  ${user.email}: đã có snapshot, bỏ qua`);
      continue;
    }

    const dimSkills = user.skills.filter(s => s.skillName.startsWith("dim_"));
    if (dimSkills.length === 0) {
      console.log(`⏭️  ${user.email}: không có dim_ skill, bỏ qua`);
      continue;
    }

    const overallScore = calcOverallScore(dimSkills);
    const completedCount = user.interviews.length;

    const sorted = [...dimSkills].sort((a, b) => b.currentScore - a.currentScore);
    const topSkillsList = sorted.slice(0, 3).map(s => ({ name: s.skillName, score: s.currentScore }));
    const weakSkillsList = [...sorted].reverse().slice(0, 3).map(s => ({ name: s.skillName, score: s.currentScore }));
    const fieldScores: Record<string, number> = {};

    // Lấy interviewId mới nhất của user (nếu có)
    const lastInterview = await prisma.interview.findFirst({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });

    await prisma.userProgressSnapshot.create({
      data: {
        userId: user.id,
        interviewId: lastInterview?.id,
        overallScore,
        readinessLevel: readinessLevel(overallScore),
        totalInterviews: completedCount,
        topSkills: topSkillsList,
        weakSkills: weakSkillsList,
        fieldScores,
        suggestion: completedCount < 3
          ? "Hoàn thành thêm phỏng vấn để AI phân tích chi tiết hơn."
          : null,
      },
    });

    console.log(`✅ ${user.email}: tạo snapshot (score=${overallScore}, ${completedCount} phỏng vấn, ${dimSkills.length} skills)`);
    created++;
  }

  console.log(`\n✨ Đã tạo ${created} snapshot mới.`);
}

restore()
  .catch(e => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
