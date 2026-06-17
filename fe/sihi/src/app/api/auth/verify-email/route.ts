import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp || typeof otp !== "string" || otp.length !== 6) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Email không tồn tại" }, { status: 404 });

    if (user.emailVerified) {
      return NextResponse.json({ error: "Tài khoản đã được xác thực" }, { status: 409 });
    }

    // Find latest unused OTP for this email
    const record = await prisma.emailVerificationOtp.findFirst({
      where: { email: email.toLowerCase(), usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "Mã OTP không tồn tại. Hãy yêu cầu gửi lại." }, { status: 404 });
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: "Mã OTP đã hết hạn. Hãy yêu cầu gửi lại." }, { status: 410 });
    }

    // Check attempt limit
    if (record.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Đã nhập sai quá nhiều lần. Hãy yêu cầu gửi lại mã." }, { status: 429 });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      await prisma.emailVerificationOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - record.attempts - 1;
      return NextResponse.json(
        { error: `Mã OTP không đúng. Còn ${remaining} lần thử.` },
        { status: 400 }
      );
    }

    // Mark OTP as used + verify user — atomic
    await prisma.$transaction([
      prisma.emailVerificationOtp.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
    ]);

    return NextResponse.json({ message: "Xác thực email thành công! Bạn có thể đăng nhập." });
  } catch (err) {
    console.error("[verify-email] error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống. Vui lòng thử lại." }, { status: 500 });
  }
}
