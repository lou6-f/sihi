import type { PrismaClient } from "@prisma/client";
import type { EmailProvider } from "@/providers/email/email-provider";
import { generateOtp, hashOtp, verifyOtp, getOtpExpiresAt, isOtpExpired } from "@/lib/otp";

// ═══════════════════════════════════════
// Service
// ═══════════════════════════════════════

export class EmailVerificationService {
  private otpExpiryMinutes: number;
  private otpMaxAttempts: number;

  constructor(
    private emailProvider: EmailProvider,
    private prisma: PrismaClient
  ) {
    this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
    this.otpMaxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
  }

  /**
   * Send verification OTP to user's email.
   */
  async sendVerificationOtp(input: {
    userId: string;
  }): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) throw new Error("Người dùng không tồn tại");
    if (user.emailVerified) return { sent: false }; // Already verified

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = getOtpExpiresAt();

    // Reuse PasswordResetOtp model for email verification
    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        email: user.email,
        otpHash,
        expiresAt,
      },
    });

    await this.emailProvider.sendEmail({
      to: user.email,
      subject: "SiHi - Xác thực email của bạn",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #7C3AED;">SiHi</h2>
          <p>Xin chào ${user.name},</p>
          <p>Mã xác thực email của bạn là:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7C3AED; background: #F5F3FF; padding: 16px 24px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666;">Mã này có hiệu lực trong ${this.otpExpiryMinutes} phút.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">SiHi — Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá</p>
        </div>
      `,
      text: `Mã xác thực email SiHi: ${otp}. Mã này có hiệu lực trong ${this.otpExpiryMinutes} phút.`,
    });

    return { sent: true };
  }

  /**
   * Verify email with OTP.
   */
  async verifyEmail(input: {
    userId: string;
    otp: string;
  }): Promise<{ verified: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) throw new Error("Người dùng không tồn tại");
    if (user.emailVerified) return { verified: true };

    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) return { verified: false };
    if (isOtpExpired(otpRecord.expiresAt)) return { verified: false };
    if (otpRecord.attempts >= this.otpMaxAttempts) return { verified: false };

    await this.prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    const isValid = await verifyOtp(input.otp, otpRecord.otpHash);
    if (!isValid) return { verified: false };

    // Mark email as verified + mark OTP as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
      this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { verified: true };
  }
}
