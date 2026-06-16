import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);
const OTP_HASH_ROUNDS = 12;

/**
 * Tạo mã OTP 6 chữ số ngẫu nhiên.
 */
export function generateOtp(): string {
  const otp = randomInt(100000, 999999);
  return otp.toString().padStart(6, "0");
}

/**
 * Hash mã OTP bằng bcrypt (12 rounds).
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, OTP_HASH_ROUNDS);
}

/**
 * Xác minh mã OTP với hash đã lưu.
 */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Lấy thời điểm hết hạn OTP (mặc định 10 phút kể từ bây giờ).
 */
export function getOtpExpiresAt(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Kiểm tra xem OTP đã hết hạn chưa.
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
