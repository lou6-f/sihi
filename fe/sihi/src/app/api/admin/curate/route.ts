/**
 * POST /api/admin/curate   — Trigger curation job thủ công
 * GET  /api/admin/curate   — Lấy kết quả job gần nhất
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runCuration } from "@/services/resource-curator.service";

// Lưu kết quả job gần nhất trong memory (process lifetime)
let lastResult: {
  status: "idle" | "running" | "done" | "error";
  result?: Awaited<ReturnType<typeof runCuration>>;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
} = { status: "idle" };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(lastResult);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (lastResult.status === "running") {
    // An toàn: nếu đã chạy quá 5 phút mà chưa xong, tự reset
    const startedAt = lastResult.startedAt ? new Date(lastResult.startedAt).getTime() : 0;
    if (Date.now() - startedAt > 5 * 60 * 1000) {
      lastResult = { status: "idle" };
    } else {
      return NextResponse.json({ error: "Curation đang chạy, vui lòng đợi" }, { status: 409 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const sources = body.sources ?? ["viblo", "youtube", "freecodecamp", "roadmap"];
  const maxArticles = Math.min(Number(body.maxArticles) || 8, 20);
  const TIMEOUT_MS = 3 * 60 * 1000; // 3 phút tối đa

  // Chạy background với timeout 3 phút
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout sau 3 phút")), TIMEOUT_MS)
  );
  // Đánh dấu đang chạy TRƯỚC khi fire Promise.race
  lastResult = { status: "running", startedAt: new Date().toISOString() };

  Promise.race([runCuration({ sources, maxArticles }), timeout])
    .then((result) => {
      lastResult = {
        status: "done",
        result: result as Awaited<ReturnType<typeof runCuration>>,
        startedAt: lastResult.startedAt,
        finishedAt: new Date().toISOString(),
      };
    })
    .catch((err) => {
      lastResult = {
        status: "error",
        error: String(err),
        startedAt: lastResult.startedAt,
        finishedAt: new Date().toISOString(),
      };
    });

  return NextResponse.json({
    message: "Curation đã bắt đầu",
    status: "running",
    startedAt: lastResult.startedAt,
  });
}
