import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await _req.json();
  const { isActive } = body;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Không thể thay đổi trạng thái tài khoản của chính bạn" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: Boolean(isActive) },
    select: { id: true, email: true, isActive: true },
  });

  return NextResponse.json(user);
}
