import { PrismaClient, Role, InterviewField, InterviewLevel, QuestionCategory, ResourceLevel, ResourceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ═══════════════════════════════════════
  // 1. Admin User
  // ═══════════════════════════════════════
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sihi.vn" },
    update: {},
    create: {
      email: "admin@sihi.vn",
      name: "SiHi Admin",
      password: adminPassword,
      role: Role.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ═══════════════════════════════════════
  // 2. Test User
  // ═══════════════════════════════════════
  const userPassword = await bcrypt.hash("User@123", 12);
  const user = await prisma.user.upsert({
    where: { email: "user@sihi.vn" },
    update: {},
    create: {
      email: "user@sihi.vn",
      name: "Nguyễn Văn Test",
      password: userPassword,
      role: Role.USER,
      emailVerified: true,
      isActive: true,
      school: "Đại học Bách khoa TP.HCM",
      major: "Khoa học Máy tính",
      yearOfStudy: 4,
      itField: "BACKEND",
    },
  });
  console.log(`✅ User: ${user.email}`);

  // ═══════════════════════════════════════
  // 3. Interview Templates
  // ═══════════════════════════════════════
  const templates = [
    {
      name: "Frontend Intern",
      field: InterviewField.FRONTEND,
      level: InterviewLevel.INTERN,
      questionCount: 8,
      durationMinutes: 15,
      description: "Phỏng vấn thực tập Frontend cơ bản",
    },
    {
      name: "Frontend Fresher",
      field: InterviewField.FRONTEND,
      level: InterviewLevel.FRESHER,
      questionCount: 10,
      durationMinutes: 20,
      description: "Phỏng vấn Fresher Frontend",
    },
    {
      name: "Frontend Junior",
      field: InterviewField.FRONTEND,
      level: InterviewLevel.JUNIOR,
      questionCount: 12,
      durationMinutes: 25,
      description: "Phỏng vấn Junior Frontend",
    },
    {
      name: "Backend Intern",
      field: InterviewField.BACKEND,
      level: InterviewLevel.INTERN,
      questionCount: 8,
      durationMinutes: 15,
      description: "Phỏng vấn thực tập Backend cơ bản",
    },
    {
      name: "Backend Fresher",
      field: InterviewField.BACKEND,
      level: InterviewLevel.FRESHER,
      questionCount: 10,
      durationMinutes: 20,
      description: "Phỏng vấn Fresher Backend",
    },
    {
      name: "Backend Junior",
      field: InterviewField.BACKEND,
      level: InterviewLevel.JUNIOR,
      questionCount: 12,
      durationMinutes: 25,
      description: "Phỏng vấn Junior Backend",
    },
    {
      name: "Data Intern",
      field: InterviewField.DATA,
      level: InterviewLevel.INTERN,
      questionCount: 8,
      durationMinutes: 15,
      description: "Phỏng vấn thực tập Data cơ bản",
    },
    {
      name: "Data Fresher",
      field: InterviewField.DATA,
      level: InterviewLevel.FRESHER,
      questionCount: 10,
      durationMinutes: 20,
      description: "Phỏng vấn Fresher Data",
    },
    {
      name: "Data Junior",
      field: InterviewField.DATA,
      level: InterviewLevel.JUNIOR,
      questionCount: 12,
      durationMinutes: 25,
      description: "Phỏng vấn Junior Data",
    },
    {
      name: "Fullstack Intern",
      field: InterviewField.FULLSTACK,
      level: InterviewLevel.INTERN,
      questionCount: 10,
      durationMinutes: 20,
      description: "Phỏng vấn thực tập Fullstack",
    },
    {
      name: "Fullstack Fresher",
      field: InterviewField.FULLSTACK,
      level: InterviewLevel.FRESHER,
      questionCount: 10,
      durationMinutes: 25,
      description: "Phỏng vấn Fresher Fullstack",
    },
    {
      name: "Fullstack Junior",
      field: InterviewField.FULLSTACK,
      level: InterviewLevel.JUNIOR,
      questionCount: 12,
      durationMinutes: 30,
      description: "Phỏng vấn Junior Fullstack",
    },
  ];

  // ═══════════════════════════════════════
  // Sections map: key = `${field}_${level}`
  // Tổng questionCount phải khớp với template.questionCount
  // ═══════════════════════════════════════
  type SectionDef = {
    category: QuestionCategory;
    questionCount: number;
    difficultyMin: number;
    difficultyMax: number;
    weight: number;
    description: string;
  };

  const SECTIONS_MAP: Record<string, SectionDef[]> = {
    // ── FRONTEND ───────────────────────────────────────────────────────────
    // Total: 8
    FRONTEND_INTERN: [
      { category: QuestionCategory.FOUNDATION, questionCount: 3, difficultyMin: 1, difficultyMax: 2, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 3, difficultyMin: 2, difficultyMax: 3, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.BEHAVIORAL, questionCount: 2, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
    // Total: 10
    FRONTEND_FRESHER: [
      { category: QuestionCategory.FOUNDATION, questionCount: 2, difficultyMin: 1, difficultyMax: 2, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 4, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.PROJECT,    questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Kinh nghiệm dự án" },
      { category: QuestionCategory.BEHAVIORAL, questionCount: 2, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
    // Total: 12
    FRONTEND_JUNIOR: [
      { category: QuestionCategory.TECHNICAL,   questionCount: 5, difficultyMin: 3, difficultyMax: 4, weight: 2.0, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.PROJECT,     questionCount: 3, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kinh nghiệm dự án" },
      { category: QuestionCategory.SITUATIONAL, questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Tình huống thực tế" },
      { category: QuestionCategory.BEHAVIORAL,  questionCount: 1, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
      { category: QuestionCategory.ALGORITHM,   questionCount: 1, difficultyMin: 3, difficultyMax: 4, weight: 1.5, description: "Tư duy thuật toán" },
    ],

    // ── BACKEND ────────────────────────────────────────────────────────────
    // Total: 8
    BACKEND_INTERN: [
      { category: QuestionCategory.FOUNDATION, questionCount: 3, difficultyMin: 1, difficultyMax: 2, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 3, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.BEHAVIORAL, questionCount: 2, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
    // Total: 10
    BACKEND_FRESHER: [
      { category: QuestionCategory.FOUNDATION, questionCount: 2, difficultyMin: 1, difficultyMax: 3, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 4, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.ALGORITHM,  questionCount: 2, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Tư duy thuật toán" },
      { category: QuestionCategory.PROJECT,    questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Kinh nghiệm dự án" },
    ],
    // Total: 12
    BACKEND_JUNIOR: [
      { category: QuestionCategory.TECHNICAL,   questionCount: 4, difficultyMin: 3, difficultyMax: 5, weight: 2.0, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.ALGORITHM,   questionCount: 3, difficultyMin: 3, difficultyMax: 5, weight: 2.0, description: "Tư duy thuật toán" },
      { category: QuestionCategory.PROJECT,     questionCount: 3, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kinh nghiệm dự án" },
      { category: QuestionCategory.SITUATIONAL, questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Tình huống thực tế" },
    ],

    // ── DATA ───────────────────────────────────────────────────────────────
    // Total: 8
    DATA_INTERN: [
      { category: QuestionCategory.FOUNDATION, questionCount: 4, difficultyMin: 1, difficultyMax: 2, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 3, difficultyMin: 2, difficultyMax: 3, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.BEHAVIORAL, questionCount: 1, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
    // Total: 10
    DATA_FRESHER: [
      { category: QuestionCategory.FOUNDATION, questionCount: 3, difficultyMin: 1, difficultyMax: 3, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 3, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.ALGORITHM,  questionCount: 2, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Tư duy thuật toán" },
      { category: QuestionCategory.PROJECT,    questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Kinh nghiệm dự án" },
    ],
    // Total: 12
    DATA_JUNIOR: [
      { category: QuestionCategory.ALGORITHM,   questionCount: 4, difficultyMin: 3, difficultyMax: 5, weight: 2.0, description: "Tư duy thuật toán" },
      { category: QuestionCategory.TECHNICAL,   questionCount: 3, difficultyMin: 3, difficultyMax: 5, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.FOUNDATION,  questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.PROJECT,     questionCount: 2, difficultyMin: 2, difficultyMax: 4, weight: 1.0, description: "Kinh nghiệm dự án" },
      { category: QuestionCategory.SITUATIONAL, questionCount: 1, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Tình huống thực tế" },
    ],

    // ── FULLSTACK ──────────────────────────────────────────────────────────
    // Total: 10
    FULLSTACK_INTERN: [
      { category: QuestionCategory.FOUNDATION, questionCount: 3, difficultyMin: 1, difficultyMax: 2, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 4, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.BEHAVIORAL, questionCount: 3, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
    // Total: 10
    FULLSTACK_FRESHER: [
      { category: QuestionCategory.FOUNDATION, questionCount: 2, difficultyMin: 1, difficultyMax: 3, weight: 1.0, description: "Kiến thức nền tảng" },
      { category: QuestionCategory.TECHNICAL,  questionCount: 4, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.PROJECT,    questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Kinh nghiệm dự án" },
      { category: QuestionCategory.BEHAVIORAL, questionCount: 2, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
    // Total: 12
    FULLSTACK_JUNIOR: [
      { category: QuestionCategory.TECHNICAL,   questionCount: 4, difficultyMin: 3, difficultyMax: 5, weight: 2.0, description: "Kiến thức kỹ thuật chuyên sâu" },
      { category: QuestionCategory.PROJECT,     questionCount: 3, difficultyMin: 2, difficultyMax: 4, weight: 1.5, description: "Kinh nghiệm dự án" },
      { category: QuestionCategory.ALGORITHM,   questionCount: 2, difficultyMin: 3, difficultyMax: 5, weight: 1.5, description: "Tư duy thuật toán" },
      { category: QuestionCategory.SITUATIONAL, questionCount: 2, difficultyMin: 2, difficultyMax: 3, weight: 1.0, description: "Tình huống thực tế" },
      { category: QuestionCategory.BEHAVIORAL,  questionCount: 1, difficultyMin: 1, difficultyMax: 2, weight: 0.5, description: "Kỹ năng mềm và hành vi" },
    ],
  };

  for (const tpl of templates) {
    const template = await prisma.interviewTemplate.upsert({
      where: { field_level: { field: tpl.field, level: tpl.level } },
      update: {},
      create: {
        ...tpl,
        createdBy: admin.id,
      },
    });

    // Xóa sections cũ rồi tạo lại để luôn đồng bộ với SECTIONS_MAP
    await prisma.interviewTemplateSection.deleteMany({
      where: { templateId: template.id },
    });

    const sectionDefs = SECTIONS_MAP[`${tpl.field}_${tpl.level}`] ?? [];
    for (let i = 0; i < sectionDefs.length; i++) {
      const def = sectionDefs[i];
      await prisma.interviewTemplateSection.create({
        data: {
          templateId: template.id,
          category: def.category,
          questionCount: def.questionCount,
          difficultyMin: def.difficultyMin,
          difficultyMax: def.difficultyMax,
          weight: def.weight,
          description: def.description,
          orderIndex: i,
        },
      });
    }

    // Create rubric
    const rubrics = [
      {
        criteriaName: "technical_knowledge",
        displayName: "Kiến thức kỹ thuật",
        description: "Hiểu biết về công nghệ, framework, ngôn ngữ lập trình",
        weight: 1.5,
        maxScore: 100,
        orderIndex: 0,
      },
      {
        criteriaName: "problem_solving",
        displayName: "Giải quyết vấn đề",
        description: "Khả năng phân tích, tư duy logic và đưa ra giải pháp",
        weight: 1.5,
        maxScore: 100,
        orderIndex: 1,
      },
      {
        criteriaName: "communication",
        displayName: "Giao tiếp",
        description: "Khả năng trình bày rõ ràng, mạch lạc",
        weight: 1.0,
        maxScore: 100,
        orderIndex: 2,
      },
      {
        criteriaName: "practical_experience",
        displayName: "Kinh nghiệm thực tế",
        description: "Dự án, sản phẩm đã làm, kinh nghiệm làm việc nhóm",
        weight: 1.0,
        maxScore: 100,
        orderIndex: 3,
      },
      {
        criteriaName: "learning_ability",
        displayName: "Khả năng học hỏi",
        description: "Sự chủ động học hỏi, cập nhật công nghệ mới",
        weight: 0.5,
        maxScore: 100,
        orderIndex: 4,
      },
    ];

    const existingRubrics = await prisma.interviewRubric.count({
      where: { templateId: template.id },
    });

    if (existingRubrics === 0) {
      for (const rubric of rubrics) {
        await prisma.interviewRubric.create({
          data: {
            templateId: template.id,
            ...rubric,
          },
        });
      }
    }

    console.log(`✅ Template: ${tpl.name}`);
  }

  // ═══════════════════════════════════════
  // 4. Sample Resources
  // ═══════════════════════════════════════
  const resources = [
    {
      title: "JavaScript Cơ Bản cho Phỏng Vấn",
      description: "Tổng hợp các kiến thức JavaScript quan trọng nhất cho phỏng vấn Frontend",
      type: ResourceType.ARTICLE,
      url: "https://javascript.info/",
      field: InterviewField.FRONTEND,
      level: ResourceLevel.BEGINNER,
      status: "PUBLISHED" as const,
      tags: ["javascript", "frontend", "interview"],
    },
    {
      title: "Cấu trúc dữ liệu và Giải thuật",
      description: "Hướng dẫn cấu trúc dữ liệu và thuật toán phổ biến trong phỏng vấn",
      type: ResourceType.ARTICLE,
      url: "https://www.geeksforgeeks.org/data-structures/",
      field: InterviewField.FULLSTACK,
      level: ResourceLevel.INTERMEDIATE,
      status: "PUBLISHED" as const,
      tags: ["algorithm", "data-structure", "interview"],
    },
    {
      title: "SQL và Database cho Backend",
      description: "Kiến thức SQL và thiết kế database cần biết cho vị trí Backend",
      type: ResourceType.ARTICLE,
      url: "https://use-the-index-luke.com/",
      field: InterviewField.BACKEND,
      level: ResourceLevel.BEGINNER,
      status: "PUBLISHED" as const,
      tags: ["sql", "database", "backend"],
    },
  ];

  for (const res of resources) {
    const { tags, ...resData } = res;
    try {
      const resource = await prisma.resource.create({
        data: {
          ...resData,
          createdBy: admin.id,
          isAiGenerated: false,
        },
      });

      for (const tag of tags) {
        await prisma.resourceTag.create({
          data: {
            resourceId: resource.id,
            tag,
          },
        });
      }
    } catch (e) {
      // Skip if already exists
    }
  }
  console.log(`✅ ${resources.length} resources seeded`);

  console.log("\n🎉 Seeding complete!");
  console.log("══════════════════════════════");
  console.log("Admin: admin@sihi.vn / Admin@123");
  console.log("User:  user@sihi.vn / User@123");
  console.log("══════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
