import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "@/providers/ai/ai-provider";
import type { EmailProvider } from "@/providers/email/email-provider";
import { generateOtp, hashOtp, verifyOtp, getOtpExpiresAt, isOtpExpired } from "@/lib/otp";
import bcrypt from "bcryptjs";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface RequestOtpInput {
  email: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class PasswordResetService {
  private otpExpiryMinutes: number;
  private otpMaxAttempts: number;
  private otpRateLimitSeconds: number;

  constructor(
    private emailProvider: EmailProvider,
    private prisma: PrismaClient
  ) {
    this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
    this.otpMaxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
    this.otpRateLimitSeconds = parseInt(
      process.env.OTP_RATE_LIMIT_SECONDS || "60",
      10
    );
  }

  /**
   * Step 1: Request OTP. Sends email with 6-digit code.
   * NEVER reveals whether the email exists.
   */
  async requestOtp(input: RequestOtpInput): Promise<{ sent: boolean }> {
    const { email } = input;

    // Find user (but don't reveal to caller)
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, isActive: true, name: true },
    });

    // Even if user doesn't exist, return success (privacy)
    if (!user || !user.isActive) {
      return { sent: true };
    }

    // Rate limit: check last OTP request
    const lastOtp = await this.prisma.passwordResetOtp.findFirst({
      where: { email: user.email },
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp) {
      const elapsed =
        (Date.now() - lastOtp.createdAt.getTime()) / 1000;
      if (elapsed < this.otpRateLimitSeconds) {
        return { sent: true }; // Silently throttle
      }
    }

    // Generate OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = getOtpExpiresAt();

    // Save to DB
    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        email: user.email,
        otpHash,
        expiresAt,
      },
    });

    // Send email
    await this.emailProvider.sendEmail({
      to: user.email,
      subject: "SiHi - Mã xác nhận đặt lại mật khẩu",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #7C3AED;">SiHi</h2>
          <p>Xin chào ${user.name},</p>
          <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7C3AED; background: #F5F3FF; padding: 16px 24px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666;">Mã này có hiệu lực trong ${this.otpExpiryMinutes} phút.</p>
          <p style="color: #666;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">SiHi — Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá</p>
        </div>
      `,
      text: `Mã xác nhận đặt lại mật khẩu SiHi: ${otp}. Mã này có hiệu lực trong ${this.otpExpiryMinutes} phút.`,
    });

    return { sent: true };
  }

  /**
   * Step 2: Verify OTP.
   */
  async verifyOtp(
    input: VerifyOtpInput
  ): Promise<{ valid: boolean; attemptsRemaining: number }> {
    const { email, otp } = input;

    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return { valid: false, attemptsRemaining: 0 };
    }

    // Check expiry
    if (isOtpExpired(otpRecord.expiresAt)) {
      return { valid: false, attemptsRemaining: 0 };
    }

    // Check max attempts
    if (otpRecord.attempts >= this.otpMaxAttempts) {
      return { valid: false, attemptsRemaining: 0 };
    }

    // Increment attempts
    await this.prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify OTP
    const isValid = await verifyOtp(otp, otpRecord.otpHash);
    const attemptsRemaining = Math.max(
      0,
      this.otpMaxAttempts - otpRecord.attempts - 1
    );

    return { valid: isValid, attemptsRemaining };
  }

  /**
   * Step 3: Reset password.
   */
  async resetPassword(
    input: ResetPasswordInput
  ): Promise<{ success: boolean }> {
    const { email, otp, newPassword } = input;

    // Verify OTP one more time
    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) return { success: false };
    if (isOtpExpired(otpRecord.expiresAt)) return { success: false };
    if (otpRecord.attempts >= this.otpMaxAttempts) return { success: false };

    const isValid = await verifyOtp(otp, otpRecord.otpHash);
    if (!isValid) return { success: false };

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password + mark OTP as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }
}
