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
