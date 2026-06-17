import type { PrismaClient } from "@prisma/client";
import type { AIProvider, AIResponse } from "@/providers/ai/ai-provider";
import { buildCVAnalyzerPrompt } from "@/prompts/cv-analyzer";
import {
  getCVModuleClient,
  mapFieldToJobTitle,
  mapLevelToExperience,
} from "./cv-module-client";
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
  level?: string;        // Thêm level để cv-module dùng
  jobDescription?: string; // Thêm JD nếu có
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
   * Phân tích CV.
   * Ưu tiên: cv-module (MinerU + KG) → fallback: Gemini trực tiếp
   */
  async analyze(input: CVAnalysisInput): Promise<CVAnalysisResult> {
    // 1. Verify CV belongs to user
    const cv = await this.prisma.cV.findFirst({
      where: { id: input.cvId, userId: input.userId },
    });
    if (!cv) throw new Error("CV không tồn tại hoặc không thuộc về bạn");

    // 2. Read file
    const absolutePath = path.resolve(input.filePath);
    const exists = await fs
      .access(absolutePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) throw new Error("File CV không tồn tại trên server");

    const fileBuffer = await fs.readFile(absolutePath);
    const fileName = path.basename(absolutePath);

    // 3. Thử cv-module trước (có MinerU + KG)
    const cvModuleClient = getCVModuleClient();
    const cvModuleAvailable = await cvModuleClient.isAvailable();

    let analysis: CVAnalysisResult;

    if (cvModuleAvailable) {
      console.log("[CVAnalysis] Using cv-module (MinerU + KG)");
      const jobTitle = mapFieldToJobTitle(input.field);
      const experienceLevel = mapLevelToExperience(input.level ?? "FRESHER");
      const jobDescription = input.jobDescription ?? `Vị trí ${jobTitle} tại công ty IT`;

      const { result } = await cvModuleClient.analyzeAndWait({
        fileBuffer,
        fileName,
        jobTitle,
        jobDescription,
        experienceLevel,
        numQuestions: 10,
        userId: input.userId,
      });
      analysis = result;
      // Lưu session_id để dùng cho evaluation KG sau này
      await this.prisma.cV.update({
        where: { id: input.cvId },
        data: { cvModuleSessionId: sessionId },
      });
    } else {
      // Fallback: Gemini trực tiếp (không có MinerU, không có KG)
      console.log("[CVAnalysis] cv-module not available, falling back to Gemini direct");
      analysis = await this.analyzeWithGemini(fileBuffer, input.field);
    }

    // 4. Lưu vào DB
    await this.prisma.cV.update({
      where: { id: input.cvId },
      data: { analysis: JSON.parse(JSON.stringify(analysis)) },
    });

    return analysis;
  }

  /**
   * Fallback: phân tích CV trực tiếp qua Gemini (pdf-parse → text → AI)
   * Không đọc được PDF scan ảnh, không có KG enrichment.
   */
  private async analyzeWithGemini(
    fileBuffer: Buffer,
    field: string
  ): Promise<CVAnalysisResult> {
    // Extract text via pdf-parse v2
    const { PDFParse } = await import("pdf-parse");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new (PDFParse as any)({ data: new Uint8Array(fileBuffer) });
    await parser.load();
    const cvText: string = await parser.getText();

    if (!cvText || cvText.trim().length < 50) {
      throw new Error(
        "Không thể đọc nội dung CV. Vui lòng đảm bảo file PDF có text (không phải scan ảnh). " +
        "Hoặc khởi động cv-module để hỗ trợ đọc PDF scan ảnh."
      );
    }

    const messages = buildCVAnalyzerPrompt(cvText, field);
    const response: AIResponse = await this.ai.chat(messages, {
      temperature: 0.3,
      responseFormat: "json",
    });

    try {
      return JSON.parse(response.content) as CVAnalysisResult;
    } catch {
      throw new Error("AI trả về kết quả không hợp lệ. Vui lòng thử lại.");
    }
  }
}
