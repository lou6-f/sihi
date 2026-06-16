import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { saveFile, sanitizeFileName, validateFileType, validateFileSize } from "@/lib/file-storage";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Vui lòng chọn file" }, { status: 400 });

  if (!validateFileType(file.type, ALLOWED_FILE_TYPES)) {
    return NextResponse.json({ error: "Chỉ chấp nhận file PDF" }, { status: 400 });
  }
  if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
    return NextResponse.json({ error: "File không được vượt quá 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const relativePath = await saveFile("cvs", safeName, buffer);

  const cv = await prisma.cV.create({
    data: {
      userId: session.user.id,
      fileName: file.name,
      filePath: relativePath,
      fileSize: file.size,
      mimeType: file.type,
    },
    select: { id: true, fileName: true, fileSize: true, createdAt: true },
  });

  return NextResponse.json({ message: "Tải CV thành công", cv }, { status: 201 });
}
