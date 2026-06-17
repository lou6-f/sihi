import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      report: true,
      scoreBreakdown: true,
      cv: { select: { id: true, fileName: true, analysis: true } },
    },
  });

  if (!interview) return NextResponse.json({ error: "Phỏng vấn không tồn tại" }, { status: 404 });
  return NextResponse.json(interview);
}

/**
 * Xóa buổi phỏng vấn và toàn bộ dữ liệu liên quan (messages, report, scoreBreakdown).
 * Chỉ cho phép xóa buổi chưa hoàn thành (status != COMPLETED).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!interview) return NextResponse.json({ error: "Phỏng vấn không tồn tại" }, { status: 404 });
  if (interview.status === "COMPLETED")
    return NextResponse.json({ error: "Không thể xóa buổi đã hoàn thành" }, { status: 403 });

  // Xóa cascade: messages, report, scoreBreakdown, rồi interview
  await prisma.interviewMessage.deleteMany({ where: { interviewId: id } });
  await prisma.interviewReport.deleteMany({ where: { interviewId: id } });
  await prisma.interviewScoreBreakdown.deleteMany({ where: { interviewId: id } });
  await prisma.interview.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
