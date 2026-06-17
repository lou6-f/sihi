"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notVerified, setNotVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotVerified(false);
    setLoading(true);

    const result = await signIn("credentials", {
      email, password, redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED") {
        setNotVerified(true);
      } else {
        setError(result.error);
      }
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="glass border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
          <CardDescription className="text-zinc-400">
            Đăng nhập để bắt đầu luyện phỏng vấn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-red-400">{error}</div>
            )}
            {notVerified && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-300 space-y-1">
                <p className="font-semibold">Email chưa được xác thực</p>
                <p>Vui lòng kiểm tra hộp thư và nhập mã OTP.{" "}
                  <a href={`/verify-email?email=${encodeURIComponent(email)}`} className="underline hover:text-amber-200">
                    Xác thực ngay →
                  </a>
                </p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email" type="email" placeholder="you@example.com"
                  autoComplete="off"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10" required
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu của bạn"
                  autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10" required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Đăng nhập
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-medium text-violet-400 hover:text-violet-300">
              Đăng ký
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
