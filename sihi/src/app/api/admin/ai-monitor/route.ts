import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Key info from env (don't expose actual keys)
    const keyCount = (process.env.GEMINI_API_KEYS || "").split(",").filter(Boolean).length;
    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    // Recent usage logs
    const recentLogs = await prisma.apiProviderUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, provider: true, keyAlias: true, requestType: true,
        status: true, errorCode: true, latencyMs: true, createdAt: true,
      },
    });

    // Usage summary (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalCalls, successCalls, failedCalls] = await Promise.all([
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h }, status: "SUCCESS" } }),
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h }, status: "ERROR" } }),
    ]);

    return NextResponse.json({
      keys: { totalKeys: keyCount, model, provider: process.env.AI_PROVIDER || "gemini" },
      recentLogs,
      summary: {
        totalCalls, successCalls, failedCalls,
        successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("AI monitor error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
