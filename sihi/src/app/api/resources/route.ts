import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field");
  const level = searchParams.get("level");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (field) where.field = field;
  if (level) where.level = level;
  if (search) where.OR = [
    { title: { contains: search, mode: "insensitive" } },
    { description: { contains: search, mode: "insensitive" } },
  ];

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where: where as never,
      select: {
        id: true, title: true, description: true, type: true, url: true,
        field: true, level: true, summary: true, createdAt: true,
        tags: { select: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.resource.count({ where: where as never }),
  ]);

  return NextResponse.json({ resources, total, page, totalPages: Math.ceil(total / limit) });
}
