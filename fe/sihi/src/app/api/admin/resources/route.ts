import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createResourceSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const statusParam = searchParams.get("status");

    const where: Prisma.ResourceWhereInput = {};
    if (statusParam) {
      where.status = statusParam as Prisma.ResourceWhereInput["status"];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.resource.count({ where }),
    ]);

    return NextResponse.json({ resources, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin resources error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data = createResourceSchema.parse(body);

    const resource = await prisma.resource.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as Prisma.ResourceCreateInput["type"],
        url: data.url,
        field: data.field as Prisma.ResourceCreateInput["field"],
        level: data.level as Prisma.ResourceCreateInput["level"],
        status: "PUBLISHED" as Prisma.ResourceCreateInput["status"],
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("Create resource error:", error);
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }
}

/** DELETE /api/admin/resources?status=PENDING_REVIEW — Xóa hàng loạt theo trạng thái */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Prisma.ResourceWhereInput = {};
    if (status) {
      where.status = status as Prisma.ResourceWhereInput["status"];
    }

    const { count } = await prisma.resource.deleteMany({ where });

    return NextResponse.json({ deleted: count, message: `Đã xóa ${count} tài liệu` });
  } catch (error) {
    console.error("Bulk delete resources error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
