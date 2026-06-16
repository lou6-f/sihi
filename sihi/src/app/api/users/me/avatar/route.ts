import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { saveFile, deleteFile, validateFileType, validateFileSize, sanitizeFileName } from "@/lib/file-storage";

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880"); // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** PUT /api/users/me/avatar — Cập nhật avatar */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) return NextResponse.json({ error: "Vui lòng chọn ảnh" }, { status: 400 });

    // Validate type
    if (!validateFileType(file.type, ALLOWED_TYPES)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ JPG, PNG, WEBP, GIF" }, { status: 400 });
    }

    // Validate size
    if (!validateFileSize(file.size, MAX_SIZE)) {
      return NextResponse.json({ error: "Ảnh tối đa 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = sanitizeFileName(file.name);
    const relativePath = saveFile("avatars", fileName, buffer);

    // Xoá avatar cũ nếu có
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });
    if (user?.avatar && user.avatar.startsWith("avatars/")) {
      deleteFile(user.avatar);
    }

    // Lưu đường dẫn mới
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: relativePath },
      select: { id: true, avatar: true },
    });

    return NextResponse.json({ message: "Cập nhật avatar thành công", avatar: updated.avatar });
  } catch (error) {
    console.error("PUT /api/users/me/avatar error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/users/me/avatar — Xoá avatar */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    if (user?.avatar && user.avatar.startsWith("avatars/")) {
      deleteFile(user.avatar);
    }

    await prisma.user.update({ where: { id: session.user.id }, data: { avatar: null } });
    return NextResponse.json({ message: "Đã xoá avatar" });
  } catch (error) {
    console.error("DELETE /api/users/me/avatar error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
