import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const WS_JWT_SECRET = process.env.WS_JWT_SECRET;
const WS_JWT_EXPIRES_IN_SECONDS = parseInt(
  process.env.WS_JWT_EXPIRES_IN_SECONDS || "300",
  10
);

export async function GET() {
  try {
    // Xác thực session NextAuth
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tiếp tục" },
        { status: 401 }
      );
    }

    // Kiểm tra WS_JWT_SECRET
    if (!WS_JWT_SECRET) {
      console.error("[WS-Token] WS_JWT_SECRET chưa được cấu hình");
      return NextResponse.json(
        { error: "Lỗi cấu hình server" },
        { status: 500 }
      );
    }

    // Kiểm tra tài khoản còn hoạt động
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản đã bị vô hiệu hóa" },
        { status: 403 }
      );
    }

    // Tạo JWT token cho WebSocket
    const secret = new TextEncoder().encode(WS_JWT_SECRET);

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
      purpose: "websocket_interview",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${WS_JWT_EXPIRES_IN_SECONDS}s`)
      .sign(secret);

    return NextResponse.json({
      token,
      expiresIn: WS_JWT_EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    console.error("[WS-Token] Lỗi tạo token:", error);
    return NextResponse.json(
      { error: "Không thể tạo token" },
      { status: 500 }
    );
  }
}
