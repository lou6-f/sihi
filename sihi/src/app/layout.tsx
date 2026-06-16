import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "SiHi — Tư duy thuật toán, bản lĩnh phỏng vấn",
  description:
    "Nền tảng luyện phỏng vấn IT thông minh với AI. Phỏng vấn giả lập, phân tích CV, đánh giá kỹ năng và lộ trình học tập cá nhân hóa.",
  keywords: ["phỏng vấn IT", "luyện phỏng vấn", "AI interview", "SiHi", "tuyển dụng IT"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthSessionProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
