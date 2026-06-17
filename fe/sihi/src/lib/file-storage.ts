/**
 * file-storage.ts
 *
 * Dual-mode file storage:
 *  - LOCAL  : fs.writeFileSync — dùng khi LOCAL_STORAGE=true (dev với Docker)
 *  - REMOTE : Supabase Storage — dùng trên Vercel / production
 *
 * Biến môi trường:
 *   LOCAL_STORAGE=true   → ép dùng local fs (mặc định khi không có SUPABASE_URL)
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → tự động dùng Supabase Storage
 */

import fs from "fs";
import path from "path";

// ─── Detect storage mode ──────────────────────────────────────────────────────
const isLocal =
  process.env.LOCAL_STORAGE === "true" ||
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY;

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "sihi-files";

// ─── Local helpers ────────────────────────────────────────────────────────────
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

// ─── saveFile ─────────────────────────────────────────────────────────────────
/**
 * Lưu file vào storage.
 * - LOCAL  : trả về đường dẫn tương đối  (subdir/fileName)
 * - REMOTE : trả về public URL từ Supabase Storage
 */
export async function saveFile(
  subdir: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  if (isLocal) {
    const targetDir = path.join(UPLOAD_DIR, subdir);
    ensureDir(targetDir);
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return path.posix.join(subdir, fileName);
  }

  // Supabase Storage
  const { supabaseAdmin } = await import("./supabase");
  const objectPath = `${subdir}/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

// ─── readFile ─────────────────────────────────────────────────────────────────
/**
 * LOCAL  : trả về absolute path nếu file tồn tại
 * REMOTE : trả về URL (đã là public URL, không cần đọc lại)
 */
export function readFile(relativePath: string): string | null {
  if (isLocal) {
    const fullPath = path.join(UPLOAD_DIR, relativePath);
    return fs.existsSync(fullPath) ? fullPath : null;
  }
  // Với Supabase, filePath đã là public URL
  return relativePath.startsWith("http") ? relativePath : null;
}

// ─── deleteFile ───────────────────────────────────────────────────────────────
export async function deleteFile(relativePath: string): Promise<boolean> {
  if (isLocal) {
    const fullPath = path.join(UPLOAD_DIR, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  // Supabase Storage — relativePath là public URL, cần extract object path
  try {
    const { supabaseAdmin } = await import("./supabase");
    // URL format: .../storage/v1/object/public/<bucket>/<path>
    const urlObj = new URL(relativePath);
    const parts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`);
    if (parts.length < 2) return false;
    const objectPath = parts[1];
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([objectPath]);
    return !error;
  } catch {
    return false;
  }
}

// ─── getAbsolutePath ──────────────────────────────────────────────────────────
/** LOCAL only — remote trả về URL gốc */
export function getAbsolutePath(relativePath: string): string {
  if (isLocal) return path.join(UPLOAD_DIR, relativePath);
  return relativePath; // already a URL
}

// ─── Validators (không đổi) ───────────────────────────────────────────────────
export function validateFileType(mimeType: string, allowed: string[]): boolean {
  return allowed.includes(mimeType.toLowerCase());
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

export function sanitizeFileName(name: string): string {
  const ext = path.extname(name);
  const baseName = path.basename(name, ext);
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9\-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 100);
  return `${Date.now()}_${sanitized}${ext.toLowerCase()}`;
}
