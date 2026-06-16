import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

  const cvs = await prisma.cV.findMany({
    where: { userId: session.user.id },
    select: { id: true, fileName: true, fileSize: true, mimeType: true, analysis: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cvs);
}
