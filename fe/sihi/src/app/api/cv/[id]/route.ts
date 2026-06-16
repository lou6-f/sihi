import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteFile } from "@/lib/file-storage";

interface Params { params: Promise<{ id: string }> }

/** GET /api/cv/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    const { id } = await params;
    const cv = await prisma.cV.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, fileName: true, displayName: true, fileSize: true, mimeType: true, orderIndex: true, analysis: true, createdAt: true },
    });
    if (!cv) return NextResponse.json({ error: "Không tìm thấy CV" }, { status: 404 });
    return NextResponse.json(cv);
  } catch (error) {
    console.error("GET /api/cv/[id]:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH /api/cv/[id] — Đổi tên hiển thị hoặc thứ tự */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.cV.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy CV" }, { status: 404 });

    const body = await req.json();
    const updateData: { displayName?: string | null; orderIndex?: number } = {};

    if ("displayName" in body) updateData.displayName = body.displayName || null;
    if (typeof body.orderIndex === "number") updateData.orderIndex = body.orderIndex;

    const cv = await prisma.cV.update({
      where: { id },
      data: updateData,
      select: { id: true, fileName: true, displayName: true, fileSize: true, orderIndex: true, createdAt: true },
    });

    return NextResponse.json({ message: "Cập nhật thành công", cv });
  } catch (error) {
    console.error("PATCH /api/cv/[id]:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/cv/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    const { id } = await params;

    const cv = await prisma.cV.findFirst({ where: { id, userId: session.user.id } });
    if (!cv) return NextResponse.json({ error: "Không tìm thấy CV" }, { status: 404 });

    if (cv.filePath) deleteFile(cv.filePath);
    await prisma.cV.delete({ where: { id } });

    return NextResponse.json({ message: "Đã xoá CV" });
  } catch (error) {
    console.error("DELETE /api/cv/[id]:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
