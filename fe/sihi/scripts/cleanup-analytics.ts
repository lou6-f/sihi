/**
 * Script dọn dẹp analytics data cũ:
 * 1. Xóa UserSkill với skillName không có prefix dim_ (snake_case cũ)
 * 2. Xóa UserProgressSnapshot (sẽ tự tạo lại sau phỏng vấn tiếp theo)
 * 3. Xóa SkillAssessment liên quan đến các skill đã xóa (cascade)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
  console.log("🧹 Bắt đầu dọn dẹp analytics data cũ...\n");

  // 1. Đếm trước
  const oldSkillCount = await prisma.userSkill.count({
    where: { skillName: { not: { startsWith: "dim_" } } },
  });
  const snapshotCount = await prisma.userProgressSnapshot.count();

  console.log(`📊 Tìm thấy:`);
  console.log(`   - ${oldSkillCount} UserSkill cũ (không có prefix dim_)`);
  console.log(`   - ${snapshotCount} UserProgressSnapshot`);

  if (oldSkillCount === 0 && snapshotCount === 0) {
    console.log("\n✅ DB đã sạch, không cần dọn dẹp.");
    return;
  }

  // 2. Xóa SkillAssessment liên quan đến snake_case skills (cascade thủ công)
  const oldSkills = await prisma.userSkill.findMany({
    where: { skillName: { not: { startsWith: "dim_" } } },
    select: { id: true, skillName: true, userId: true },
  });

  if (oldSkills.length > 0) {
    const oldIds = oldSkills.map((s) => s.id);

    const deletedAssessments = await prisma.skillAssessment.deleteMany({
      where: { skillId: { in: oldIds } },
    });
    console.log(`\n🗑️  Đã xóa ${deletedAssessments.count} SkillAssessment cũ`);

    const deletedSkills = await prisma.userSkill.deleteMany({
      where: { id: { in: oldIds } },
    });
    console.log(`🗑️  Đã xóa ${deletedSkills.count} UserSkill cũ (snake_case)`);

    // Liệt kê user bị ảnh hưởng
    const affectedUsers = [...new Set(oldSkills.map((s) => s.userId))];
    console.log(`   👤 Ảnh hưởng ${affectedUsers.length} user`);
  }

  // 3. Xóa toàn bộ snapshots (sẽ tự tạo lại sau buổi phỏng vấn tiếp theo)
  const deletedSnapshots = await prisma.userProgressSnapshot.deleteMany({});
  console.log(`🗑️  Đã xóa ${deletedSnapshots.count} UserProgressSnapshot`);

  console.log("\n✅ Dọn dẹp hoàn tất!");
  console.log("💡 Snapshots sẽ tự tạo lại sau khi user hoàn thành phỏng vấn tiếp theo.");
}

cleanup()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
