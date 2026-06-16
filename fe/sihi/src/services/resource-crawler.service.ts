import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";
import {
  buildResourceClassifierPrompt,
  buildResourceSummarizerPrompt,
} from "@/prompts/resource-crawler";
import * as cheerio from "cheerio";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface CrawlResourceInput {
  url: string;
  adminId: string;
}

export interface CrawlResourceResult {
  resourceId: string;
  title: string;
  field: string;
  level: string;
  status: string;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class ResourceCrawlerService {
  constructor(
    private ai: AIProvider,
    private prisma: PrismaClient
  ) {}

  /**
   * Crawl URL → clean content → AI classify + summarize → save to DB.
   * Queue-ready: input is just URL + adminId.
   */
  async crawl(input: CrawlResourceInput): Promise<CrawlResourceResult> {
    const { url, adminId } = input;

    // 1. Check if URL already crawled
    const existingSource = await this.prisma.resourceSource.findUnique({
      where: { url },
    });
    if (existingSource) {
      throw new Error("URL này đã được thêm trước đó");
    }

    // 2. Fetch page content
    const response = await fetch(url, {
      headers: { "User-Agent": "SiHi Resource Crawler/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Không thể truy cập URL: HTTP ${response.status}`);
    }

    const html = await response.text();

    // 3. Clean content with cheerio
    const $ = cheerio.load(html);

    // Remove unnecessary elements
    $("script, style, nav, footer, header, iframe, noscript").remove();
    $('[class*="sidebar"], [class*="menu"], [class*="comment"]').remove();

    const rawTitle = $("title").text().trim() || $("h1").first().text().trim();
    const rawContent =
      $("article").text().trim() ||
      $("main").text().trim() ||
      $("body").text().trim();

    // Clean whitespace
    const cleanedContent = rawContent
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleanedContent.length < 100) {
      throw new Error(
        "Nội dung trang quá ngắn hoặc không thể đọc được"
      );
    }

    // 4. Get domain
    const domain = new URL(url).hostname;

    // 5. Save resource source
    const source = await this.prisma.resourceSource.create({
      data: {
        url,
        domain,
        rawContent: html.slice(0, 50000),
        cleanedContent: cleanedContent.slice(0, 50000),
        metadata: { title: rawTitle, fetchedAt: new Date().toISOString() },
      },
    });

    // 6. AI classify
    const classifyMessages = buildResourceClassifierPrompt(
      rawTitle,
      cleanedContent
    );
    const classifyResponse = await this.ai.chat(classifyMessages, {
      temperature: 0.2,
      responseFormat: "json",
    });

    let classification;
    try {
      classification = JSON.parse(classifyResponse.content);
    } catch {
      classification = {
        title: rawTitle,
        summary: cleanedContent.slice(0, 200),
        type: "ARTICLE",
        field: "FULLSTACK",
        level: "BEGINNER",
        tags: [],
      };
    }

    // 7. AI summarize
    const summaryMessages = buildResourceSummarizerPrompt(cleanedContent);
    const summaryResponse = await this.ai.chat(summaryMessages, {
      temperature: 0.3,
      responseFormat: "json",
    });

    let summary;
    try {
      summary = JSON.parse(summaryResponse.content);
    } catch {
      summary = { summary: cleanedContent.slice(0, 300) };
    }

    // 8. Create resource
    const resource = await this.prisma.resource.create({
      data: {
        title: classification.title || rawTitle,
        description: summary.summary || classification.summary,
        type: classification.type || "ARTICLE",
        url,
        field: classification.field || "FULLSTACK",
        level: classification.level || "BEGINNER",
        summary: summary.summary,
        status: "PENDING_REVIEW",
        createdBy: adminId,
        isAiGenerated: true,
        sourceId: source.id,
      },
    });

    // 9. Create tags
    if (classification.tags && classification.tags.length > 0) {
      await this.prisma.resourceTag.createMany({
        data: classification.tags.map((tag: string) => ({
          resourceId: resource.id,
          tag: tag.toLowerCase(),
        })),
      });
    }

    return {
      resourceId: resource.id,
      title: resource.title,
      field: resource.field,
      level: resource.level,
      status: resource.status,
    };
  }
}
