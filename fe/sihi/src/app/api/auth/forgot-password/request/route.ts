import { NextResponse } from "next/server";
import { forgotPasswordRequestSchema } from "@/lib/validators";
import { PasswordResetService } from "@/services/password-reset.service";
import { getEmailProvider } from "@/providers/email";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordRequestSchema.parse(body);

    const service = new PasswordResetService(getEmailProvider(), prisma);
    const result = await service.requestOtp({ email });

    // Always return success (privacy — never reveal if email exists)
    return NextResponse.json({
      message: "Nếu email tồn tại, mã OTP đã được gửi.",
      sent: result.sent,
    });
  } catch (error) {
    console.error("Forgot password request error:", error);
    return NextResponse.json(
      { message: "Nếu email tồn tại, mã OTP đã được gửi.", sent: true },
      { status: 200 }
    );
  }
}
