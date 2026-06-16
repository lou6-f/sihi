"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, FileText, BookOpen, ArrowRight, TrendingUp } from "lucide-react";

const FIELD_LABELS: Record<string, string> = { FRONTEND: "Frontend", BACKEND: "Backend", DATA: "Data", FULLSTACK: "Fullstack" };
const STATUS_COLORS: Record<string, string> = { COMPLETED: "bg-green-500/20 text-green-400", IN_PROGRESS: "bg-zinc-500/20 text-zinc-400", CREATED: "bg-zinc-500/20 text-zinc-400" };

const READINESS_LABELS: Record<string, { label: string; color: string }> = {
  EXCELLENT:      { label: "Xuất sắc",        color: "bg-emerald-500/20 text-emerald-300" },
  READY:          { label: "Sẵn sàng",         color: "bg-green-500/20 text-green-300"   },
  GOOD:           { label: "Khá",              color: "bg-blue-500/20 text-blue-300"     },
  NEEDS_PRACTICE: { label: "Cần ôn luyện",   color: "bg-yellow-500/20 text-yellow-300" },
  NOT_READY:      { label: "Chưa sẵn sàng",  color: "bg-red-500/20 text-red-300"      },
};

// Dịch tên tiêu chí kỹ năng (dim_xxx hoặc xxx từ DB)
const SKILL_NAME_VI: Record<string, string> = {
  dim_technicalKnowledge:  "Kiến thức kỹ thuật",
  dim_problemSolving:      "Tư duy giải quyết vấn đề",
  dim_practicalExperience: "Kinh nghiệm thực tế",
  dim_communication:       "Khả năng trình bày",
  dim_learningAbility:     "Khả năng học hỏi",
  dim_confidence:          "Tự tin",
  dim_teamwork:            "Làm việc nhóm",
  dim_initiative:          "Tinh thần chủ động",
  // old dim_ names (backward compat)
  dim_reasoningAbility:    "Tư duy lập luận",
  dim_projectExperience:   "Kinh nghiệm dự án",
  // without prefix
  technicalKnowledge:      "Kiến thức kỹ thuật",
  problemSolving:          "Tư duy giải quyết vấn đề",
  practicalExperience:     "Kinh nghiệm thực tế",
  communication:           "Khả năng trình bày",
  learningAbility:         "Khả năng học hỏi",
  confidence:              "Tự tin",
  teamwork:                "Làm việc nhóm",
  initiative:              "Tinh thần chủ động",
};

function translateSuggestion(raw: string): string {
  // Replace all dim_xxx and plain skill names with Vietnamese
  return raw.replace(/dim_[a-zA-Z]+|[a-zA-Z][a-zA-Z]+(?=[,. ]|$)/g, (match) =>
    SKILL_NAME_VI[match] || match
  );
}

interface Interview { id: string; field: string; level: string; status: string; totalScore: number | null; createdAt: string; }
interface ProgressSnapshot { overallScore: number; readinessLevel: string; suggestion: string; totalInterviews: number; }

export default function DashboardPage() {
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/interviews?limit=5").then((r) => r.json()),
      fetch("/api/analytics/progress").then((r) => r.json()),
    ]).then(([intData, progData]) => {
      setInterviews(intData.interviews || []);
      setProgress(progData.latest || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">
          Xin chào, <span className="gradient-text">{session?.user?.name || "bạn"}</span> 👋
        </h1>
        <p className="mt-1 text-lg text-zinc-400">Sẵn sàng luyện phỏng vấn hôm nay?</p>
      </motion.div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/interview", icon: BrainCircuit, label: "Bắt đầu phỏng vấn", desc: "Bắt đầu buổi phỏng vấn AI", gradient: "from-violet-500 to-purple-600" },
          { href: "/cv", icon: FileText, label: "Quản lý CV", desc: "Upload và quản lý CV của bạn", gradient: "from-fuchsia-500 to-pink-600" },
          { href: "/resources", icon: BookOpen, label: "Tài liệu", desc: "Khám phá tài liệu học", gradient: "from-indigo-500 to-blue-600" },
        ].map((item, i) => (
          <motion.div key={item.href} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
            <Link href={item.href}>
              <Card className="glass glass-hover cursor-pointer border-0 transition-transform hover:scale-[1.02]">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`rounded-xl bg-gradient-to-br ${item.gradient} p-3`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{item.label}</h3>
                    <p className="text-sm text-zinc-400">{item.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-zinc-500" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Readiness + Recent Interviews */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Readiness */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-violet-400" /> Mức độ sẵn sàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : progress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-bold gradient-text">{progress.overallScore}</span>
                    <Badge className={`text-sm px-3 py-1 ${READINESS_LABELS[progress.readinessLevel]?.color || "bg-violet-500/20 text-violet-300"}`}>
                      {READINESS_LABELS[progress.readinessLevel]?.label || progress.readinessLevel}
                    </Badge>
                  </div>
                  <Progress value={progress.overallScore} className="h-2" />
                  <p className="text-sm text-zinc-400">{translateSuggestion(progress.suggestion)}</p>
                </div>
              ) : (
                <p className="text-base text-zinc-500">Chưa có dữ liệu. Hãy bắt đầu phỏng vấn đầu tiên!</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent interviews */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Phỏng vấn gần đây</CardTitle>
              <Link href="/history"><Button variant="ghost" size="sm" className="text-violet-400 text-sm">Xem tất cả</Button></Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
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
                          {iv.status === "COMPLETED" && iv.totalScore != null && <span className="text-sm font-bold text-violet-400">{iv.totalScore}đ</span>}
                          <Badge className={iv.status === "COMPLETED"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-zinc-500/20 text-zinc-400"
                          } variant="secondary">
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
    </div>
  );
}
