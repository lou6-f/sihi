"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, TrendingUp, Clock, Flame, Play, BarChart3 } from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = { FRONTEND: "Frontend", BACKEND: "Backend", DATA: "Data", FULLSTACK: "Fullstack" };

const READINESS_LABELS: Record<string, { label: string; color: string }> = {
  EXCELLENT:      { label: "Xuất sắc",       color: "bg-emerald-500/20 text-emerald-300" },
  READY:          { label: "Sẵn sàng",        color: "bg-green-500/20 text-green-300"    },
  GOOD:           { label: "Khá",             color: "bg-blue-500/20 text-blue-300"      },
  NEEDS_PRACTICE: { label: "Cần ôn luyện",  color: "bg-yellow-500/20 text-yellow-300"  },
  NOT_READY:      { label: "Chưa sẵn sàng", color: "bg-red-500/20 text-red-300"        },
};

const SKILL_NAME_VI: Record<string, string> = {
  dim_technicalKnowledge: "Kiến thức kỹ thuật", dim_problemSolving: "Tư duy giải quyết vấn đề",
  dim_practicalExperience: "Kinh nghiệm thực tế", dim_communication: "Khả năng trình bày",
  dim_learningAbility: "Khả năng học hỏi", dim_confidence: "Tự tin",
  dim_teamwork: "Làm việc nhóm", dim_initiative: "Tinh thần chủ động",
  dim_reasoningAbility: "Tư duy lập luận", dim_projectExperience: "Kinh nghiệm dự án",
  technicalKnowledge: "Kiến thức kỹ thuật", problemSolving: "Tư duy giải quyết vấn đề",
  practicalExperience: "Kinh nghiệm thực tế", communication: "Khả năng trình bày",
  learningAbility: "Khả năng học hỏi", confidence: "Tự tin",
  teamwork: "Làm việc nhóm", initiative: "Tinh thần chủ động",
};

function translateSuggestion(raw: string): string {
  return raw.replace(/dim_[a-zA-Z]+|[a-zA-Z][a-zA-Z]+(?=[,. ]|$)/g, (m) => SKILL_NAME_VI[m] || m);
}

/** Tính số ngày hoạt động liên tiếp (streak) từ danh sách phỏng vấn */
function calcStreak(interviews: Interview[]): number {
  if (!interviews.length) return 0;
  const days = new Set(interviews.map((iv) => new Date(iv.createdAt).toDateString()));
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// ─── Types ──────────────────────────────────────────────────────
interface Interview { id: string; field: string; level: string; status: string; totalScore: number | null; createdAt: string; }
interface ProgressSnapshot { overallScore: number; readinessLevel: string; suggestion: string; totalInterviews: number; }
interface NewsItem {
  id: string; title: string; source: string; date: string; dateLabel: string;
  url: string; image: string | null; company: "FPT" | "Viettel" | "VNG";
}

const COMPANY_COLOR: Record<string, string> = {
  FPT: "bg-orange-500/20 text-orange-300",
  Viettel: "bg-red-500/20 text-red-300",
  VNG: "bg-blue-500/20 text-blue-300",
};

// ─── Stat tile ──────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, sub, iconColor, delay }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  iconColor: string; delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="glass border-0">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`rounded-xl p-3 ${iconColor}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [allInterviews, setAllInterviews] = useState<Interview[]>([]);
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/interviews?limit=30").then((r) => r.json()),
      fetch("/api/analytics/progress").then((r) => r.json()),
    ]).then(([intData, progData]) => {
      const all: Interview[] = intData.interviews || [];
      setAllInterviews(all);
      setInterviews(all.slice(0, 5));
      setTotal(intData.total ?? all.length);
      setProgress(progData.latest || null);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Fetch real recruitment news
    fetch("/api/news/recruitment")
      .then((r) => r.json())
      .then((data) => { setNews(data.items || []); setNewsLoading(false); })
      .catch(() => setNewsLoading(false));
  }, []);

  const streak = calcStreak(allInterviews);
  // Ưu tiên dùng analytics API, fallback tính thẳng từ interviews
  const scoredInterviews = allInterviews.filter((iv) => iv.totalScore !== null && iv.totalScore > 0);
  const directAvg = scoredInterviews.length
    ? Math.round(scoredInterviews.reduce((s, iv) => s + (iv.totalScore ?? 0), 0) / scoredInterviews.length)
    : null;
  const avgScore = progress?.overallScore ?? directAvg;
  const readiness = progress ? READINESS_LABELS[progress.readinessLevel] : null;
  const firstName = session?.user?.name?.split(" ").pop() || "bạn";

  return (
    <div className="space-y-6">

      {/* ── Hero CTA ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Gradient border: wrapper tím bao quanh card */}
        <div className="rounded-xl p-[2px] bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500">
          <div className="rounded-[10px] bg-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div>
              <h1 className="text-2xl font-bold">
                Xin chào, <span className="gradient-text">{firstName}</span> 👋
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                {total === 0
                  ? "Bắt đầu buổi phỏng vấn AI đầu tiên của bạn!"
                  : `Bạn đã hoàn thành ${total} phỏng vấn. Tiếp tục luyện tập nhé!`}
              </p>
            </div>
            <Link href="/interview" className="shrink-0">
              <Button className="bg-violet-600 hover:bg-violet-700 gap-2 px-6 h-11">
                <Play className="h-4 w-4 fill-white" />
                Bắt đầu phỏng vấn
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Stat tiles ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <StatTile
              icon={BrainCircuit}
              label="Tổng phỏng vấn"
              value={total}
              sub={total === 0 ? "Chưa có buổi nào" : `${allInterviews.filter(iv => iv.status === "COMPLETED").length} hoàn thành`}
              iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
              delay={0.1}
            />
            <StatTile
              icon={BarChart3}
              label="Điểm trung bình"
              value={avgScore != null ? `${avgScore}đ` : "—"}
              sub={
                readiness ? readiness.label
                : avgScore != null ? (avgScore >= 80 ? "Xuất sắc" : avgScore >= 65 ? "Khá" : avgScore >= 50 ? "Cần ôn luyện" : "Chưa sẵn sàng")
                : "Chưa có dữ liệu"
              }
              iconColor="bg-gradient-to-br from-fuchsia-500 to-pink-600"
              delay={0.2}
            />
            <StatTile
              icon={Flame}
              label="Chuỗi ngày luyện"
              value={streak > 0 ? `${streak} ngày` : "—"}
              sub={streak > 0 ? "Duy trì chuỗi nhé!" : "Hôm nay chưa luyện"}
              iconColor="bg-gradient-to-br from-orange-500 to-amber-600"
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* ── Readiness + Recent Interviews ─────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Readiness */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-4 w-4 text-violet-400" /> Mức độ sẵn sàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : progress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-bold gradient-text">{progress.overallScore}</span>
                    <Badge className={`text-sm px-3 py-1 ${readiness?.color || "bg-violet-500/20 text-violet-300"}`}>
                      {readiness?.label || progress.readinessLevel}
                    </Badge>
                  </div>
                  <Progress value={progress.overallScore} className="h-2" />
                  <p className="text-sm text-zinc-400">{translateSuggestion(progress.suggestion)}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-bold gradient-text">0</span>
                    <Badge className="text-sm px-3 py-1 bg-zinc-700/50 text-zinc-400">Chưa có dữ liệu</Badge>
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-xs text-zinc-600">
                    {allInterviews.length === 0
                      ? "Hoàn thành phỏng vấn đầu tiên để xem đánh giá"
                      : "Hệ thống AI sẽ tổng hợp đánh giá sau khi phỏng vấn được chấm điểm"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent interviews */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-violet-400" /> Phỏng vấn gần đây
              </CardTitle>
              <CardAction>
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-violet-400 text-xs h-7 px-2">Xem tất cả</Button>
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : interviews.length === 0 ? (
                <p className="text-sm text-zinc-500">Chưa có phỏng vấn nào.</p>
              ) : (
                <div className="space-y-2">
                  {interviews.map((iv) => (
                    <Link key={iv.id} href={iv.status === "COMPLETED" ? `/interview/${iv.id}/report` : `/interview/${iv.id}/session`}>
                      <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3 hover:bg-zinc-800 transition-colors cursor-pointer">
                        <div>
                          <span className="text-sm font-semibold">{FIELD_LABELS[iv.field] || iv.field}</span>
                          <span className="mx-2 text-zinc-600">•</span>
                          <span className="text-sm text-zinc-400">{iv.level}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {iv.status === "COMPLETED" && iv.totalScore != null && (
                            <span className="text-sm font-bold text-violet-400">{iv.totalScore}đ</span>
                          )}
                          <Badge
                            className={iv.status === "COMPLETED" ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}
                            variant="secondary"
                          >
                            {iv.status === "COMPLETED" ? "Hoàn thành" : "Chưa hoàn thành"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* ── Tin tuyển dụng mới nhất ───────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">🔥</span> Tin tuyển dụng nổi bật
          </h2>
        </div>

        {newsLoading ? (
          /* Skeleton horizontal */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="glass border-0 overflow-hidden">
                <CardContent className="p-0 flex">
                  <Skeleton className="w-28 h-24 shrink-0 rounded-none" />
                  <div className="flex-1 p-3 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-20 mt-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : news.length === 0 ? (
          <Card className="glass border-0">
            <CardContent className="p-6 text-center text-sm text-zinc-500">
              Không thể tải tin tức. Vui lòng thử lại sau.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item, i) => (
              <motion.a
                key={`news-${i}-${item.id}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + i * 0.04 }}
                className="group block"
              >
                <Card className="glass border-0 border border-transparent hover:border-violet-500/30 transition-all duration-200 overflow-hidden">
                  <CardContent className="p-0 flex h-full min-h-[96px]">

                    {/* ── Thumbnail (left) ── */}
                    <div className="relative w-28 shrink-0 overflow-hidden bg-zinc-800">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        /* Gradient fallback per company */
                        <div className={`w-full h-full flex items-center justify-center text-2xl font-black opacity-60 ${
                          item.company === "FPT" ? "bg-gradient-to-br from-orange-600 to-red-700" :
                          item.company === "Viettel" ? "bg-gradient-to-br from-red-700 to-rose-900" :
                          "bg-gradient-to-br from-blue-700 to-indigo-900"
                        }`}>
                          <span className="text-white/80 text-xs font-bold tracking-widest">{item.company}</span>
                        </div>
                      )}
                    </div>

                    {/* ── Content (right) ── */}
                    <div className="flex-1 px-3 py-2.5 flex flex-col gap-1 min-w-0">
                      {/* Company badge */}
                      <span className={`text-[10px] font-bold w-fit px-1.5 py-0.5 rounded ${COMPANY_COLOR[item.company] ?? "bg-zinc-700 text-zinc-300"}`}>
                        {item.company}
                      </span>
                      {/* Title */}
                      <p className="text-[13px] font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      {/* Footer */}
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 truncate max-w-[60%]">{item.source}</span>
                        <span className="text-[11px] text-zinc-600 shrink-0">{item.dateLabel}</span>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </motion.a>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}
