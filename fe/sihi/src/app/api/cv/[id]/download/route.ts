import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAbsolutePath } from "@/lib/file-storage";
import fs from "fs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cv = await prisma.cV.findFirst({ where: { id, userId: session.user.id } });
  if (!cv) return NextResponse.json({ error: "CV không tồn tại" }, { status: 404 });

  const absolutePath = getAbsolutePath(cv.filePath);
  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: "File không tồn tại trên server" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": cv.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(cv.fileName)}"`,
      "Content-Length": String(cv.fileSize),
    },
  });
}
