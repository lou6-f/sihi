"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle,
  XCircle,
  Zap,
  Key,
  Clock,
  RefreshCw,
  Cpu,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────
interface UsageLog {
  id: string;
  provider: string;
  keyAlias: string;
  status: string;
  latencyMs: number | null;
  errorCode: string | null;
  createdAt: string;
}

interface AIMonitorData {
  keys: {
    totalKeys: number;
    model: string;
    provider: string;
  };
  recentLogs: UsageLog[];
  summary: {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    successRate: number;
  };
}

// ─── Component ──────────────────────────────────────────
export default function AdminAIMonitorPage() {
  const [data, setData] = useState<AIMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchLog, setSearchLog] = useState("");

  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setRefreshing(true);
      try {
        const res = await fetch("/api/admin/ai-monitor");
        if (res.ok) {
          const json: AIMonitorData = await res.json();
          setData(json);
          setLastUpdated(new Date());
        } else {
          toast.error("Lỗi tải dữ liệu AI Monitor");
        }
      } catch {
        toast.error("Lỗi kết nối server");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatLatency = (ms: number | null) => {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-400";
    if (rate >= 80) return "text-yellow-400";
    return "text-red-400";
  };

  const filteredLogs = (data?.recentLogs || []).filter(
    (log) =>
      !searchLog ||
      log.keyAlias.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.provider.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.status.toLowerCase().includes(searchLog.toLowerCase())
  );

  // ─── Summary Cards ─────────────────────────────────
  const summaryCards = data
    ? [
        {
          label: "Tổng lượt gọi (24h)",
          value: data.summary.totalCalls,
          icon: Zap,
          gradient: "from-violet-500 to-purple-600",
        },
        {
          label: "Thành công",
          value: data.summary.successCalls,
          icon: CheckCircle,
          gradient: "from-green-500 to-emerald-600",
        },
        {
          label: "Thất bại",
          value: data.summary.failedCalls,
          icon: XCircle,
          gradient: "from-red-500 to-rose-600",
        },
        {
          label: "Tỉ lệ thành công",
          value: `${data.summary.successRate}%`,
          icon: TrendingUp,
          gradient: "from-blue-500 to-indigo-600",
          valueColor: getSuccessRateColor(data.summary.successRate),
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
          <h1 className="text-3xl font-bold">AI Monitor</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Theo dõi trạng thái API keys và lịch sử gọi AI
            {lastUpdated && (
              <span className="ml-2 text-zinc-500">
                · Cập nhật lúc{" "}
                {lastUpdated.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="border-zinc-700"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </motion.div>

      {/* Key Info */}
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : data ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="glass border-0 border-l-2 border-l-violet-500">
            <CardContent className="flex items-center gap-6 p-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-zinc-400">API Keys:</span>
                <span className="font-semibold text-zinc-100">
                  {data.keys.totalKeys}
                </span>
              </div>
              <div className="h-4 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-zinc-400">Model:</span>
                <Badge variant="secondary" className="text-xs">
                  {data.keys.model}
                </Badge>
              </div>
              <div className="h-4 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-zinc-400">Provider:</span>
                <Badge className="bg-violet-500/20 text-violet-400 text-xs">
                  {data.keys.provider}
                </Badge>
              </div>
              <div className="ml-auto">
                <Badge
                  variant="outline"
                  className="border-green-500/30 text-green-400 text-xs"
                >
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Tự động làm mới 30s
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          : summaryCards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.1 }}
              >
                <Card className="glass border-0">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-400">{c.label}</p>
                        <p
                          className={`text-3xl font-bold ${
                            c.valueColor || "text-zinc-100"
                          }`}
                        >
                          {c.value}
                        </p>
                      </div>
                      <div
                        className={`rounded-xl bg-gradient-to-br ${c.gradient} p-2.5`}
                      >
                        <c.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Success Rate Visual Bar */}
      {data && data.summary.totalCalls > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-violet-400" />
                Tỉ lệ thành công (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${data.summary.successRate}%`,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      data.summary.successRate >= 95
                        ? "bg-gradient-to-r from-green-500 to-emerald-400"
                        : data.summary.successRate >= 80
                          ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                          : "bg-gradient-to-r from-red-500 to-rose-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-lg font-bold ${getSuccessRateColor(
                    data.summary.successRate
                  )}`}
                >
                  {data.summary.successRate}%
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>
                  {data.summary.successCalls} thành công /{" "}
                  {data.summary.failedCalls} thất bại
                </span>
                <span>Tổng: {data.summary.totalCalls} lượt gọi</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Logs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-violet-400" />
                Lịch sử gọi gần đây
              </CardTitle>
              <div className="relative w-64">
                <Input
                  placeholder="Tìm theo key, provider, status..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-xs text-zinc-400">
                        Provider
                      </TableHead>
                      <TableHead className="text-xs text-zinc-400">
                        Key Alias
                      </TableHead>
                      <TableHead className="text-xs text-zinc-400">
                        Trạng thái
                      </TableHead>
                      <TableHead className="text-xs text-zinc-400">
                        Latency
                      </TableHead>
                      <TableHead className="text-xs text-zinc-400">
                        Lỗi
                      </TableHead>
                      <TableHead className="text-xs text-zinc-400">
                        Thời gian
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-12 text-center text-zinc-500"
                        >
                          <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          Chưa có dữ liệu sử dụng
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log, idx) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <TableCell>
                            <Badge
                              className="bg-violet-500/20 text-violet-400 text-xs"
                            >
                              {log.provider}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">
                            {log.keyAlias}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                log.status === "SUCCESS"
                                  ? "bg-green-500/20 text-green-400"
                                  : log.status === "ERROR"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                              }
                            >
                              {log.status === "SUCCESS" && (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              )}
                              {log.status === "ERROR" && (
                                <XCircle className="mr-1 h-3 w-3" />
                              )}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">
                            {formatLatency(log.latencyMs)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.errorCode ? (
                              <span className="flex items-center gap-1 text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                {log.errorCode}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400">
                            {formatDate(log.createdAt)}
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
