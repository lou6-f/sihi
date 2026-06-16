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
  company: "FPT" | "Viettel" | "VNG";
}

// ─── Vietnamese news RSS sources (have images in feed directly) ─
const RSS_SOURCES = [
  { url: "https://vnexpress.net/rss/kinh-doanh.rss",     name: "VnExpress" },
  { url: "https://vnexpress.net/rss/so-hoa.rss",         name: "VnExpress" },
  { url: "https://cafef.vn/rss/doanh-nghiep.rss",        name: "CafeF" },
  { url: "https://cafef.vn/rss/nhan-su-tuyen-dung.rss",  name: "CafeF" },
  { url: "https://vietnamnet.vn/rss/kinh-doanh.rss",     name: "VietnamNet" },
  { url: "https://baodautu.vn/rss/nhan-su.rss",          name: "Báo Đầu Tư" },
];

// Keywords → company mapping (check in title or description)
const COMPANY_KEYWORDS: { keyword: string; company: NewsItem["company"] }[] = [
  { keyword: "fpt",      company: "FPT" },
  { keyword: "viettel",  company: "Viettel" },
  { keyword: "vng",      company: "VNG" },
  { keyword: "zalo",     company: "VNG" },
  { keyword: "zalopay",  company: "VNG" },
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
    // Fetch all RSS sources in parallel
    const allResults = await Promise.all(
      RSS_SOURCES.map((s) => fetchFeed(s.url, s.name))
    );

    // Flatten and filter by company keywords
    const seenUrls = new Set<string>();
    const matched: NewsItem[] = [];

    for (const articles of allResults) {
      for (const art of articles) {
        if (seenUrls.has(art.url)) continue;

        const company = detectCompany(art.title + " " + art.description);
        if (!company) continue;

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

    // Sort by date desc, take top 10
    const items = matched
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({ items }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
