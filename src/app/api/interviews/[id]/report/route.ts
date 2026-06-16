import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ReportGenerationService } from "@/services/report-generation.service";
import { ResourceRecommendationService } from "@/services/resource-recommendation.service";
import { AnalyticsEngineService } from "@/services/analytics-engine.service";
import { getAIProvider } from "@/providers/ai";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.interviewReport.findFirst({
    where: { interview: { id, userId: session.user.id } },
  });

  if (!report) return NextResponse.json({ error: "Báo cáo chưa được tạo" }, { status: 404 });
  return NextResponse.json(report);
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const interview = await prisma.interview.findFirst({ where: { id, userId: session.user.id } });
  if (!interview) return NextResponse.json({ error: "Phỏng vấn không tồn tại" }, { status: 404 });

  const existing = await prisma.interviewReport.findUnique({ where: { interviewId: id } });
  if (existing) return NextResponse.json(existing);

  const ai = getAIProvider();
  const resourceRec = new ResourceRecommendationService(ai, prisma);
  const analytics = new AnalyticsEngineService(prisma);
  const service = new ReportGenerationService(ai, prisma, resourceRec, analytics);
  const result = await service.generate({ interviewId: id });

  return NextResponse.json(result, { status: 201 });
}
