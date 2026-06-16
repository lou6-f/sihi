import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validators";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, name: true, avatar: true,
      school: true, major: true, yearOfStudy: true, itField: true,
      role: true, emailVerified: true, createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const body = await req.json();
  const data = updateProfileSchema.parse(body);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true, email: true, name: true, school: true,
      major: true, yearOfStudy: true, itField: true,
    },
  });

  return NextResponse.json({ message: "Cập nhật thành công", user });
}
