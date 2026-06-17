import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const keyCount = (process.env.GEMINI_API_KEYS || "").split(",").filter(Boolean).length;
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last10min = new Date(Date.now() - 10 * 60 * 1000);

    // ── Parallel queries ───────────────────────────────────────────
    const [
      recentLogs,
      totalCalls,
      successCalls,
      failedCalls,
      rateLimitCalls,
      allLogs24h,
      rateLimitRecent,
    ] = await Promise.all([
      // 50 logs mới nhất (kèm requestType + errorMessage)
      prisma.apiProviderUsageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true, provider: true, keyAlias: true, requestType: true,
          status: true, errorCode: true, errorMessage: true,
          latencyMs: true, createdAt: true,
        },
      }),
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h }, status: "success" } }),
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h }, status: { in: ["error", "rate_limit"] } } }),
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last24h }, status: "rate_limit" } }),
      // Toàn bộ logs 24h để tính hourly + requestType breakdown
      prisma.apiProviderUsageLog.findMany({
        where: { createdAt: { gte: last24h } },
        select: { createdAt: true, status: true, requestType: true },
      }),
      // Rate limit trong 10 phút gần nhất (cho alert)
      prisma.apiProviderUsageLog.count({ where: { createdAt: { gte: last10min }, status: "rate_limit" } }),
    ]);

    // ── Hourly breakdown (0-23) ────────────────────────────────────
    const hourlyMap: Record<number, { total: number; success: number; failed: number }> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = { total: 0, success: 0, failed: 0 };

    allLogs24h.forEach((log) => {
      const hour = new Date(log.createdAt).getHours();
      hourlyMap[hour].total++;
      if (log.status === "success") hourlyMap[hour].success++;
      else hourlyMap[hour].failed++;
    });

    const now = new Date();
    const currentHour = now.getHours();
    const hourlyChart = Array.from({ length: 24 }, (_, i) => {
      const hour = (currentHour - 23 + i + 24) % 24;
      return {
        hour: `${String(hour).padStart(2, "0")}:00`,
        ...hourlyMap[hour],
      };
    });

    // ── RequestType breakdown ─────────────────────────────────────
    const requestTypeMap: Record<string, number> = {};
    allLogs24h.forEach((log) => {
      const t = log.requestType || "unknown";
      requestTypeMap[t] = (requestTypeMap[t] || 0) + 1;
    });
    const requestTypeChart = Object.entries(requestTypeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // ── Rate limit alert ──────────────────────────────────────────
    // Alert nếu >= 3 rate limit trong 10 phút
    const rateLimitAlert = rateLimitRecent >= 3;

    return NextResponse.json({
      keys: { totalKeys: keyCount, model, provider: process.env.AI_PROVIDER || "gemini" },
      recentLogs,
      summary: {
        totalCalls,
        successCalls,
        failedCalls,
        rateLimitCalls,
        successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0,
      },
      hourlyChart,
      requestTypeChart,
      rateLimitAlert: {
        triggered: rateLimitAlert,
        count: rateLimitRecent,
        window: "10 phút",
      },
    });
  } catch (error) {
    console.error("AI monitor error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
