"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // chỉ nhận số
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // lấy ký tự cuối nếu paste
    setOtp(newOtp);
    setError("");
    // Auto-focus next
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = Array(6).fill("");
    pasted.split("").forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Vui lòng nhập đủ 6 chữ số."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Xác thực thất bại."); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setCooldown(60);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      setError("Không gửi được email. Vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100">Xác thực thành công!</h2>
        <p className="text-zinc-400">Đang chuyển đến trang đăng nhập...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Xác thực email</h1>
            <p className="text-sm text-zinc-400">
              Nhập mã 6 chữ số đã gửi đến
            </p>
            <p className="text-sm font-semibold text-violet-300">{email}</p>
          </div>

          {/* OTP inputs */}
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-zinc-800 text-zinc-100 outline-none transition-all
                  ${error ? "border-red-500" : digit ? "border-violet-500" : "border-zinc-700"}
                  focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {/* Verify button */}
          <Button
            onClick={handleVerify}
            disabled={loading || otp.join("").length !== 6}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-semibold text-white"
          >
            {loading ? "Đang xác thực..." : "Xác thực"}
          </Button>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-2">Không nhận được mã?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-violet-400 hover:text-violet-300 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
            </Button>
          </div>

          {/* Back */}
          <div className="text-center pt-2 border-t border-zinc-800">
            <Link href="/login" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Quay lại đăng nhập
            </Link>
          </div>
        </div>
    </motion.div>
  );
}
