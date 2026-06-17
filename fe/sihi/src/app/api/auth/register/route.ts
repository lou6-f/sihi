import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getEmailProvider } from "@/providers/email";
import { verifyOtpEmailHtml, verifyOtpEmailText } from "@/lib/email-templates/verify-otp";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      // Nếu đã tồn tại nhưng chưa verify → cho phép gửi lại OTP
      if (!existing.emailVerified) {
        return NextResponse.json(
          { error: "Email này đã đăng ký nhưng chưa xác thực. Hãy kiểm tra hộp thư để lấy mã.", needsVerification: true },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
    }

    // Hash password + create user
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        password: hashedPassword,
        role: "USER",
        emailVerified: false,
      },
      select: { id: true, email: true, name: true },
    });

    // Tạo OTP 6 số và gửi email
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await prisma.emailVerificationOtp.create({
      data: { userId: user.id, email: user.email, otpHash, expiresAt },
    });

    // Gửi email (không block nếu lỗi email)
    try {
      const emailProvider = getEmailProvider();
      await emailProvider.sendEmail({
        to: user.email,
        subject: `${otp} — Mã xác thực SiHi của bạn`,
        html: verifyOtpEmailHtml(otp, user.name),
        text: verifyOtpEmailText(otp, user.name),
      });
    } catch (emailErr) {
      console.error("[register] Không gửi được email:", emailErr);
      // Vẫn trả về thành công — user đã tạo, OTP đã lưu
    }

    return NextResponse.json(
      { message: "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác thực.", email: user.email },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zodError = error as any;
      const firstMessage = zodError.errors?.[0]?.message || "Dữ liệu không hợp lệ";
      return NextResponse.json({ error: firstMessage }, { status: 400 });
    }

    console.error("Register error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống. Vui lòng thử lại sau." }, { status: 500 });
  }
}
