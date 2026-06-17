"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Mail, Lock, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// ─── Validation rules ─────────────────────────────────────────

function validateName(v: string) {
  if (!v) return "Vui lòng nhập họ và tên";
  if (v.trim().length < 2) return "Tên phải có ít nhất 2 ký tự";
  if (v.trim().length > 100) return "Tên không được quá 100 ký tự";
  return "";
}

function validateEmail(v: string) {
  if (!v) return "Vui lòng nhập email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email không hợp lệ (ví dụ: you@gmail.com)";
  return "";
}

const pwdRules = [
  { label: "Ít nhất 8 ký tự", test: (v: string) => v.length >= 8 },
  { label: "Có ít nhất 1 chữ HOA (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Có ít nhất 1 chữ số (0-9)", test: (v: string) => /[0-9]/.test(v) },
];

function validatePassword(v: string) {
  if (!v) return "Vui lòng nhập mật khẩu";
  for (const rule of pwdRules) {
    if (!rule.test(v)) return rule.label + " — chưa đáp ứng";
  }
  return "";
}

function validateConfirm(v: string, pwd: string) {
  if (!v) return "Vui lòng xác nhận mật khẩu";
  if (v !== pwd) return "Mật khẩu xác nhận không khớp";
  return "";
}

// ─── Component ───────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const touch = (key: keyof typeof touched) => () =>
    setTouched((t) => ({ ...t, [key]: true }));

  const errors = {
    name: touched.name ? validateName(form.name) : "",
    email: touched.email ? validateEmail(form.email) : "",
    password: touched.password ? validatePassword(form.password) : "",
    confirmPassword: touched.confirmPassword ? validateConfirm(form.confirmPassword, form.password) : "",
  };

  const isValid =
    !validateName(form.name) &&
    !validateEmail(form.email) &&
    !validatePassword(form.password) &&
    !validateConfirm(form.confirmPassword, form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!isValid) return;

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), email: form.email, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      // Email tồn tại nhưng chưa verify → redirect sang trang xác thực
      if (res.status === 409 && data.needsVerification) {
        toast.info("Email này đã đăng ký. Đang chuyển đến trang xác thực...");
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
      setServerError(data.error || "Đăng ký thất bại, vui lòng thử lại");
      return;
    }

    toast.success("Đăng ký thành công! Kiểm tra email để lấy mã xác thực.");
    router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="glass border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Đăng ký</CardTitle>
          <CardDescription className="text-zinc-400">Tạo tài khoản SiHi miễn phí</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            {/* Họ và tên */}
            <div className="space-y-1">
              <Label htmlFor="name">Họ và tên</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="name"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={set("name")}
                  onBlur={touch("name")}
                  className={`pl-10 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
              {errors.name && <p className="text-xs text-red-400">⚠ {errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  onBlur={touch("email")}
                  className={`pl-10 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">⚠ {errors.email}</p>}
            </div>

            {/* Mật khẩu */}
            <div className="space-y-1">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ví dụ: Long@2024"
                  value={form.password}
                  onChange={set("password")}
                  onBlur={touch("password")}
                  className={`pl-10 pr-10 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
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
              {/* Password strength checklist */}
              {(touched.password || form.password) && (
                <ul className="mt-1 space-y-0.5">
                  {pwdRules.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-400" : "text-zinc-500"}`}>
                        {ok
                          ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                          : <XCircle className="h-3 w-3 shrink-0 text-red-400" />}
                        <span className={!ok ? "text-red-400" : ""}>{rule.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  onBlur={touch("confirmPassword")}
                  className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-400">⚠ {errors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Đăng ký
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
