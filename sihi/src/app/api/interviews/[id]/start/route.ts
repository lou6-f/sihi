import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";
import { InterviewEngineService } from "@/services/interview-engine.service";
import { InterviewEvaluationService } from "@/services/interview-evaluation.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const ai = getAIProvider();
    const evalService = new InterviewEvaluationService(ai, prisma);
    const engine = new InterviewEngineService(ai, evalService, prisma);

    // Verify ownership
    const interview = await prisma.interview.findFirst({ where: { id, userId: session.user.id } });
    if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check CV analysis if available
    let cvAnalysis: Record<string, unknown> | undefined;
    if (interview.cvId) {
      const cv = await prisma.cV.findUnique({ where: { id: interview.cvId } });
      if (cv?.analysis) cvAnalysis = cv.analysis as Record<string, unknown>;
    }

    const result = await engine.startInterview({ interviewId: id, userId: session.user.id, cvAnalysis });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Start interview error:", error);
    return NextResponse.json({ error: "Không thể bắt đầu phỏng vấn" }, { status: 500 });
  }
}
