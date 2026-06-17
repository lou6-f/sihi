import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";

interface MatchRequest {
  topics: string[];   // danh sách topic từ learningRoadmap
  field?: string;     // InterviewField để ưu tiên tài liệu phù hợp
}

interface ResourceItem {
  title: string;
  url: string;
  description?: string | null;
  tags: string[];
}

/**
 * POST /api/resources/match
 * Dùng Gemini để phân tích từng topic trong lộ trình học tập và tìm
 * tài liệu phù hợp nhất từ DB. Batch 1 call cho tất cả topics.
 *
 * Body: { topics: string[], field?: string }
 * Response: { matches: Record<number, { title: string; url: string }[]> }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as MatchRequest;
  const { topics, field } = body;

  if (!topics?.length) return NextResponse.json({ matches: {} });

  // 1. Lấy tài liệu PUBLISHED:
  //    - Ưu tiên tài liệu đúng field (nếu có)
  //    - Bổ sung FULLSTACK (applicable cho mọi lĩnh vực)
  //    - Tối đa 50 tài liệu để giữ prompt ngắn gọn
  const validFields = field ? [field, "FULLSTACK"] : ["FULLSTACK"];
  const resources = await prisma.resource.findMany({
    where: {
      status: "PUBLISHED",
      field: { in: validFields as never[] },
    },
    orderBy: { relevanceScore: "desc" },
    take: 50,
    select: {
      title: true,
      url: true,
      description: true,
      tags: { select: { tag: true } },
    },
  });

  // Nếu không đủ 20 tài liệu, bổ sung từ các field khác
  let allResources = resources;
  if (resources.length < 20) {
    const extra = await prisma.resource.findMany({
      where: {
        status: "PUBLISHED",
        field: { notIn: validFields as never[] },
      },
      orderBy: { relevanceScore: "desc" },
      take: 50 - resources.length,
      select: {
        title: true,
        url: true,
        description: true,
        tags: { select: { tag: true } },
      },
    });
    allResources = [...resources, ...extra];
  }

  if (allResources.length === 0) return NextResponse.json({ matches: {} });

  // Dedup theo URL (seed có thể có trùng)
  const seen = new Set<string>();
  const resourceList: ResourceItem[] = [];
  for (const r of allResources) {
    if (!seen.has(r.url)) {
      seen.add(r.url);
      resourceList.push({
        title: r.title,
        url: r.url,
        description: r.description,
        tags: r.tags.map((t) => t.tag),
      });
    }
  }

  // 2. Xây prompt — rõ ràng, chặt chẽ về tiêu chí phù hợp
  const resourcesText = resourceList
    .map((r, i) => {
      const desc = r.description ? ` — ${r.description.slice(0, 120)}` : "";
      const tags = r.tags.length ? ` [tags: ${r.tags.join(", ")}]` : "";
      return `[${i}] "${r.title}"${desc}${tags}\n    URL: ${r.url}`;
    })
    .join("\n");

  const topicsText = topics.map((t, i) => `${i}. ${t}`).join("\n");

  const prompt = `Bạn là AI tư vấn học tập kỹ thuật. Nhiệm vụ: với mỗi chủ đề học tập, tìm tài liệu THỰC SỰ PHÙ HỢP từ danh sách dưới đây.

DANH SÁCH TÀI LIỆU (chỉ được chọn trong danh sách này):
${resourcesText}

CHỦ ĐỀ CẦN TÌM TÀI LIỆU:
${topicsText}

TIÊU CHÍ CHỌN (BẮT BUỘC tuân thủ):
1. Tài liệu phải liên quan TRỰC TIẾP đến nội dung chủ đề (không phải liên quan gián tiếp hoặc cùng lĩnh vực chung)
2. Ví dụ ĐÚNG: chủ đề "Kỹ năng phỏng vấn" → chỉ chọn tài liệu nói về phỏng vấn, không chọn tài liệu về thuật toán hay OOP
3. Ví dụ ĐÚNG: chủ đề "HTML/CSS/JavaScript" → chọn tài liệu về web frontend, không chọn tài liệu về backend hay thuật toán
4. Nếu KHÔNG có tài liệu phù hợp với chủ đề → trả về mảng RỖNG (đừng chọn bừa)
5. Mỗi chủ đề tối đa 3 tài liệu phù hợp nhất
6. KHÔNG được bịa URL hoặc title mới — chỉ dùng đúng URL và title có trong danh sách

Trả về JSON (chỉ JSON, không giải thích thêm):
{
  "matches": {
    "0": [{"title": "...", "url": "..."}],
    "1": [],
    "2": [{"title": "...", "url": "..."}]
  }
}`;

  try {
    const ai = getAIProvider();
    const response = await ai.chat(
      [{ role: "user", content: prompt }],
      { temperature: 0.0, responseFormat: "json" }
    );

    let parsed: { matches?: Record<string, { title: string; url: string }[]> };
    try {
      parsed = JSON.parse(response.content);
    } catch {
      return NextResponse.json({ matches: {} });
    }

    // 3. Validate: chỉ giữ URLs có trong DB (tránh AI bịa)
    const validUrls = new Map(resourceList.map((r) => [r.url, r.title]));
    const safeMatches: Record<number, { title: string; url: string }[]> = {};

    for (const [idxStr, items] of Object.entries(parsed.matches ?? {})) {
      const idx = parseInt(idxStr);
      if (isNaN(idx)) continue;
      safeMatches[idx] = (items ?? [])
        .filter((m) => validUrls.has(m.url))
        .map((m) => ({ title: validUrls.get(m.url) ?? m.title, url: m.url })) // dùng title từ DB
        .slice(0, 3);
    }

    return NextResponse.json({ matches: safeMatches });
  } catch (err) {
    console.error("[resources/match] AI error:", err);
    return NextResponse.json({ matches: {} });
  }
}
