import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CVAnalysisService } from "@/services/cv-analysis.service";
import { getAIProvider } from "@/providers/ai";
import prisma from "@/lib/prisma";
import { z } from "zod";

const analyzeSchema = z.object({
  cvId: z.string().min(1),
  field: z.enum(["FRONTEND", "BACKEND", "DATA", "FULLSTACK"]),
});

export async function POST(req: Request) {
  try {
    // 1. Auth (thin controller)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    // 2. Parse & validate
    const body = await req.json();
    const { cvId, field } = analyzeSchema.parse(body);

    // 3. Get CV
    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId: session.user.id },
    });
    if (!cv) {
      return NextResponse.json(
        { error: "CV không tồn tại" },
        { status: 404 }
      );
    }

    // 4. Delegate to service
    const service = new CVAnalysisService(getAIProvider(), prisma);
    const result = await service.analyze({
      cvId,
      userId: session.user.id,
      filePath: cv.filePath,
      field,
    });

    // 5. Return
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.issues },
        { status: 400 }
      );
    }

    console.error("CV analysis error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Lỗi phân tích CV. Vui lòng thử lại.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
