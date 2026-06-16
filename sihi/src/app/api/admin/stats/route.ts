import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalUsers, totalInterviews, completedInterviews, avgScoreResult, totalResources, activeToday, interviewsByFieldRaw] = await Promise.all([
      prisma.user.count(),
      prisma.interview.count(),
      prisma.interview.count({ where: { status: "COMPLETED" } }),
      prisma.interview.aggregate({ _avg: { totalScore: true }, where: { totalScore: { not: null } } }),
      prisma.resource.count(),
      prisma.user.count({
        where: { updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.interview.groupBy({
        by: ["field"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    const interviewsByField = interviewsByFieldRaw.map((item) => ({
      field: item.field,
      count: item._count.id,
    }));

    return NextResponse.json({
      totalUsers,
      totalInterviews,
      completedInterviews,
      totalResources,
      activeToday,
      avgScore: Math.round(avgScoreResult._avg.totalScore || 0),
      interviewsByField,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
