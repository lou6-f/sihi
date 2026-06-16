import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { InterviewField, InterviewLevel } from "@prisma/client";

const createTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  field: z.string(),
  level: z.string(),
  questionCount: z.number().int().min(1).max(30).default(10),
  isActive: z.boolean().default(true),
});

/** GET /api/admin/templates — Danh sách template phỏng vấn */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const field = searchParams.get("field");
    const level = searchParams.get("level");

    const templates = await prisma.interviewTemplate.findMany({
      where: {
        ...(field ? { field: field as InterviewField } : {}),
        ...(level ? { level: level as InterviewLevel } : {}),
      },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/admin/templates error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/admin/templates — Tạo template mới */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data = createTemplateSchema.parse(body);

    const template = await prisma.interviewTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        field: data.field as InterviewField,
        level: data.level as InterviewLevel,
        questionCount: data.questionCount,
        isActive: data.isActive,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/templates error:", error);
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }
}
