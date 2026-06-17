"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { toast } from "sonner";
import {
  Users,
  BrainCircuit,
  BookOpen,
  Activity,
  TrendingUp,
  BarChart3,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────
interface FieldData {
  field: string;
  count: number;
}

interface StatsData {
  totalUsers: number;
  activeUsers: number;
  totalInterviews: number;
  completedInterviews: number;
  totalResources: number;
  avgScore: number;
  interviewsByField: FieldData[];
}

// ─── Constants ──────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  DATA: "Data",
  FULLSTACK: "Fullstack",
};

const FIELD_COLORS: Record<string, string> = {
  FRONTEND: "from-blue-500 to-cyan-500",
  BACKEND: "from-green-500 to-emerald-500",
  DATA: "from-orange-500 to-amber-500",
  FULLSTACK: "from-violet-500 to-purple-500",
};

const FIELD_BG_COLORS: Record<string, string> = {
  FRONTEND: "bg-blue-500/20",
  BACKEND: "bg-green-500/20",
  DATA: "bg-orange-500/20",
  FULLSTACK: "bg-violet-500/20",
};

// ─── Component ──────────────────────────────────────────
export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        // Map the API response to our StatsData format
        setStats({
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeToday || 0,
          totalInterviews: data.totalInterviews || 0,
          completedInterviews: data.completedInterviews || 0,
          totalResources: data.totalResources || 0,
          avgScore: data.avgScore || 0,
          interviewsByField: data.interviewsByField || [],
        });
      } else {
        toast.error("Lỗi tải thống kê");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const maxFieldCount =
    stats?.interviewsByField?.length
      ? Math.max(...stats.interviewsByField.map((f) => f.count), 1)
      : 1;

  // ─── Stats Cards Config ─────────────────────────────
  const statCards = stats
    ? [
        {
          label: "Tổng người dùng",
          value: stats.totalUsers,
          icon: Users,
          gradient: "from-violet-500 to-purple-600",
          description: "Tổng số tài khoản đã đăng ký",
        },
        {
          label: "Hoạt động hôm nay",
          value: stats.activeUsers,
          icon: Activity,
          gradient: "from-green-500 to-emerald-600",
          description: "Người dùng hoạt động trong ngày",
        },
        {
          label: "Tổng phỏng vấn",
          value: stats.totalInterviews,
          icon: BrainCircuit,
          gradient: "from-fuchsia-500 to-pink-600",
          description: "Tổng số buổi phỏng vấn",
        },
        {
          label: "Hoàn thành",
          value: stats.completedInterviews,
          icon: CheckCircle,
          gradient: "from-cyan-500 to-blue-600",
          description: "Phỏng vấn đã hoàn thành",
        },
        {
          label: "Tài liệu",
          value: stats.totalResources,
          icon: BookOpen,
          gradient: "from-indigo-500 to-blue-600",
          description: "Tổng số tài liệu học tập",
        },
        {
          label: "Điểm trung bình",
          value: stats.avgScore,
          icon: TrendingUp,
          gradient: "from-orange-500 to-amber-600",
          description: "Điểm trung bình phỏng vấn",
          suffix: "/100",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Thống kê chi tiết</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tổng quan dữ liệu hệ thống SiHi
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="border-zinc-700"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </motion.div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))
          : statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
              >
                <Card className="glass border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/5">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-zinc-400">{card.label}</p>
                        <div className="flex items-baseline gap-1">
                          <motion.p
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 + 0.3, type: "spring" }}
                            className="text-3xl font-bold"
                          >
                            {card.value}
                          </motion.p>
                          {card.suffix && (
                            <span className="text-sm text-zinc-500">
                              {card.suffix}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">
                          {card.description}
                        </p>
                      </div>
                      <div
                        className={`rounded-xl bg-gradient-to-br ${card.gradient} p-2.5`}
                      >
                        <card.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Bar Chart - Interviews by Field */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-violet-400" />
              Phỏng vấn theo lĩnh vực
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.interviewsByField?.length ? (
              <div className="flex flex-col items-center py-12 text-zinc-500">
                <BarChart3 className="mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">Chưa có dữ liệu phỏng vấn</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.interviewsByField.map((item, idx) => {
                  const percentage = Math.round(
                    (item.count / maxFieldCount) * 100
                  );
                  const gradientClass =
                    FIELD_COLORS[item.field] || "from-zinc-500 to-zinc-400";
                  const bgClass =
                    FIELD_BG_COLORS[item.field] || "bg-zinc-500/20";

                  return (
                    <motion.div
                      key={item.field}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + 0.6 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-24 flex-shrink-0">
                          <Badge className={`${bgClass} text-xs`}>
                            {FIELD_LABELS[item.field] || item.field}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="h-8 overflow-hidden rounded-lg bg-zinc-800/60">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{
                                duration: 0.8,
                                delay: idx * 0.1 + 0.7,
                                ease: "easeOut",
                              }}
                              className={`flex h-full items-center rounded-lg bg-gradient-to-r ${gradientClass} px-3`}
                              style={{ minWidth: percentage > 5 ? undefined : "40px" }}
                            >
                              <span className="text-xs font-semibold text-white drop-shadow">
                                {item.count}
                              </span>
                            </motion.div>
                          </div>
                        </div>
                        <div className="w-12 text-right text-sm font-medium text-zinc-400">
                          {percentage}%
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Table */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-violet-400" />
                Tổng hợp nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const completionRate =
                  stats.totalInterviews > 0
                    ? Math.round(
                        (stats.completedInterviews / stats.totalInterviews) * 100
                      )
                    : 0;
                const activeRate =
                  stats.totalUsers > 0
                    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                    : 0;

                const rows = [
                  {
                    label: "Hoàn thành phỏng vấn",
                    value: stats.completedInterviews,
                    pct: completionRate,
                    gradient: "from-cyan-500 to-cyan-400",
                    badgeBg: "bg-cyan-500/20 text-cyan-300",
                  },
                  {
                    label: "Người dùng hoạt động",
                    value: stats.activeUsers,
                    pct: activeRate,
                    gradient:
                      activeRate >= 50
                        ? "from-green-500 to-emerald-400"
                        : "from-yellow-500 to-amber-400",
                    badgeBg:
                      activeRate >= 50
                        ? "bg-green-500/20 text-green-300"
                        : "bg-yellow-500/20 text-yellow-300",
                  },
                ];

                return rows.map((row, idx) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 + 0.75 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-44 flex-shrink-0">
                        <Badge className={`${row.badgeBg} text-xs`}>
                          {row.label}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="h-8 overflow-hidden rounded-lg bg-zinc-800/60">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${row.pct}%` }}
                            transition={{
                              duration: 0.8,
                              delay: idx * 0.1 + 0.85,
                              ease: "easeOut",
                            }}
                            className={`flex h-full items-center rounded-lg bg-gradient-to-r ${row.gradient} px-3`}
                            style={{ minWidth: row.pct > 5 ? undefined : "40px" }}
                          >
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {row.value}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-zinc-400">
                        {row.pct}%
                      </div>
                    </div>
                  </motion.div>
                ));
              })()}
            </CardContent>
          </Card>

        </motion.div>
      )}
    </div>
  );
}
