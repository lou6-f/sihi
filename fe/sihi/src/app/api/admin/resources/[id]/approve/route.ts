import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResourceStatus } from "@prisma/client";

interface Params { params: Promise<{ id: string }> }

/** POST /api/admin/resources/[id]/approve — Duyệt resource */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const resource = await prisma.resource.findUnique({ where: { id } });

    if (!resource) return NextResponse.json({ error: "Không tìm thấy resource" }, { status: 404 });
    if (resource.status === "PUBLISHED")
      return NextResponse.json({ error: "Resource đã được duyệt" }, { status: 400 });

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        status: ResourceStatus.PUBLISHED,
      },
    });

    return NextResponse.json({ message: "Đã duyệt resource", resource: updated });
  } catch (error) {
    console.error("POST /api/admin/resources/[id]/approve error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/admin/resources/[id]/approve — Huỷ duyệt (đưa về PENDING) */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const updated = await prisma.resource.update({
      where: { id },
      data: { status: ResourceStatus.PENDING_REVIEW },
    });

    return NextResponse.json({ message: "Đã huỷ duyệt", resource: updated });
  } catch (error) {
    console.error("DELETE /api/admin/resources/[id]/approve error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
