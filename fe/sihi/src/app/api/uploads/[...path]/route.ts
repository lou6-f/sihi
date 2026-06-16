import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/file-storage";
import fs from "fs";
import path from "path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");

  // Chặn path traversal
  if (relativePath.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const absolutePath = readFile(relativePath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const mimeType = MIME[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(absolutePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
