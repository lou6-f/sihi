import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validators";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

  const body = await req.json();
  const { currentPassword, newPassword } = changePasswordSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
  if (!user) return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });

  return NextResponse.json({ message: "Đổi mật khẩu thành công" });
}
