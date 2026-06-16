"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import {
  BrainCircuit, FileText, BookOpen, ArrowRight,
  Sparkles, Mic, BarChart3, ChevronRight,
} from "lucide-react";
import { SiHiLogo } from "@/components/shared/sihi-logo";

const features = [
  {
    icon: BrainCircuit,
    title: "Phỏng vấn AI thông minh",
    description: "AI đặt câu hỏi theo lĩnh vực và cấp độ, đánh giá realtime, phản hồi chi tiết sau mỗi buổi.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: FileText,
    title: "Phân tích CV",
    description: "Tải CV lên để AI phân tích điểm mạnh, điểm yếu và tùy chỉnh câu hỏi phỏng vấn phù hợp.",
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    icon: BookOpen,
    title: "Tài liệu gợi ý",
    description: "Hệ thống RAG tự động gợi ý tài liệu học theo điểm yếu, giúp bạn cải thiện nhanh nhất.",
    gradient: "from-indigo-500 to-blue-600",
  },
];

const stats = [
  { value: "4", label: "Lĩnh vực IT" },
  { value: "3", label: "Cấp độ" },
  { value: "AI", label: "Đánh giá thông minh" },
  { value: "∞", label: "Luyện không giới hạn" },
];

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[120px] animate-float" style={{ animationDelay: "3s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <Link href="/">
          <SiHiLogo iconSize={36} textSize="1.5rem" />
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard">
              <Button className="bg-violet-600 hover:bg-violet-700">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-zinc-300 hover:text-white">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-violet-600 hover:bg-violet-700">Đăng ký</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-20 pb-16 text-center md:pt-32">

        <motion.h1
          className="max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="gradient-text">Tư duy thuật toán</span>
          <br />
          <span className="text-zinc-200">Bản lĩnh phỏng vấn</span>
          <br />
          <span className="gradient-text">Tự tin bứt phá</span>
        </motion.h1>

        <motion.p
          className="mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Luyện phỏng vấn với AI thông minh. Phân tích CV, đánh giá kỹ năng,
          nhận feedback chi tiết và lộ trình cải thiện cá nhân hóa.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link href={session ? "/interview" : "/register"}>
            <Button size="lg" className="gap-2 bg-violet-600 hover:bg-violet-700 text-lg px-8 py-6 animate-pulse-glow">
              <Mic className="h-5 w-5" />
              Bắt đầu phỏng vấn
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-zinc-700 hover:bg-zinc-800">
              Tìm hiểu thêm
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass rounded-2xl p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="mt-1 text-sm text-zinc-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.h2
          className="mb-12 text-center text-3xl font-bold md:text-4xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Tại sao chọn <span className="gradient-text">SiHi</span>?
        </motion.h2>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className="group glass glass-hover cursor-pointer border-0 p-6 transition-all hover:scale-[1.02]">
                <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${f.gradient} p-3`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-zinc-100">{f.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{f.description}</p>
                <div className="mt-4 flex items-center gap-1 text-sm text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Khám phá <ChevronRight className="h-4 w-4" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <motion.h2
          className="mb-12 text-center text-3xl font-bold"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Cách <span className="gradient-text">SiHi</span> hoạt động
        </motion.h2>

        <div className="space-y-8">
          {[
            { step: "01", title: "Tải CV & chọn lĩnh vực", desc: "Tải CV để AI hiểu background. Chọn Frontend, Backend, Data hoặc Fullstack." },
            { step: "02", title: "Phỏng vấn với AI", desc: "AI đặt câu hỏi thông minh, đánh giá realtime từng câu trả lời." },
            { step: "03", title: "Nhận báo cáo chi tiết", desc: "Điểm số, điểm mạnh/yếu, câu trả lời mẫu, tài liệu gợi ý." },
            { step: "04", title: "Cải thiện liên tục", desc: "Theo dõi tiến trình, nhận lộ trình học cá nhân hóa." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="flex gap-6 items-start"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-lg font-bold text-violet-400">
                {item.step}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">{item.title}</h3>
                <p className="mt-1 text-zinc-400">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center">
        <motion.div
          className="glass rounded-3xl p-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-violet-400" />
          <h2 className="text-3xl font-bold">Sẵn sàng bứt phá?</h2>
          <p className="mt-3 text-zinc-400">
            Bắt đầu luyện phỏng vấn ngay hôm nay. Hoàn toàn miễn phí.
          </p>
          <Link href={session ? "/interview" : "/register"}>
            <Button size="lg" className="mt-6 bg-violet-600 hover:bg-violet-700 px-8">
              Bắt đầu ngay <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
        <div className="flex items-center justify-center gap-2">
          <SiHiLogo iconSize={20} textSize="0.875rem" />
          <span>— Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá</span>
        </div>
        <p className="mt-2">© 2026 SiHi. Built with ❤️ for Vietnamese IT students.</p>
      </footer>
    </div>
  );
}
