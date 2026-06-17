import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getEmailProvider } from "@/providers/email";
import { verifyOtpEmailHtml, verifyOtpEmailText } from "@/lib/email-templates/verify-otp";

const COOLDOWN_SECONDS = 60;
const OTP_EXPIRE_MINUTES = 15;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Thiếu email" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Email không tồn tại" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ error: "Tài khoản đã được xác thực" }, { status: 409 });

    // Cooldown: không gửi lại trong 60s
    const recent = await prisma.emailVerificationOtp.findFirst({
      where: { email: email.toLowerCase(), usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsSince < COOLDOWN_SECONDS) {
        const wait = Math.ceil(COOLDOWN_SECONDS - secondsSince);
        return NextResponse.json({ error: `Vui lòng chờ ${wait} giây trước khi gửi lại.` }, { status: 429 });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

    await prisma.emailVerificationOtp.create({
      data: { userId: user.id, email: email.toLowerCase(), otpHash, expiresAt },
    });

    const emailProvider = getEmailProvider();
    await emailProvider.sendEmail({
      to: email,
      subject: `${otp} — Mã xác thực SiHi của bạn`,
      html: verifyOtpEmailHtml(otp, user.name),
      text: verifyOtpEmailText(otp, user.name),
    });

    return NextResponse.json({ message: "Đã gửi mã xác thực về email của bạn." });
  } catch (err) {
    console.error("[resend-verification] error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống. Vui lòng thử lại." }, { status: 500 });
  }
}
