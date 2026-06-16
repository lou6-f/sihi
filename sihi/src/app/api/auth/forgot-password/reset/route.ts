import { NextResponse } from "next/server";
import { forgotPasswordResetSchema } from "@/lib/validators";
import { PasswordResetService } from "@/services/password-reset.service";
import { getEmailProvider } from "@/providers/email";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, newPassword } = forgotPasswordResetSchema.parse(body);

    const service = new PasswordResetService(getEmailProvider(), prisma);
    const result = await service.resetPassword({ email, otp, newPassword });

    if (!result.success) {
      return NextResponse.json(
        { error: "Không thể đặt lại mật khẩu. Mã OTP không hợp lệ." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
