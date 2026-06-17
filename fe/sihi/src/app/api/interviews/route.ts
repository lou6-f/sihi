import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createInterviewSchema } from "@/lib/validators";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const [interviews, total] = await Promise.all([
    prisma.interview.findMany({
      where: { userId: session.user.id },
      select: {
        id: true, field: true, level: true, status: true, totalScore: true,
        questionCount: true, maxQuestions: true, duration: true,
        startedAt: true, endedAt: true, createdAt: true,
        report: { select: { overallScore: true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.interview.count({ where: { userId: session.user.id } }),
  ]);

  // Normalize: dùng report.overallScore nếu Interview.totalScore chưa được lưu
  const normalized = interviews.map(({ report, ...iv }) => ({
    ...iv,
    totalScore: iv.totalScore ?? report?.overallScore ?? null,
  }));

  return NextResponse.json({ interviews: normalized, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { field, level, cvId, targetRole, jobDescription, jdMode } = createInterviewSchema.parse(body);

  // ── Tầng 1: Check for active (non-finished) interview ─────────────────────
  const FINAL_STATUSES = ["COMPLETED", "CANCELLED", "ABANDONED", "ERROR"];
  const activeInterview = await prisma.interview.findFirst({
    where: {
      userId: session.user.id,
      status: { notIn: FINAL_STATUSES as never[] },
    },
    select: { id: true, field: true, level: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (activeInterview) {
    return NextResponse.json(
      { error: "Bạn có phỏng vấn đang dở", existingInterview: activeInterview },
      { status: 409 }
    );
  }

  const template = await prisma.interviewTemplate.findUnique({
    where: { field_level: { field, level } },
  });

  const interview = await prisma.interview.create({
    data: {
      userId: session.user.id,
      field, level, cvId: cvId || null,
      templateId: template?.id || null,
      maxQuestions: template?.questionCount || 10,
      targetRole: targetRole || null,
      jobDescription: jobDescription || null,
      jdMode: jdMode || "GENERAL",
    },
    select: { id: true, field: true, level: true, status: true, maxQuestions: true, jdMode: true, targetRole: true },
  });

  return NextResponse.json(interview, { status: 201 });
}
