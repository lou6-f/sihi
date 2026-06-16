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
    const body = await req.json();
    const { answer, questionNumber, recordingDurationMs, startedAt, endedAt } = body;
    if (!answer || !questionNumber) return NextResponse.json({ error: "Missing answer or questionNumber" }, { status: 400 });

    // Verify ownership
    const interview = await prisma.interview.findFirst({ where: { id, userId: session.user.id } });
    if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ai = getAIProvider();
    const evalService = new InterviewEvaluationService(ai, prisma);
    const engine = new InterviewEngineService(ai, evalService, prisma);

    const result = await engine.processAnswer({
      interviewId: id,
      transcript: answer,
      questionNumber,
      recordingDurationMs: recordingDurationMs ? Number(recordingDurationMs) : undefined,
      startedAt: startedAt ? String(startedAt) : undefined,
      endedAt: endedAt ? String(endedAt) : undefined,
    });

    // If interview is complete, end it
    if (result.isComplete) {
      await engine.endInterview({ interviewId: id });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Answer error:", error);
    return NextResponse.json({ error: "Không thể xử lý câu trả lời" }, { status: 500 });
  }
}
