import { NextResponse } from "next/server";
import { forgotPasswordVerifySchema } from "@/lib/validators";
import { PasswordResetService } from "@/services/password-reset.service";
import { getEmailProvider } from "@/providers/email";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = forgotPasswordVerifySchema.parse(body);

    const service = new PasswordResetService(getEmailProvider(), prisma);
    const result = await service.verifyOtp({ email, otp });

    if (!result.valid) {
      return NextResponse.json(
        {
          error: "Mã OTP không đúng hoặc đã hết hạn",
          attemptsRemaining: result.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Xác thực OTP thành công",
      valid: true,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
