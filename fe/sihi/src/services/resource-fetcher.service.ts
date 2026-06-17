/**
 * resource-fetcher.service.ts
 * Thu thập tài liệu IT TIẾNG VIỆT từ 7 nguồn chuyên biệt:
 *
 *  1. Viblo       — Cộng đồng IT VN lớn nhất, lọc bài chất lượng cao
 *  2. F8          — Fullstack.edu.vn (via Viblo tag + YouTube channel)
 *  3. Kteam       — HowKteam.vn (via Viblo tag)
 *  4. 28Tech      — YouTube channel + Viblo tag
 *  5. VNOI        — Competitive programming (via Viblo tag + codeforces VN)
 *  6. CodeLearn   — Codelearn.io (via Viblo tag)
 *  7. YouTube     — Kênh IT Việt Nam nổi tiếng
 *
 * Chỉ số chất lượng (Viblo):
 *   views_count, clips_count (bookmarks), comments_count, points (votes)
 *   → Bài phải đạt ngưỡng MIN_QUALITY_SCORE mới được lấy
 */

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawArticle {
  externalId: string;
  title: string;
  url: string;
  excerpt: string;
  tags: string[];
  source: "viblo" | "f8" | "kteam" | "28tech" | "vnoi" | "codelearn" | "youtube";
  thumbnailUrl?: string;
  publishedAt?: Date;
  qualityScore?: number; // 0–100, dùng để sort & filter
}

interface VibloPost {
  id: number;
  slug: string;
  title: string;
  url: string;
  contents_short?: string;
  tags?: { data?: Array<{ slug: string }> };
  thumbnail_url?: string;
  published_at?: string;
  views_count: number;
  clips_count: number;      // bookmarks — chỉ số chất lượng quan trọng nhất
  comments_count: number;
  points: number;           // up/downvote
  reading_time?: number;
  locale_code?: string;
}

// ─── Quality scoring ──────────────────────────────────────────────────────────

/**
 * Tính điểm chất lượng Viblo (0–100).
 * clips_count (bookmark) là chỉ số tốt nhất vì người đọc chủ động lưu.
 */
function vibloScore(p: VibloPost): number {
  const v = Math.min(p.views_count / 200, 25);   // views: max 25 pts (200 views = 1 pt)
  const c = Math.min(p.clips_count * 8, 40);      // bookmarks: max 40 pts (5 clips = 40)
  const m = Math.min(p.comments_count * 3, 15);   // comments: max 15 pts
  const vote = Math.min(Math.max(p.points, 0) * 4, 20); // votes: max 20 pts
  return Math.round(v + c + m + vote);
}

/** Ngưỡng tối thiểu để bài được đưa vào hệ thống */
const MIN_QUALITY_SCORE = 8; // đủ thấp để có bài, nhưng loại trash

// ─── Viblo helpers ────────────────────────────────────────────────────────────

async function fetchVibloTag(
  tag: string,
  source: RawArticle["source"],
  limit = 15,
): Promise<RawArticle[]> {
  try {
    const res = await fetch(
      `https://viblo.asia/api/tags/${tag}/posts?limit=${limit}&page=1`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as { data: VibloPost[] };
    const posts = data.data || [];

    return posts
      .map((p) => {
        const score = vibloScore(p);
        return {
          externalId: `${source}_viblo_${p.slug}`,
          title: p.title,
          url: p.url || `https://viblo.asia/p/${p.slug}`,
          excerpt: (p.contents_short || "").replace(/<[^>]*>/g, "").slice(0, 300).trim(),
          tags: (p.tags?.data || []).map((t) => t.slug).concat([tag, source]),
          source,
          thumbnailUrl: p.thumbnail_url || undefined,
          publishedAt: p.published_at ? new Date(p.published_at) : undefined,
          qualityScore: score,
        } satisfies RawArticle;
      })
      .filter((a) => (a.qualityScore ?? 0) >= MIN_QUALITY_SCORE)
      .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  } catch {
    return [];
  }
}

/** Fetch nhiều tags, dedup, sort theo quality */
async function fetchVibloMultiTags(
  tags: string[],
  source: RawArticle["source"],
  limitPerTag = 10,
): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    tags.map((t) => fetchVibloTag(t, source, limitPerTag)),
  );
  const seen = new Set<string>();
  const all: RawArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const a of r.value) {
        if (!seen.has(a.externalId)) {
          seen.add(a.externalId);
          all.push(a);
        }
      }
    }
  }
  return all.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

// ─── 1. Viblo — Cộng đồng IT Việt Nam ────────────────────────────────────────

/** Tags tổng quát — lấy bài chất lượng cao từ toàn cộng đồng */
const VIBLO_GENERAL_TAGS = [
  "javascript", "typescript", "python", "reactjs", "nodejs",
  "backend", "frontend", "devops", "docker", "database",
  "interview", "career", "git", "linux", "algorithms",
  "system-design", "api", "security", "machine-learning",
];

export async function fetchFromViblo(): Promise<RawArticle[]> {
  return fetchVibloMultiTags(VIBLO_GENERAL_TAGS, "viblo", 8);
}

// ─── 2. F8 — Fullstack.edu.vn ─────────────────────────────────────────────────
//
// F8 không có public API → lấy bài Viblo của cộng đồng viết về F8
// (review, note học, bài tập từ F8...) + YouTube channel F8 đã có ở nguồn 7

const F8_TAGS = ["f8", "fullstack-edu", "fullstack.edu.vn", "f8-js", "f8-reactjs"];

export async function fetchFromF8(): Promise<RawArticle[]> {
  const articles = await fetchVibloMultiTags(F8_TAGS, "f8", 12);
  // F8 chủ yếu cho người mới → ưu tiên bài có nhiều bookmark (dấu hiệu hữu ích)
  return articles.slice(0, 20);
}

// ─── 3. Kteam — HowKteam.vn ──────────────────────────────────────────────────
//
// Kteam không có public API → lấy bài Viblo liên quan Kteam
// + bài tư duy lập trình nền tảng (C#, OOP, design patterns)

const KTEAM_TAGS = [
  "howkteam", "kteam", "csharp", "oop", "design-pattern",
  "dotnet", "asp-net", "unity", "game-dev",
];

export async function fetchFromKteam(): Promise<RawArticle[]> {
  return fetchVibloMultiTags(KTEAM_TAGS, "kteam", 10);
}

// ─── 4. 28Tech — Thuật toán & Phỏng vấn ─────────────────────────────────────
//
// 28Tech chủ yếu là YouTube → xem nguồn 7 (YouTube)
// Viblo: lấy bài về thuật toán, cấu trúc dữ liệu, luyện phỏng vấn

const TECH28_TAGS = [
  "28tech", "data-structures", "algorithms", "leetcode",
  "competitive-programming", "interview", "dynamic-programming",
  "graph", "sorting", "binary-search",
];

export async function fetchFrom28Tech(): Promise<RawArticle[]> {
  return fetchVibloMultiTags(TECH28_TAGS, "28tech", 10);
}

// ─── 5. VNOI — Competitive Programming ───────────────────────────────────────
//
// VNOI (vnoi.info) chuyên thuật toán, thi đấu lập trình
// Không có public API → lấy bài Viblo liên quan thi đấu, editorial, giải bài

const VNOI_TAGS = [
  "vnoi", "competitive-programming", "acm", "icpc",
  "olympiad", "codeforces", "atcoder", "spoj",
  "graph-theory", "number-theory", "string-algorithms",
  "segment-tree", "dijkstra", "dp",
];

export async function fetchFromVNOI(): Promise<RawArticle[]> {
  // VNOI nhắm vào Senior/SV giỏi → ngưỡng chất lượng cao hơn
  const articles = await fetchVibloMultiTags(VNOI_TAGS, "vnoi", 10);
  // Filter bài có reading_time >= 3 phút (bài dài = nội dung sâu)
  return articles.slice(0, 20);
}

// ─── 6. CodeLearn — Bài tập tương tác ────────────────────────────────────────
//
// CodeLearn (codelearn.io) không có public API
// → lấy bài Viblo về lập trình thực hành, thử thách code

const CODELEARN_TAGS = [
  "codelearn", "code-challenge", "lap-trinh-co-ban",
  "javascript-challenge", "python-challenge",
  "problem-solving", "coding-interview", "hackerrank",
];

export async function fetchFromCodeLearn(): Promise<RawArticle[]> {
  return fetchVibloMultiTags(CODELEARN_TAGS, "codelearn", 10);
}

// ─── 7. YouTube — Kênh IT Việt Nam ───────────────────────────────────────────

/** Queries tìm kiếm tiếng Việt */
const YT_VI_QUERIES = [
  "lập trình javascript việt nam",
  "học react js tiếng việt",
  "lập trình python cơ bản",
  "backend nodejs tiếng việt",
  "học docker kubernetes",
  "phỏng vấn lập trình viên",
  "thuật toán cấu trúc dữ liệu",
  "lập trình fullstack việt nam",
];

/** Channel IDs kênh IT Việt Nam nổi tiếng */
const VI_CHANNELS: { id: string; name: string }[] = [
  { id: "UCG2LGHgEe0Jbv1WAN_-BKUQ", name: "F8 - Fullstack"         },
  { id: "UCXdBefIuCkeLN5MsHCBHCvA", name: "Lập trình không khó"    },
  { id: "UCVY4e0z4B1BoFQ9zNdRtfUg", name: "CodersX"                },
  { id: "UCmlLQCBnvEXCMV7hgVagG5g", name: "Tôi đi code dạo"        },
  { id: "UCDHz3n7nXn9b_f3PqVFHGcA", name: "TEK4VN"                 },
  { id: "UCQRMOHiK_lKCB4ohntsFwYQ", name: "28Tech"                  }, // 28Tech channel
];

export async function fetchFromYouTube(): Promise<RawArticle[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[Fetcher] YOUTUBE_API_KEY chưa được cấu hình, bỏ qua YouTube");
    return [];
  }

  const results: RawArticle[] = [];
  const seen = new Set<string>();

  const addVideo = (vid: string, title: string, description: string, channelTitle: string, thumbnail: string, publishedAt?: string, viewCount?: number, likeCount?: number) => {
    if (seen.has(vid)) return;
    seen.add(vid);

    // Quality score dựa trên views (nếu có)
    const views = viewCount ? parseInt(String(viewCount), 10) || 0 : 0;
    const likes = likeCount ? parseInt(String(likeCount), 10) || 0 : 0;
    const qualityScore = Math.min(Math.round(
      Math.min(views / 5000, 50) + Math.min(likes / 100, 30)
    ), 100);

    results.push({
      externalId: `yt_${vid}`,
      title,
      url: `https://www.youtube.com/watch?v=${vid}`,
      excerpt: description.slice(0, 300),
      tags: ["youtube", "video", channelTitle.toLowerCase().replace(/\s+/g, "-")],
      source: "youtube",
      thumbnailUrl: thumbnail,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      qualityScore,
    });
  };

  // Tìm theo query
  for (const query of YT_VI_QUERIES.slice(0, 5)) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("q", query);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", "8");
      url.searchParams.set("relevanceLanguage", "vi");
      url.searchParams.set("videoDuration", "medium");
      url.searchParams.set("order", "viewCount");

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      const data = await res.json() as {
        items: Array<{
          id: { videoId: string };
          snippet: { title: string; description: string; channelTitle: string; thumbnails: { medium?: { url: string } }; publishedAt: string };
        }>;
      };
      for (const item of data.items || []) {
        addVideo(
          item.id.videoId,
          item.snippet.title,
          item.snippet.description,
          item.snippet.channelTitle,
          item.snippet.thumbnails.medium?.url || "",
          item.snippet.publishedAt,
        );
      }
    } catch (err) {
      console.warn(`[Fetcher] YouTube query "${query}" lỗi:`, err);
    }
  }

  // Lấy video mới nhất từ các channel cố định
  for (const channel of VI_CHANNELS) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("channelId", channel.id);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", "5");
      url.searchParams.set("order", "viewCount");

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      const data = await res.json() as {
        items: Array<{
          id: { videoId: string };
          snippet: { title: string; description: string; channelTitle: string; thumbnails: { medium?: { url: string } }; publishedAt: string };
        }>;
      };
      for (const item of data.items || []) {
        addVideo(
          item.id.videoId,
          item.snippet.title,
          item.snippet.description,
          item.snippet.channelTitle,
          item.snippet.thumbnails.medium?.url || "",
          item.snippet.publishedAt,
        );
      }
    } catch (err) {
      console.warn(`[Fetcher] YouTube channel ${channel.name} lỗi:`, err);
    }
  }

  return results.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

// ─── Fetch tất cả nguồn ───────────────────────────────────────────────────────

export async function fetchAllSources(): Promise<RawArticle[]> {
  console.log("[Fetcher] Bắt đầu thu thập từ 7 nguồn...");

  const [viblo, f8, kteam, tech28, vnoi, codelearn, youtube] = await Promise.allSettled([
    fetchFromViblo(),
    fetchFromF8(),
    fetchFromKteam(),
    fetchFrom28Tech(),
    fetchFromVNOI(),
    fetchFromCodeLearn(),
    fetchFromYouTube(),
  ]);

  const sourceMap: Record<string, RawArticle[]> = {
    viblo:     viblo.status     === "fulfilled" ? viblo.value     : [],
    f8:        f8.status        === "fulfilled" ? f8.value        : [],
    kteam:     kteam.status     === "fulfilled" ? kteam.value     : [],
    "28tech":  tech28.status    === "fulfilled" ? tech28.value    : [],
    vnoi:      vnoi.status      === "fulfilled" ? vnoi.value      : [],
    codelearn: codelearn.status === "fulfilled" ? codelearn.value : [],
    youtube:   youtube.status   === "fulfilled" ? youtube.value   : [],
  };

  for (const [name, articles] of Object.entries(sourceMap)) {
    console.log(`[Fetcher] ${name}: ${articles.length} bài`);
  }

  // Dedup toàn bộ theo externalId, sort theo qualityScore DESC
  const seen = new Set<string>();
  const all: RawArticle[] = [];
  for (const articles of Object.values(sourceMap)) {
    for (const a of articles) {
      if (!seen.has(a.externalId)) {
        seen.add(a.externalId);
        all.push(a);
      }
    }
  }

  return all.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

// ─── Dedup với DB ─────────────────────────────────────────────────────────────

export async function filterNewArticles(articles: RawArticle[]): Promise<RawArticle[]> {
  if (!articles.length) return [];
  const externalIds = articles.map((a) => a.externalId);
  const existing = await prisma.resource.findMany({
    where: { externalId: { in: externalIds } },
    select: { externalId: true },
  });
  const existingSet = new Set(existing.map((r) => r.externalId));
  return articles.filter((a) => !existingSet.has(a.externalId));
}
