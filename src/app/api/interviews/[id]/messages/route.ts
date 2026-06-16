import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const interview = await prisma.interview.findFirst({ where: { id, userId: session.user.id } });
    if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await prisma.interviewMessage.findMany({
      where: { interviewId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, questionNumber: true, category: true, difficulty: true, createdAt: true },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
