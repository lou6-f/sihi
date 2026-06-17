import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }> }

/** POST /api/admin/templates/[id]/toggle — Đảo trạng thái isActive */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Lấy giá trị hiện tại rồi đảo ngược
    const current = await prisma.interviewTemplate.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!current)
      return NextResponse.json({ error: "Không tìm thấy template" }, { status: 404 });

    const updated = await prisma.interviewTemplate.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: { id: true, isActive: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/admin/templates/[id]/toggle error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
