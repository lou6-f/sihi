import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const suggestions = await prisma.aiResourceSuggestion.findMany({
    where: { userId: session.user.id },
    include: { resource: { select: { id: true, title: true, url: true, type: true, field: true, level: true } } },
    orderBy: { relevanceScore: "desc" },
    take: 10,
  });

  return NextResponse.json(suggestions);
}
