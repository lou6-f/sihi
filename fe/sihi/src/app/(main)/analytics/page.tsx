"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, LineChart, Target, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface ProgressSnapshot {
  id: string;
  overallScore: number;
  readinessLevel: string;
  totalInterviews: number;
  suggestion?: string;
  snapshotAt: string;
}
interface Skill {
  id: string;
  skillName: string;
  currentScore: number;
  assessments: Array<{ id: string; score: number; createdAt: string }>;
}

// ═══════════════════════════════════════
// Label mappings
// ═══════════════════════════════════════

const READINESS_COLORS: Record<string, string> = {
  READY: "bg-green-500/20 text-green-400",
  GOOD: "bg-blue-500/20 text-blue-400",
  NEEDS_PRACTICE: "bg-yellow-500/20 text-yellow-400",
  NOT_READY: "bg-red-500/20 text-red-400",
};
const READINESS_LABELS: Record<string, string> = {
  READY: "Sẵn sàng",
  GOOD: "Tốt",
  NEEDS_PRACTICE: "Cần luyện thêm",
  NOT_READY: "Chưa sẵn sàng",
};

// Tất cả 8 chiều đánh giá chuẩn (dim_ prefix)
const SKILL_LABELS: Record<string, string> = {
  // 4 chiều phỏng vấn cốt lõi (dimensionScores)
  dim_technicalKnowledge:  "Kiến thức kỹ thuật",
  dim_problemSolving:      "Tư duy giải quyết vấn đề",
  dim_practicalExperience: "Kinh nghiệm thực tế",
  dim_communication:       "Giao tiếp & trình bày",
  // 4 chiều năng lực (competencyProfile)
  dim_learningAbility:     "Khả năng học hỏi",
  dim_confidence:          "Tự tin",
  dim_teamwork:            "Làm việc nhóm",
  dim_initiative:          "Tinh thần chủ động",
};

function formatSkillName(raw: string): string {
  if (SKILL_LABELS[raw]) return SKILL_LABELS[raw];
  // Remove dim_ prefix, then split camelCase / snake_case
  const clean = raw
    .replace(/^dim_/, "")
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Translate suggestion text — replace raw keys with Vietnamese names
function formatSuggestion(raw: string): string {
  return raw.replace(/dim_[a-zA-Z]+|[a-z]+_[a-z]+/g, (match) => SKILL_LABELS[match] || match);
}

// ═══════════════════════════════════════
// SVG Line Chart Component
// ═══════════════════════════════════════

function ScoreLineChart({ data }: { data: Array<{ score: number; label: string }> }) {
  if (data.length === 0) return null;

  const W = 700, H = 200;
  const PADL = 48, PADR = 16, PADT = 20, PADB = 36;
  const chartW = W - PADL - PADR;
  const chartH = H - PADT - PADB;

  const maxScore = 100;
  const minScore = 0;

  const xs = data.map((_, i) => PADL + (i / Math.max(data.length - 1, 1)) * chartW);
  const ys = data.map((d) => PADT + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH);

  // Line path
  const linePath = data.map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys[i]}`).join(" ");

  // Area fill path
  const areaPath = [
    `M ${xs[0]} ${ys[0]}`,
    ...data.slice(1).map((_, i) => `L ${xs[i + 1]} ${ys[i + 1]}`),
    `L ${xs[xs.length - 1]} ${PADT + chartH}`,
    `L ${xs[0]} ${PADT + chartH}`,
    "Z",
  ].join(" ");

  // Y gridlines at 0, 25, 50, 75, 100
  const gridYs = [0, 25, 50, 75, 100].map((v) => ({
    v,
    y: PADT + chartH - (v / 100) * chartH,
  }));

  // Trend arrow
  const first = data[0].score;
  const last = data[data.length - 1].score;
  const diff = last - first;
  const TrendIcon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const trendColor = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-zinc-400";
  const trendLabel = diff > 0 ? `+${diff} điểm` : diff < 0 ? `${diff} điểm` : "Ổn định";

  return (
    <div>
      {/* Trend summary */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
          <span className={`font-semibold ${trendColor}`}>{trendLabel}</span>
          <span className="text-zinc-500 text-sm">so với lần đầu</span>
        </div>
        <div className="text-zinc-500 text-sm">
          Cao nhất: <strong className="text-green-400">{Math.max(...data.map(d => d.score))}</strong>
          {" · "}
          Thấp nhất: <strong className="text-red-400">{Math.min(...data.map(d => d.score))}</strong>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: "320px" }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridYs.map(({ v, y }) => (
            <g key={v}>
              <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray={v === 0 ? "0" : "4 3"} />
              <text x={PADL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#71717a" fontFamily="sans-serif">{v}</text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Data points + labels */}
          {data.map((d, i) => {
            const isFirst = i === 0;
            const isLast = i === data.length - 1;
            const prevScore = i > 0 ? data[i - 1].score : null;
            const dotColor = prevScore === null ? "#7c3aed"
              : d.score > prevScore ? "#22c55e"
              : d.score < prevScore ? "#ef4444"
              : "#7c3aed";

            return (
              <g key={i}>
                {/* Dot */}
                <circle cx={xs[i]} cy={ys[i]} r="5" fill={dotColor} stroke="#09090b" strokeWidth="2" />

                {/* Score label above dot */}
                <text
                  x={xs[i]}
                  y={ys[i] - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={dotColor}
                  fontFamily="sans-serif"
                >
                  {d.score}
                </text>

                {/* X-axis label */}
                {(isFirst || isLast || data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && (
                  <text
                    x={xs[i]}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#71717a"
                    fontFamily="sans-serif"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Tăng</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Giảm</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />Lần đầu / giữ nguyên</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Page
// ═══════════════════════════════════════

export default function AnalyticsPage() {
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [history, setHistory] = useState<ProgressSnapshot[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [abandonedCount, setAbandonedCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/progress").then((r) => r.json()),
      fetch("/api/analytics/skills").then((r) => r.json()),
      fetch("/api/interviews?limit=100").then((r) => r.json()),
    ]).then(([progData, skillData, ivData]) => {
      setProgress(progData.latest || null);
      setHistory(progData.history || []);
      setSkills(Array.isArray(skillData) ? skillData : []);
      const abandoned = (ivData.interviews || []).filter(
        (iv: { status: string }) => iv.status === "ABANDONED"
      ).length;
      setAbandonedCount(abandoned);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
    </div>
  );

  const sorted = [...skills].sort((a, b) => b.currentScore - a.currentScore);
  const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)].currentScore : 50;
  const topSkills = sorted.filter(s => s.currentScore >= median).slice(0, 5);
  const weakSkills = [...sorted].reverse().slice(0, 5);

  // Build chart data: oldest → newest
  const chartData = [...history]
    .reverse()
    .map((h, i) => ({
      score: h.overallScore,
      label: `#${i + 1}`,
    }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Phân tích kỹ năng</h1>
        <p className="mt-2 text-xl text-zinc-400">Theo dõi tiến trình và cải thiện</p>
      </motion.div>

      {/* Abandoned note */}
      {abandonedCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-2.5 text-sm text-zinc-400">
            <span className="text-base">⚪</span>
            <span>
              <strong className="text-zinc-300">{abandonedCount} buổi bỏ dở</strong> không được tính vào biểu đồ phân tích (không có điểm số).
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Readiness Level ── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-violet-500/20 shrink-0">
              <Target className="h-12 w-12 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-base text-zinc-400">Mức độ sẵn sàng</p>
              {progress ? (
                <>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-4xl font-extrabold gradient-text">{progress.overallScore}</span>
                    <Badge className={`text-base px-4 py-1.5 ${READINESS_COLORS[progress.readinessLevel] || ""}`}>
                      {READINESS_LABELS[progress.readinessLevel] || progress.readinessLevel}
                    </Badge>
                  </div>
                  <Progress value={progress.overallScore} className="mt-4 h-3" />
                  <p className="mt-3 text-base text-zinc-500">
                    Tổng số phỏng vấn: <strong className="text-zinc-300">{progress.totalInterviews}</strong>
                  </p>
                  {progress.suggestion && (
                    <p className="mt-1 text-sm text-zinc-500 italic">
                      💡 {formatSuggestion(progress.suggestion)}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-zinc-500">Chưa có dữ liệu. Hãy hoàn thành ít nhất 1 buổi phỏng vấn.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Score History Chart ── */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LineChart className="h-6 w-6 text-violet-400" />
                Lịch sử điểm số
                <Badge variant="secondary" className="ml-auto">{chartData.length} lần phỏng vấn</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreLineChart data={chartData} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Skills Grid ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top skills */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass border-0 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-green-400">
                <TrendingUp className="h-6 w-6" />Kỹ năng tốt nhất
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topSkills.length > 0 ? topSkills.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formatSkillName(s.skillName)}</span>
                    <span className="font-bold text-green-400">{Math.round(s.currentScore)}<span className="text-xs text-zinc-500">/100</span></span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                      style={{ width: `${s.currentScore}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-zinc-500">Hoàn thành thêm phỏng vấn để xem kỹ năng nổi bật.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weak skills */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass border-0 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-red-400">
                <TrendingDown className="h-6 w-6" />Cần cải thiện
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weakSkills.length > 0 ? weakSkills.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formatSkillName(s.skillName)}</span>
                    <span className="font-bold text-red-400">{Math.round(s.currentScore)}<span className="text-xs text-zinc-500">/100</span></span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                      style={{ width: `${Math.max(s.currentScore, 2)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-zinc-500">Chưa có dữ liệu</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
