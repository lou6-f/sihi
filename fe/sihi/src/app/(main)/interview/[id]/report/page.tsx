"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Trophy, TrendingUp, TrendingDown, RotateCcw,
  Mic, AlertTriangle, Target, Star, Map, Brain,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface SkillGap { skill: string; severity: "CRITICAL" | "IMPORTANT" | "OPTIONAL"; evidence: string; }
interface StarEval { questionNumber: number; question: string; situation: number; task: number; action: number; result: number; totalScore: number; comment: string; }
interface RoadmapItem { topic: string; priority: "HIGH" | "MEDIUM" | "LOW"; reason: string; resources: string[]; }

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

const scoreColor = (s: number) =>
  s >= 80 ? "text-green-400" : s >= 60 ? "text-yellow-400" : s >= 40 ? "text-orange-400" : "text-red-400";

const barColor = (s: number) =>
  s >= 80 ? "bg-green-500" : s >= 60 ? "bg-yellow-500" : s >= 40 ? "bg-orange-500" : "bg-red-500";

const severityStyle: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  IMPORTANT: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  OPTIONAL: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const severityLabel: Record<string, string> = {
  CRITICAL: "🔴 Quan trọng",
  IMPORTANT: "🟠 Cần cải thiện",
  OPTIONAL: "⚪ Tham khảo",
};

const priorityStyle: Record<string, string> = {
  HIGH: "bg-red-500/20 text-red-400",
  MEDIUM: "bg-yellow-500/20 text-yellow-400",
  LOW: "bg-zinc-500/20 text-zinc-400",
};


// ═══════════════════════════════════════
// Page
// ═══════════════════════════════════════

// Fetcher: trả về null cho 404 (chưa có report), throw cho lỗi thực sự
const reportFetcher = async (url: string) => {
  const r = await fetch(url);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Lỗi tải báo cáo");
  const data = await r.json();
  return data?.error ? null : data;
};

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;

  // SWR: lần đầu fetch từ API, lần sau lấy từ cache → render ngay lập tức
  // loading.tsx hiển thị trong khi SWR đang fetch lần đầu (Suspense)
  const { data: report, mutate } = useSWR(
    id ? `/api/interviews/${id}/report` : null,
    reportFetcher,
    { suspense: true, revalidateOnFocus: false }
  );

  const [isGenerating, setIsGenerating] = useState(!report);
  const [loadingStep, setLoadingStep] = useState(0);
  const [expandedStar, setExpandedStar] = useState<number | null>(null);
  const [resourceMatches, setResourceMatches] = useState<Record<number, { title: string; url: string }[]>>({});
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const generationTriggered = useRef(false);

  const REPORT_STEPS = [
    { label: "Được rồi, đang xử lý...",      detail: "Tổng hợp dữ liệu phỏng vấn" },
    { label: "Đánh giá câu trả lời...",        detail: "AI đang chấm điểm từng câu" },
    { label: "Phân tích kỹ năng...",            detail: "Xác định điểm mạnh và cần cải thiện" },
    { label: "Tạo lộ trình học tập...",         detail: "Sắp có kết quả!" },
  ];

  // Dùng AI để match từng topic trong roadmap với tài liệu phù hợp trong DB
  useEffect(() => {
    if (!report) return;
    const roadmap = (report.learningRoadmap as RoadmapItem[]) || [];
    if (roadmap.length === 0) return;

    const topics = roadmap.map((r) => r.topic);
    const field = (report.field as string) ?? "";

    // 1 call duy nhất — Gemini phân tích semantic và chọn tài liệu phù hợp
    fetch("/api/resources/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics, field }),
    })
      .then((res) => res.ok ? res.json() : { matches: {} })
      .then((data) => setResourceMatches(data.matches ?? {}))
      .catch(() => {}); // lỗi mạng → fallback AI names tự động
  }, [report]);


  // Khi không có report → trigger generation + poll bằng SWR mutate
  useEffect(() => {
    if (report) {
      // Report đã có → dừng mọi animation và polling
      setIsGenerating(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    // Chưa có report → trigger generation một lần
    if (!generationTriggered.current) {
      generationTriggered.current = true;
      fetch(`/api/interviews/${id}/report`, { method: "POST" }).catch(() => {});
    }

    setIsGenerating(true);
    const stepTimers = [
      setTimeout(() => setLoadingStep(1), 2000),
      setTimeout(() => setLoadingStep(2), 6000),
      setTimeout(() => setLoadingStep(3), 12000),
    ];
    // Poll mỗi 4s bằng SWR mutate → tự động cập nhật cache
    pollRef.current = setInterval(() => mutate(), 4000);

    return () => {
      stepTimers.forEach(clearTimeout);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [report, id, mutate]);

  // Đang tạo báo cáo mới → full animation (chỉ khi chưa có report)
  if (isGenerating && !report) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8 max-w-sm w-full px-6"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30">
            <Trophy className="h-12 w-12 text-violet-400" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold">AI đang tạo báo cáo</h2>
          <p className="text-sm text-zinc-400 mt-1">Vui lòng đợi trong giây lát...</p>
        </div>
        <div className="space-y-3">
          {REPORT_STEPS.map((step, idx) => (
            <div key={idx} className={`flex items-center gap-3 text-left transition-opacity ${idx <= loadingStep ? "opacity-100" : "opacity-20"}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                idx < loadingStep  ? "border-green-500 bg-green-500/20" :
                idx === loadingStep ? "border-violet-500 bg-violet-500/20" : "border-zinc-700"
              }`}>
                {idx < loadingStep  ? <span className="text-green-400 text-xs">✓</span> :
                 idx === loadingStep ? <Loader2 className="h-3 w-3 text-violet-400 animate-spin" /> :
                 <span className="text-zinc-600 text-xs">{idx + 1}</span>}
              </div>
              <div>
                <p className={`text-sm font-medium ${idx <= loadingStep ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
                {idx === loadingStep && <p className="text-xs text-zinc-500">{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="h-1 w-full rounded-full bg-zinc-800">
          <motion.div
            className="h-1 rounded-full bg-violet-500"
            animate={{ width: `${((loadingStep + 1) / REPORT_STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-zinc-600">AI cần khoảng 15-30 giây để đánh giá toàn bộ phiên phỏng vấn</p>
      </motion.div>
    </div>
  );

  if (!report || report.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Trophy className="mb-4 h-16 w-16 text-zinc-600" />
        <h2 className="text-2xl font-bold">Báo cáo chưa sẵn sàng</h2>
        <p className="mt-2 text-zinc-400">Hoàn thành phỏng vấn để xem báo cáo chi tiết.</p>
        <Link href={`/interview/${id}/session`}>
          <Button className="mt-4 bg-violet-600">Tiếp tục phỏng vấn</Button>
        </Link>
      </div>
    );
  }

  // Parse report data
  const score = (report.overallScore as number) || 0;
  const strengths = (report.strengths as string[]) || [];
  const weaknesses = (report.weaknesses as string[]) || [];
  const overallComment = String(report.overallComment || "");
  const readinessLabel = String(report.readinessLevel || "");

  // Group 1: dimensionScores
  const dimensionScores = report.dimensionScores as Record<string, { score: number; comment: string; reason: string }> | null;
  // Group 2: competencyProfile
  const competencyProfile = report.competencyProfile as Record<string, { score: number; comment: string }> | null;
  // Optional sections
  const vocalAnalysis = report.vocalAnalysis as { avgWpm: number; totalFillers: number; fillerWords: string[]; totalSpeakingMs: number; wpmWarning: boolean } | null;
  const skillGaps = (report.skillGaps as SkillGap[]) || [];
  const starEvals = ((report.starEvaluations as StarEval[]) || []).filter(s => s && s.totalScore !== undefined);
  const roadmap = (report.learningRoadmap as RoadmapItem[]) || [];

  const hasVoiceData = vocalAnalysis && vocalAnalysis.totalSpeakingMs > 0;
  const hasStarData = starEvals.length > 0;

  const readinessConfig: Record<string, { label: string; color: string }> = {
    EXCELLENT:      { label: "Xuất sắc — Sẵn sàng đi làm",     color: "text-emerald-400" },
    READY:          { label: "Tốt — Sẵn sàng đi làm",           color: "text-green-400"  },
    GOOD:           { label: "Khá — Cần cải thiện một số điểm", color: "text-blue-400"   },
    NEEDS_PRACTICE: { label: "Trung bình — Cần ôn luyện thêm",  color: "text-yellow-400" },
    NOT_READY:      { label: "Chưa sẵn sàng — Cần học thêm",   color: "text-red-400"    },
  };
  const readiness = readinessConfig[readinessLabel] || { label: readinessLabel, color: "text-zinc-400" };

  const dim1Labels: Record<string, string> = {
    technicalKnowledge: "Kiến thức kỹ thuật",
    problemSolving:     "Tư duy giải quyết vấn đề",
    practicalExperience: "Kinh nghiệm thực tế",
    communication:      "Khả năng trình bày",
  };
  const dim2Labels: Record<string, string> = {
    learningAbility: "Khả năng học hỏi",
    confidence:      "Tự tin",
    teamwork:        "Làm việc nhóm",
    initiative:      "Tinh thần chủ động",
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <Link href="/history">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Lịch sử
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/interview/${id}/session`}>
            <Button variant="outline" size="sm"><RotateCcw className="mr-2 h-4 w-4" /> Xem lại</Button>
          </Link>
          <Link href="/interview">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700"><RotateCcw className="mr-2 h-4 w-4" /> Bắt đầu phỏng vấn</Button>
          </Link>
        </div>
      </div>

      {/* ── Điểm tổng ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Điểm phỏng vấn tổng</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${scoreColor(score)}`}>{score}</span>
                  <span className="text-zinc-500 text-xl">/100</span>
                </div>
                <p className={`mt-1 font-medium ${readiness.color}`}>{readiness.label}</p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30">
                <Trophy className="h-10 w-10 text-violet-400" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>0</span><span>100</span>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-3 rounded-full ${barColor(score)}`}
                />
              </div>
            </div>
            {overallComment && (
              <p className="mt-4 text-sm text-zinc-400 border-t border-zinc-800 pt-4 italic">"{overallComment}"</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Nhóm 1: Điểm phỏng vấn ── */}
      {dimensionScores && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-400" />
                Nhóm 1 — Điểm phỏng vấn
              </CardTitle>
              <p className="text-xs text-zinc-500">Các tiêu chí tính điểm tổng (Kỹ thuật 35% · Tư duy 30% · Kinh nghiệm 20% · Trình bày 15%)</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {Object.entries(dim1Labels).map(([key, label]) => {
                const d = dimensionScores[key];
                if (!d) return null;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <span className={`text-sm font-bold ${scoreColor(d.score)}`}>{d.score}/100</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${d.score}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className={`h-2 rounded-full ${barColor(d.score)}`}
                      />
                    </div>
                    {d.comment && (
                      <p className="text-sm text-zinc-300">💬 {d.comment}</p>
                    )}
                    {d.reason && (
                      <p className="text-xs text-zinc-500">📝 {d.reason}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Nhóm 2: Hồ sơ năng lực ── */}
      {competencyProfile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                Nhóm 2 — Hồ sơ năng lực
              </CardTitle>
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 mt-1">
                <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/80">Đây là đánh giá ước tính được suy ra từ câu trả lời, cách trình bày và hành vi trong buổi phỏng vấn. Kết quả mang tính tham khảo và không phải kết luận tuyệt đối về ứng viên.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(dim2Labels).map(([key, label]) => {
                const d = competencyProfile[key];
                if (!d) return null;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <span className={`text-sm font-bold ${scoreColor(d.score)}`}>{d.score}/100</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${d.score}%` }}
                        transition={{ duration: 0.8, delay: 0.25 }}
                        className={`h-2 rounded-full ${barColor(d.score)}`}
                      />
                    </div>
                    {d.comment && <p className="text-xs text-zinc-500">{d.comment}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Điểm mạnh & Cần cải thiện ── */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid gap-4 md:grid-cols-2">
          {strengths.length > 0 && (
            <Card className="border-green-900/50 bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Điểm mạnh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span className="text-zinc-300">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {weaknesses.length > 0 && (
            <Card className="border-red-900/50 bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" /> Cần cải thiện
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                      <span className="text-zinc-300">{w}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Skill Gaps ── */}
      {skillGaps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" /> Khoảng trống kiến thức
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {skillGaps.map((g, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${severityStyle[g.severity]}`}>
                  <div className="shrink-0">
                    <Badge variant="outline" className={`text-xs ${severityStyle[g.severity]}`}>
                      {severityLabel[g.severity]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{g.skill}</p>
                    <p className="text-xs opacity-75 mt-0.5">{g.evidence}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Lộ trình học tập ── */}
      {roadmap.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Map className="h-4 w-4 text-blue-400" /> Lộ trình học tập đề xuất
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {roadmap.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-zinc-800/50 p-3">
                  <Badge className={`shrink-0 text-xs ${priorityStyle[r.priority]}`}>
                    {r.priority === "HIGH" ? "🔴 Ưu tiên cao" : r.priority === "MEDIUM" ? "🟡 Trung bình" : "⚪ Thấp"}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.topic}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{r.reason}</p>
                    {/* Tài liệu DB khớp theo từ khóa topic */}
                    {(resourceMatches[i]?.length > 0) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-xs text-zinc-600">📚</span>
                        {resourceMatches[i].map((res, ri) => (
                          <a
                            key={ri}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
                          >
                            {res.title}
                            <span className="opacity-40 text-[10px]">↗</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Fallback: gợi ý của AI nếu không tìm được tài liệu DB */}
                    {!(resourceMatches[i]?.length > 0) && r.resources?.length > 0 && (
                      <p className="text-xs text-zinc-500 mt-1.5">📚 {r.resources.join(" · ")}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── STAR (chỉ khi có dữ liệu) ── */}
      {hasStarData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" /> Đánh giá STAR
              </CardTitle>
              <p className="text-xs text-zinc-500">Phân tích theo mô hình Situation – Task – Action – Result</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {starEvals.map((s, i) => (
                <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-800/30 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setExpandedStar(expandedStar === i ? null : i)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-zinc-500 shrink-0">Q{s.questionNumber}</span>
                      <span className="text-sm truncate">{s.question}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-sm font-bold ${scoreColor(s.totalScore * 10)}`}>{s.totalScore}/10</span>
                      {expandedStar === i ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    </div>
                  </button>
                  {expandedStar === i && (
                    <div className="px-3 pb-3 space-y-2 border-t border-zinc-700">
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {(["situation", "task", "action", "result"] as const).map((k) => (
                          <div key={k} className="text-center">
                            <p className="text-xs text-zinc-500 capitalize">{k[0].toUpperCase() + k.slice(1)}</p>
                            <p className={`text-sm font-bold ${scoreColor(s[k] * 10)}`}>{s[k]}/10</p>
                          </div>
                        ))}
                      </div>
                      {s.comment && <p className="text-xs text-zinc-400 pt-1">{s.comment}</p>}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Vocal Analysis (chỉ khi có voice) ── */}
      {hasVoiceData && vocalAnalysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-teal-400" /> Phân tích giọng nói
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center rounded-lg bg-zinc-800/50 p-3">
                  <p className="text-2xl font-bold text-teal-400">{vocalAnalysis.avgWpm}</p>
                  <p className="text-xs text-zinc-500 mt-1">WPM</p>
                  {vocalAnalysis.wpmWarning && <p className="text-xs text-amber-400 mt-1">⚠️ Hơi nhanh</p>}
                </div>
                <div className="text-center rounded-lg bg-zinc-800/50 p-3">
                  <p className="text-2xl font-bold text-teal-400">{vocalAnalysis.totalFillers}</p>
                  <p className="text-xs text-zinc-500 mt-1">Từ đệm</p>
                </div>
                <div className="text-center rounded-lg bg-zinc-800/50 p-3">
                  <p className="text-2xl font-bold text-teal-400">{Math.round(vocalAnalysis.totalSpeakingMs / 1000 / 60)}p</p>
                  <p className="text-xs text-zinc-500 mt-1">Tổng nói</p>
                </div>
              </div>
              {vocalAnalysis.fillerWords?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500 mb-2">Từ đệm hay dùng:</p>
                  <div className="flex flex-wrap gap-1">
                    {vocalAnalysis.fillerWords.map((w, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{w}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
