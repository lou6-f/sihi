import type { PrismaClient } from "@prisma/client";
import type { AIProvider, AIResponse } from "@/providers/ai/ai-provider";
import { buildCVAnalyzerPrompt } from "@/prompts/cv-analyzer";
import fs from "fs/promises";
import path from "path";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface CVAnalysisInput {
  cvId: string;
  userId: string;
  filePath: string;
  field: string;
}

export interface CVAnalysisResult {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  skills: {
    technical: string[];
    soft: string[];
    missing: string[];
  };
  experience: {
    projects: number;
    relevantExperience: string;
    assessment: string;
  };
  suggestions: string[];
  interviewFocus: string[];
  readinessLevel: string;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class CVAnalysisService {
  constructor(
    private ai: AIProvider,
    private prisma: PrismaClient
  ) {}

  /**
   * Parse PDF content and run AI analysis.
   * Can be called from: API route, queue worker, WS server.
   */
  async analyze(input: CVAnalysisInput): Promise<CVAnalysisResult> {
    // 1. Verify CV belongs to user
    const cv = await this.prisma.cV.findFirst({
      where: { id: input.cvId, userId: input.userId },
    });
    if (!cv) throw new Error("CV không tồn tại hoặc không thuộc về bạn");

    // 2. Read PDF file from private storage
    const absolutePath = path.resolve(input.filePath);
    const exists = await fs
      .access(absolutePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) throw new Error("File CV không tồn tại trên server");

    const fileBuffer = await fs.readFile(absolutePath);

    // 3. Extract text via pdf-parse v2
    const { PDFParse } = await import("pdf-parse");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new (PDFParse as any)({ data: new Uint8Array(fileBuffer) });
    await parser.load();
    const cvText: string = await parser.getText();

    if (!cvText || cvText.trim().length < 50) {
      throw new Error(
        "Không thể đọc nội dung CV. Vui lòng đảm bảo file PDF có text (không phải scan ảnh)."
      );
    }

    // 4. Call AI with cv-analyzer prompt
    const messages = buildCVAnalyzerPrompt(cvText, input.field);
    const response: AIResponse = await this.ai.chat(messages, {
      temperature: 0.3,
      responseFormat: "json",
    });

    // 5. Parse structured response
    let analysis: CVAnalysisResult;
    try {
      analysis = JSON.parse(response.content);
    } catch {
      throw new Error("AI trả về kết quả không hợp lệ. Vui lòng thử lại.");
    }

    // 6. Update CV.analysis in DB
    await this.prisma.cV.update({
      where: { id: input.cvId },
      data: { analysis: JSON.parse(JSON.stringify(analysis)) },
    });

    return analysis;
  }
}
