"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Activity, CheckCircle, XCircle, Zap, Key,
  Clock, RefreshCw, Cpu, TrendingUp, AlertTriangle,
  BarChart2, PieChartIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface UsageLog {
  id: string;
  provider: string;
  keyAlias: string;
  requestType: string | null;
  status: string;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface HourlyPoint { hour: string; total: number; success: number; failed: number }
interface TypePoint { name: string; value: number }

interface AIMonitorData {
  keys: { totalKeys: number; model: string; provider: string };
  recentLogs: UsageLog[];
  summary: {
    totalCalls: number; successCalls: number;
    failedCalls: number; rateLimitCalls: number; successRate: number;
  };
  hourlyChart: HourlyPoint[];
  requestTypeChart: TypePoint[];
  rateLimitAlert: { triggered: boolean; count: number; window: string };
}

// ─── Constants ───────────────────────────────────────────────────

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#6366f1"];

const STATUS_CONFIG: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  success:    { label: "Thành công", className: "bg-green-500/20 text-green-400", icon: CheckCircle },
  error:      { label: "Lỗi",        className: "bg-red-500/20 text-red-400",     icon: XCircle },
  rate_limit: { label: "Rate limit", className: "bg-yellow-500/20 text-yellow-400", icon: AlertTriangle },
};

// ─── Component ───────────────────────────────────────────────────

export default function AdminAIMonitorPage() {
  const [data, setData] = useState<AIMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchLog, setSearchLog] = useState("");
  const [hoveredLog, setHoveredLog] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/ai-monitor");
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      } else {
        toast.error("Lỗi tải dữ liệu Giám sát AI");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const fmt = (d: string) => new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const fmtMs = (ms: number | null) => {
    if (ms === null) return "—";
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };
  const rateColor = (r: number) => r >= 95 ? "text-green-400" : r >= 80 ? "text-yellow-400" : "text-red-400";

  const filteredLogs = (data?.recentLogs ?? []).filter(log =>
    !searchLog ||
    (log.keyAlias ?? "").toLowerCase().includes(searchLog.toLowerCase()) ||
    (log.provider ?? "").toLowerCase().includes(searchLog.toLowerCase()) ||
    (log.status ?? "").toLowerCase().includes(searchLog.toLowerCase()) ||
    (log.requestType ?? "").toLowerCase().includes(searchLog.toLowerCase())
  );

  const summaryCards = data ? [
    { label: "Tổng lượt gọi (24h)", value: data.summary.totalCalls,    icon: Zap,         grad: "from-violet-500 to-purple-600" },
    { label: "Thành công",          value: data.summary.successCalls,   icon: CheckCircle, grad: "from-green-500 to-emerald-600" },
    { label: "Thất bại / Lỗi",      value: data.summary.failedCalls,    icon: XCircle,     grad: "from-red-500 to-rose-600" },
    { label: "Tỉ lệ thành công",    value: `${data.summary.successRate}%`, icon: TrendingUp, grad: "from-blue-500 to-indigo-600", vColor: rateColor(data.summary.successRate) },
  ] : [];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Giám sát AI</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Theo dõi trạng thái API keys và lịch sử gọi AI
            {lastUpdated && (
              <span className="ml-2 text-zinc-500">
                · Cập nhật {lastUpdated.toLocaleTimeString("vi-VN")}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)}
          disabled={refreshing} className="border-zinc-700">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </motion.div>

      {/* ── Rate Limit Alert ── */}
      <AnimatePresence>
        {data?.rateLimitAlert.triggered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}>
            <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-300">Cảnh báo Rate Limit liên tục</p>
                <p className="mt-0.5 text-sm text-yellow-400/80">
                  {data.rateLimitAlert.count} lần rate limit trong {data.rateLimitAlert.window} gần nhất.
                  Cân nhắc thêm API key vào <code className="rounded bg-yellow-500/20 px-1">.env</code> → <code className="rounded bg-yellow-500/20 px-1">GEMINI_API_KEYS</code>.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Key Info ── */}
      {loading ? <Skeleton className="h-16 w-full" /> : data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass border-0 border-l-2 border-l-violet-500">
            <CardContent className="flex flex-wrap items-center gap-6 p-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-zinc-400">API Keys:</span>
                <span className="font-semibold">{data.keys.totalKeys}</span>
              </div>
              <div className="h-4 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-zinc-400">Model:</span>
                <Badge variant="secondary" className="text-xs">{data.keys.model}</Badge>
              </div>
              <div className="h-4 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-zinc-400">Provider:</span>
                <Badge className="bg-violet-500/20 text-violet-400 text-xs">{data.keys.provider}</Badge>
              </div>
              {data.summary.rateLimitCalls > 0 && (
                <>
                  <div className="h-4 w-px bg-zinc-700" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-zinc-400">Rate limits (24h):</span>
                    <span className="font-semibold text-yellow-400">{data.summary.rateLimitCalls}</span>
                  </div>
                </>
              )}
              <div className="ml-auto">
                <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Tự động làm mới 30s
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />) :
          summaryCards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.1 }}>
              <Card className="glass border-0">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">{c.label}</p>
                      <p className={`text-3xl font-bold ${c.vColor ?? "text-zinc-100"}`}>{c.value}</p>
                    </div>
                    <div className={`rounded-xl bg-gradient-to-br ${c.grad} p-2.5`}>
                      <c.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </div>

      {/* ── Charts Row ── */}
      {data && data.summary.totalCalls > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Hourly bar chart (spans 2 cols) */}
          <motion.div className="lg:col-span-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart2 className="h-4 w-4 text-violet-400" />
                  Lượt gọi theo giờ (24h gần nhất)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.hourlyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#71717a" }}
                      interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                      labelStyle={{ color: "#e4e4e7" }}
                      formatter={(val: number, name: string) => [val, name === "success" ? "Thành công" : name === "failed" ? "Thất bại" : "Tổng"]}
                    />
                    <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                    <Bar dataKey="failed"  stackId="a" fill="#f43f5e" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-emerald-500" /> Thành công</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-rose-500" /> Thất bại</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pie chart requestType */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glass border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-4 w-4 text-violet-400" />
                  Cơ cấu sử dụng
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.requestTypeChart.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.requestTypeChart} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                        paddingAngle={3}>
                        {data.requestTypeChart.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                        formatter={(val: number, name: string) => [val, name]}
                      />
                      <Legend iconSize={10} iconType="circle"
                        formatter={(v) => <span className="text-xs text-zinc-400">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      )}

      {/* ── Success Rate Bar ── */}
      {data && data.summary.totalCalls > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-violet-400" />
                Tỉ lệ thành công (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${data.summary.successRate}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      data.summary.successRate >= 95 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                      data.summary.successRate >= 80 ? "bg-gradient-to-r from-yellow-500 to-amber-400" :
                      "bg-gradient-to-r from-red-500 to-rose-400"
                    }`}
                  />
                </div>
                <span className={`text-lg font-bold ${rateColor(data.summary.successRate)}`}>
                  {data.summary.successRate}%
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>{data.summary.successCalls} thành công / {data.summary.failedCalls} thất bại</span>
                <span>Tổng: {data.summary.totalCalls} lượt gọi</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Recent Logs Table ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-violet-400" />
                Lịch sử gọi gần đây
                <Badge variant="secondary" className="text-xs">{filteredLogs.length}</Badge>
              </CardTitle>
              <div className="relative w-64">
                <Input
                  placeholder="Tìm theo key, type, status..."
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
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-xs text-zinc-400">Provider</TableHead>
                      <TableHead className="text-xs text-zinc-400">Key</TableHead>
                      <TableHead className="text-xs text-zinc-400">Loại</TableHead>
                      <TableHead className="text-xs text-zinc-400">Trạng thái</TableHead>
                      <TableHead className="text-xs text-zinc-400">Latency</TableHead>
                      <TableHead className="text-xs text-zinc-400">Lỗi</TableHead>
                      <TableHead className="text-xs text-zinc-400">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-zinc-500">
                          <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          Chưa có dữ liệu
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.map((log, idx) => {
                      const sc = STATUS_CONFIG[log.status] ?? { label: log.status, className: "bg-zinc-500/20 text-zinc-400" };
                      const Icon = sc.icon;
                      return (
                        <motion.tr key={log.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.015 }}
                          className="border-zinc-800/50 hover:bg-zinc-800/30">
                          <TableCell>
                            <Badge className="bg-violet-500/20 text-violet-400 text-xs">{log.provider}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">{log.keyAlias}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                              {log.requestType ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${sc.className} text-xs`}>
                              {Icon && <Icon className="mr-1 h-3 w-3" />}
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">
                            {fmtMs(log.latencyMs)}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {log.errorCode || log.errorMessage ? (
                              <div className="relative"
                                onMouseEnter={() => setHoveredLog(log.id)}
                                onMouseLeave={() => setHoveredLog(null)}>
                                <span className="flex cursor-help items-center gap-1 text-red-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[120px]">
                                    {log.errorCode ?? "error"}
                                  </span>
                                </span>
                                {/* Tooltip với message đầy đủ */}
                                <AnimatePresence>
                                  {hoveredLog === log.id && log.errorMessage && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 4 }}
                                      className="absolute bottom-6 left-0 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
                                      <p className="mb-1 text-xs font-semibold text-red-400">
                                        {log.errorCode}
                                      </p>
                                      <p className="text-xs text-zinc-300 leading-relaxed">
                                        {log.errorMessage}
                                      </p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400">{fmt(log.createdAt)}</TableCell>
                        </motion.tr>
                      );
                    })}
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
