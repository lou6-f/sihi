import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

interface Params { params: Promise<{ id: string }> }

const updateTemplateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  field: z.string().optional(),
  level: z.string().optional(),
  questionCount: z.number().int().min(1).max(30).optional(),
  isActive: z.boolean().optional(),
});

/** GET /api/admin/templates/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const template = await prisma.interviewTemplate.findUnique({
      where: { id },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });

    if (!template) return NextResponse.json({ error: "Không tìm thấy template" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error) {
    console.error("GET /api/admin/templates/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH /api/admin/templates/[id] — Cập nhật template */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const data = updateTemplateSchema.parse(body);

    const template = await prisma.interviewTemplate.update({
      where: { id },
      data: data as unknown as Prisma.InterviewTemplateUpdateInput,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("PATCH /api/admin/templates/[id] error:", error);
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }
}

/** DELETE /api/admin/templates/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.interviewTemplate.delete({ where: { id } });
    return NextResponse.json({ message: "Đã xoá template" });
  } catch (error) {
    console.error("DELETE /api/admin/templates/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
