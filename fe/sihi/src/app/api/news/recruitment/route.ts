import { NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  dateLabel: string;
  url: string;
  image: string | null;
  company: "FPT" | "Viettel" | "VNG" | "VinGroup" | "VNPT" | "MoMo" | "Techcombank" | "MB" | "Tiki" | "Shopee" | "TopDev";
}

// ─── Nguồn báo chí tổng hợp ─ cần lọc công ty + tuyển dụng ───
const RSS_SOURCES = [
  { url: "https://vnexpress.net/rss/kinh-doanh.rss",        name: "VnExpress"   },
  { url: "https://vnexpress.net/rss/so-hoa.rss",            name: "VnExpress"   },
  { url: "https://cafef.vn/rss/doanh-nghiep.rss",           name: "CafeF"       },
  { url: "https://vietnamnet.vn/rss/kinh-doanh.rss",        name: "VietnamNet"  },
  { url: "https://tuoitre.vn/rss/kinh-te.rss",              name: "Tuổi Trẻ"   },
  { url: "https://tuoitre.vn/rss/nhip-song-so.rss",         name: "Tuổi Trẻ"   },
  { url: "https://thanhnien.vn/rss/pages/home.rss",         name: "Thanh Niên" },
  { url: "https://thanhnien.vn/rss/pages/kinh-te.rss",      name: "Thanh Niên" },
  { url: "https://dantri.com.vn/rss/kinh-doanh.rss",        name: "Dân Trí"    },
  { url: "https://zingnews.vn/kinh-doanh.rss",              name: "Zing News"  },
  { url: "https://zingnews.vn/cong-nghe.rss",               name: "Zing News"  },
  { url: "https://nld.com.vn/rss/kinh-te.rss",              name: "NLĐ"        },
  { url: "https://laodong.vn/rss/kinh-te.rss",              name: "Lao Động"  },
  { url: "https://tienphong.vn/rss/kinh-te.rss",            name: "Tiền Phong" },
];

/**
 * Nguồn CHUYÊN tuyển dụng / việc làm — tin tưởng, bỏ qua lọc tên công ty.
 * Chỉ cần từ khóa tuyển dụng trong tiêu đề là được lấy.
 */
const TRUSTED_RECRUITMENT_SOURCES = [
  // ── Feed chuyên nhân sự / việc làm ───────────────────────────────────
  { url: "https://cafef.vn/rss/nhan-su-tuyen-dung.rss",    name: "CafeF"      },
  { url: "https://baodautu.vn/rss/nhan-su.rss",            name: "Báo Đầu Tư" },
  { url: "https://dantri.com.vn/rss/viec-lam.rss",         name: "Dân Trí"    },
  { url: "https://nld.com.vn/rss/viec-lam.rss",            name: "NLĐ"        },
  // ── Nền tảng IT/tuyển dụng ────────────────────────────────────────
  { url: "https://topdev.vn/blog/feed/rss",                name: "TopDev"     },
];

// Keywords → company mapping (check in title or description)
const COMPANY_KEYWORDS: { keyword: string; company: NewsItem["company"] }[] = [
  { keyword: "fpt",          company: "FPT"         },
  { keyword: "viettel",      company: "Viettel"     },
  { keyword: "vng",          company: "VNG"         },
  { keyword: "zalo",         company: "VNG"         },
  { keyword: "zalopay",      company: "VNG"         },
  { keyword: "vingroup",     company: "VinGroup"    },
  { keyword: "vinfast",      company: "VinGroup"    },
  { keyword: "vinhomes",     company: "VinGroup"    },
  { keyword: "vnpt",         company: "VNPT"        },
  { keyword: "momo",         company: "MoMo"        },
  { keyword: "m_service",    company: "MoMo"        },
  { keyword: "techcombank",  company: "Techcombank" },
  { keyword: "mb bank",      company: "MB"          },
  { keyword: "mbbank",       company: "MB"          },
  { keyword: "tiki",         company: "Tiki"        },
  { keyword: "shopee",       company: "Shopee"      },
  { keyword: "sea limited",  company: "Shopee"      },
];

// ─── Helpers ──────────────────────────────────────────────────

function timeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

/** Detect company from text (title + description combined) */
function detectCompany(text: string): NewsItem["company"] | null {
  const lower = text.toLowerCase();
  for (const { keyword, company } of COMPANY_KEYWORDS) {
    if (lower.includes(keyword)) return company;
  }
  return null;
}

// Từ khóa đặc trưng tuyển dụng — CHỈ check tiêu đề để tránh false positive
const RECRUITMENT_KEYWORDS = [
  // Tiếng Việt — cụm từ rõ ràng
  "tuyển dụng", "tuyển nhân viên", "tuyển kỹ sư", "tuyển lập trình viên",
  "tuyển thực tập", "thực tập sinh", "việc làm", "ứng viên",
  "cơ hội nghề nghiệp", "tuyển mới", "nhân sự mới",
  "chính sách tuyển", "nhu cầu tuyển", "mở rộng nhân lực",
  "tăng lương", "chính sách lương", "lương thưởng nhân viên",
  "sa thải", "cắt giảm nhân sự", "thưởng tết nhân viên",
  // Tiếng Anh
  "hiring", "recruitment", "job opening", "internship", "layoff",
  "workforce", "employees", "job fair",
];

/** Kiểm tra TIÊU ĐỀ có liên quan tới tuyển dụng không (không check description) */
function isRecruitmentRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return RECRUITMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Extract first image src from HTML content (handles both quoted and unquoted, CDATA) */
function extractImage(raw: string): string | null {
  // Remove CDATA markers if present
  const html = raw.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");

  // Try <img src="..."> or <img src='...'>
  const imgMatch = /<img[^>]+src=(?:["']([^"'>\s]+)["']|([^\s>"']+))/i.exec(html);
  const src = imgMatch?.[1] || imgMatch?.[2];
  if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
    return src;
  }

  // Try <media:content url="...">
  const mediaMatch = /<media:content[^>]+url=["']([^"']+)["']/i.exec(html);
  if (mediaMatch?.[1]?.startsWith("http")) return mediaMatch[1];

  // Try <enclosure url="...">
  const enclosureMatch = /<enclosure[^>]+url=["']([^"']+)["']/i.exec(html);
  if (enclosureMatch?.[1]?.startsWith("http")) return enclosureMatch[1];

  return null;
}

/** Parse RSS XML and return matching articles */
function parseRSS(xml: string, sourceName: string): {
  title: string; url: string; date: string; description: string; image: string | null;
}[] {
  const items: { title: string; url: string; date: string; description: string; image: string | null }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];

    // Title
    const titleRaw = (/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block)?.[1] ?? "").trim();
    const title = titleRaw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

    // Link
    const url = (/<link>([\s\S]*?)<\/link>/i.exec(block)?.[1] ??
                 /<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(block)?.[1] ?? "").trim();

    // Description (may contain image)
    const descRaw = (/<description>([\s\S]*?)<\/description>/i.exec(block)?.[1] ?? "");

    // Also check <content:encoded>
    const contentRaw = (/<content:encoded>([\s\S]*?)<\/content:encoded>/i.exec(block)?.[1] ?? "");

    // pubDate
    const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1] ?? "").trim();

    if (!title || !url) continue;

    // Extract image from description or content
    const image = extractImage(descRaw) || extractImage(contentRaw) || extractImage(block);
    const dateIso = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

    items.push({ title, url, date: dateIso, description: descRaw + contentRaw, image });
  }

  return items;
}

/** Fetch and parse one RSS feed */
async function fetchFeed(rssUrl: string, sourceName: string): Promise<{
  title: string; url: string; date: string; description: string; image: string | null; source: string;
}[]> {
  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SiHiBot/1.0)", Accept: "application/rss+xml, text/xml, */*" },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, sourceName).map((item) => ({ ...item, source: sourceName }));
  } catch {
    return [];
  }
}

// ─── Route ────────────────────────────────────────────────────
export const revalidate = 1800;

export async function GET() {
  try {
    // Fetch song song: nguồn báo chí + nguồn tuyển dụng chuyên biệt
    const [generalResults, trustedResults] = await Promise.all([
      Promise.all(RSS_SOURCES.map((s) => fetchFeed(s.url, s.name))),
      Promise.all(TRUSTED_RECRUITMENT_SOURCES.map((s) => fetchFeed(s.url, s.name))),
    ]);

    const seenUrls = new Set<string>();
    const matched: NewsItem[] = [];

    // ── Nguồn CHUYÊN tuyển dụng: lấy tất cả (viec-lam, nhan-su feed) ──────
    // TopDev là blog IT → vẫn cần lọc từ khóa để bỏ bài không liên quan
    const BLOG_TRUSTED = new Set(["TopDev"]); // Nguồn blog cần check từ khóa
    for (const [i, articles] of trustedResults.entries()) {
      const sourceName = TRUSTED_RECRUITMENT_SOURCES[i].name;
      const isBlog = BLOG_TRUSTED.has(sourceName);
      for (const art of articles) {
        if (seenUrls.has(art.url)) continue;
        // Blog sources (TopDev) cần từ khóa tuyển dụng; feed viec-lam/nhan-su lấy hết
        if (isBlog && !isRecruitmentRelated(art.title)) continue;

        seenUrls.add(art.url);
        const fullText = art.title + " " + art.description;
        const company = detectCompany(fullText) ?? sourceName as NewsItem["company"];
        matched.push({
          id: `trusted-${Buffer.from(art.url).toString("base64").slice(0, 32)}`,
          title: art.title,
          source: art.source,
          date: art.date,
          dateLabel: timeLabel(art.date),
          url: art.url,
          image: art.image,
          company,
        });
      }
    }

    // ── Nguồn báo chí: cần cả tên công ty VÀ từ khóa tuyển dụng ──
    for (const articles of generalResults) {
      for (const art of articles) {
        if (seenUrls.has(art.url)) continue;

        const fullText = art.title + " " + art.description;
        const company = detectCompany(fullText);
        if (!company) continue;

        // Chỉ lấy bài có từ khóa tuyển dụng rõ ràng trong tiêu đề
        if (!isRecruitmentRelated(art.title)) continue;

        seenUrls.add(art.url);
        matched.push({
          id: `${company}-${Buffer.from(art.url).toString("base64").slice(0, 32)}`,
          title: art.title,
          source: art.source,
          date: art.date,
          dateLabel: timeLabel(art.date),
          url: art.url,
          image: art.image,
          company,
        });
      }
    }

    // Sort by date desc, take top 12
    const items = matched
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);

    return NextResponse.json({ items }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
