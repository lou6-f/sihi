import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

/**
 * Đảm bảo thư mục tồn tại, tạo đệ quy nếu chưa có.
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Lưu file vào UPLOAD_DIR/subdir/fileName.
 * Trả về đường dẫn tương đối (subdir/fileName).
 */
export function saveFile(
  subdir: string,
  fileName: string,
  buffer: Buffer
): string {
  const targetDir = path.join(UPLOAD_DIR, subdir);
  ensureDir(targetDir);

  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return path.join(subdir, fileName);
}

/**
 * Đọc file từ đường dẫn tương đối.
 * Trả về đường dẫn tuyệt đối nếu file tồn tại, null nếu không.
 */
export function readFile(relativePath: string): string | null {
  const fullPath = getAbsolutePath(relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fullPath;
}

/**
 * Xoá file từ đường dẫn tương đối nếu tồn tại.
 */
export function deleteFile(relativePath: string): boolean {
  const fullPath = getAbsolutePath(relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
}

/**
 * Lấy đường dẫn tuyệt đối từ đường dẫn tương đối.
 */
export function getAbsolutePath(relativePath: string): string {
  return path.join(UPLOAD_DIR, relativePath);
}

/**
 * Kiểm tra loại file có hợp lệ không.
 */
export function validateFileType(
  mimeType: string,
  allowed: string[]
): boolean {
  return allowed.includes(mimeType.toLowerCase());
}

/**
 * Kiểm tra kích thước file có hợp lệ không.
 * @param size Kích thước file tính bằng byte
 * @param maxSize Giới hạn tối đa tính bằng byte
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Làm sạch tên file: loại bỏ ký tự đặc biệt, thêm timestamp prefix.
 */
export function sanitizeFileName(name: string): string {
  // Lấy phần extension
  const ext = path.extname(name);
  const baseName = path.basename(name, ext);

  // Loại bỏ ký tự đặc biệt, chỉ giữ chữ cái, số, dấu gạch ngang, gạch dưới
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9\-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 100);

  const timestamp = Date.now();
  return `${timestamp}_${sanitized}${ext.toLowerCase()}`;
}
