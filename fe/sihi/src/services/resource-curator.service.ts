/**
 * resource-curator.service.ts
 * AI-powered curation: fetch → Gemini phân tích → lưu DB với status PENDING_REVIEW hoặc PUBLISHED.
 *
 * Auto-approve logic:
 *   relevanceScore >= 80 → PUBLISHED (auto)
 *   relevanceScore 50-79 → PENDING_REVIEW (admin duyệt)
 *   relevanceScore < 50  → bỏ qua
 *   skip = true          → bỏ qua
 */

import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";
import {
  fetchAllSources, filterNewArticles, type RawArticle,
} from "./resource-fetcher.service";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceField = "FRONTEND" | "BACKEND" | "DATA" | "FULLSTACK";
type ResourceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type ResourceType  = "ARTICLE" | "VIDEO" | "EXTERNAL_LINK" | "ROADMAP";

interface GeminiAnalysis {
  field: ResourceField;
  level: ResourceLevel;
  type: ResourceType;
  tags: string[];
  summary: string;         // 2-3 câu tiếng Việt
  relevanceScore: number;  // 0-100
  skip: boolean;           // true nếu không liên quan IT career
}

export interface CurationResult {
  fetched: number;
  newArticles: number;
  analyzed: number;
  saved: number;          // Tổng số đã lưu vào hàng đợi
  pendingReview: number;  // Tất cả đều vào PENDING_REVIEW
  skipped: number;        // relevanceScore < 30 hoặc skip=true
  errors: number;
  durationMs: number;
}

// ─── Gemini Analyzer ─────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = (article: RawArticle) => `
Bạn là chuyên gia phân loại và đánh giá chất lượng tài liệu học lập trình IT.

Phân tích bài viết sau và trả về JSON:

Tiêu đề: "${article.title}"
URL: ${article.url}
Mô tả: "${article.excerpt}"
Tags gốc: [${article.tags.join(", ")}]
Nguồn: ${article.source}
Quality Score (cộng đồng): ${article.qualityScore ?? "chưa có"}

Trả về JSON CHÍNH XÁC (không có text ngoài JSON):
{
  "field": "FRONTEND" | "BACKEND" | "DATA" | "FULLSTACK",
  "level": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
  "type": "ARTICLE" | "VIDEO" | "EXTERNAL_LINK" | "ROADMAP",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Tóm tắt 2-3 câu bằng tiếng Việt mô tả nội dung và giá trị của tài liệu",
  "qualityScore": 0-100,
  "skip": false
}

Hướng dẫn chấm điểm qualityScore (điểm chất lượng, KHÔNG phải điểm xét duyệt):
- 80-100: Tài liệu xuất sắc — có cấu trúc rõ ràng, ví dụ thực tế, phù hợp học lập trình
- 60-79: Tài liệu tốt — nội dung hữu ích, có thể cải thiện thêm
- 40-59: Tài liệu trung bình — liên quan IT nhưng chưa sâu
- 0-39: Tài liệu kém — quá chung chung hoặc ít giá trị học thuật
- skip=true: Bài không liên quan IT, nội dung không phù hợp, hoặc không thể phân loại

Xác định "field":
- FRONTEND: React, Vue, Angular, CSS, HTML, UI/UX, browser, web design
- BACKEND: Node, Python, Java, Go, API, database, server, microservices
- DATA: SQL, data science, ML, AI, analytics, pandas, numpy, machine learning
- FULLSTACK: Cover cả frontend + backend, hoặc chủ đề tổng quát (git, devops, career, thuật toán)

Xác định "type":
- VIDEO: Nếu source là youtube hoặc URL chứa youtube.com
- ROADMAP: Nếu source là roadmap hoặc URL chứa roadmap.sh
- ARTICLE: Mặc định cho Viblo, F8, Kteam, 28Tech, VNOI, CodeLearn
- EXTERNAL_LINK: GitHub, tài liệu chính thức

Lưu ý: Nếu Quality Score cộng đồng cao (> 15) thì ưu tiên chấm điểm cao hơn, vì nhiều người đã bookmark chứng tỏ bài có giá trị thực.
`.trim();

async function analyzeArticle(article: RawArticle): Promise<GeminiAnalysis | null> {
  try {
    const ai = getAIProvider();
    const response = await ai.chat([
      {
        role: "user",
        content: ANALYSIS_PROMPT(article),
      },
    ], { temperature: 0.1, maxTokens: 512 });

    const raw = response.content.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(raw) as GeminiAnalysis;
    // Đảm bảo qualityScore tồn tại (Gemini đôi khi dùng tên khác)
    if (parsed.qualityScore === undefined && (parsed as Record<string, unknown>).relevanceScore !== undefined) {
      parsed.qualityScore = (parsed as Record<string, unknown>).relevanceScore as number;
    }
    return parsed;
  } catch (err) {
    console.warn("[Curator] analyzeArticle error:", err);
    return null;
  }
}

// ─── Save to DB ───────────────────────────────────────────────────────────────

/**
 * Tất cả tài liệu thu thập đều vào PENDING_REVIEW.
 * AI chỉ gán nhãn (field/level/type/tags/summary) và chấm qualityScore.
 * Admin quyết định duyệt hay từ chối.
 */
async function saveResource(article: RawArticle, analysis: GeminiAnalysis): Promise<"saved" | "skipped"> {
  if (analysis.skip || analysis.qualityScore < 30) return "skipped";

  try {
    await prisma.resource.create({
      data: {
        title: article.title,
        url: article.url,
        description: article.excerpt || null,
        summary: analysis.summary,
        type: analysis.type,
        field: analysis.field,
        level: analysis.level,
        status: "PENDING_REVIEW", // Luôn vào hàng đợi duyệt
        isAiGenerated: true,
        externalId: article.externalId,
        relevanceScore: analysis.qualityScore,
        tags: {
          create: analysis.tags.slice(0, 8).map((tag) => ({ tag })),
        },
      },
    });

    console.log(`[Curator] Queued: "${article.title}" (score=${analysis.qualityScore})`);
    return "saved";
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      console.log(`[Curator] Skip duplicate: ${article.externalId}`);
      return "skipped";
    }
    throw err;
  }
}

// ─── Main Curator ─────────────────────────────────────────────────────────────

/**
 * Chạy toàn bộ pipeline: fetch → dedup → analyze → save vào PENDING_REVIEW.
 * Gọi từ API route hoặc cron job.
 */
export async function runCuration(options?: {
  sources?: ("viblo" | "f8" | "kteam" | "28tech" | "vnoi" | "codelearn" | "youtube")[];
  maxArticles?: number;
}): Promise<CurationResult> {
  const startMs = Date.now();
  const maxArticles = options?.maxArticles ?? 15;

  const result: CurationResult = {
    fetched: 0, newArticles: 0, analyzed: 0,
    saved: 0, pendingReview: 0,
    skipped: 0, errors: 0, durationMs: 0,
  };

  try {
    // 1. Fetch từ tất cả 7 nguồn song song
    console.log("[Curator] Bắt đầu fetch từ 7 nguồn: Viblo, F8, Kteam, 28Tech, VNOI, CodeLearn, YouTube");
    const rawArticles = await fetchAllSources();

    result.fetched = rawArticles.length;
    console.log(`[Curator] Fetched ${result.fetched} articles (sorted by quality score)`);

    // 2. Dedup với DB
    const newArticles = await filterNewArticles(rawArticles);
    result.newArticles = Math.min(newArticles.length, maxArticles);
    console.log(`[Curator] Bài mới (sau dedup): ${result.newArticles}`);

    // 3. Analyze + Save tuần tự (tránh rate limit Gemini)
    const toProcess = newArticles.slice(0, maxArticles);

    for (const article of toProcess) {
      try {
        const analysis = await analyzeArticle(article);
        result.analyzed++;

        if (!analysis) { result.errors++; continue; }

        const saveResult = await saveResource(article, analysis);
        if (saveResult === "saved") {
          result.pendingReview++;
          result.saved++;
        } else {
          result.skipped++;
        }

        // Delay nhỏ tránh spam Gemini
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`[Curator] Error processing ${article.externalId}:`, err);
        result.errors++;
      }
    }
  } catch (err) {
    console.error("[Curator] Fatal error:", err);
  }

  result.durationMs = Date.now() - startMs;
  console.log(`[Curator] Hoàn tất: ${JSON.stringify(result)}`);
  return result;
}

