"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, ChevronRight } from "lucide-react";

interface Interview { id: string; field: string; level: string; status: string; totalScore: number | null; createdAt: string; }

const FIELD_LABELS: Record<string, string> = { FRONTEND: "Frontend", BACKEND: "Backend", DATA: "Data", FULLSTACK: "Fullstack" };

const isCompleted  = (s: string) => s === "COMPLETED";
const isAbandoned  = (s: string) => s === "ABANDONED" || s === "CANCELLED" || s === "ERROR";
const isInProgress = (s: string) => !isCompleted(s) && !isAbandoned(s);


export default function HistoryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fieldFilter, setFieldFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: "10" });
    fetch(`/api/interviews?${query}`)
      .then((r) => r.json())
      .then((data) => { setInterviews(data.interviews || []); setTotalPages(data.totalPages || 1); setLoading(false); });
  }, [page]);

  const filtered = fieldFilter === "all" ? interviews : interviews.filter((iv) => iv.field === fieldFilter);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Lịch sử phỏng vấn</h1>
        <p className="text-zinc-400">Xem lại các buổi phỏng vấn trước đây</p>
      </motion.div>

      <div className="flex gap-2">
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Lĩnh vực" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="FRONTEND">Frontend</SelectItem>
            <SelectItem value="BACKEND">Backend</SelectItem>
            <SelectItem value="DATA">Data</SelectItem>
            <SelectItem value="FULLSTACK">Fullstack</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-zinc-500">
          <Clock className="mx-auto mb-4 h-12 w-12" />
          <p>Chưa có phỏng vấn nào</p>
          <Link href="/interview"><Button className="mt-4 bg-violet-600">Bắt đầu phỏng vấn đầu tiên</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((iv, i) => {
            const done    = isCompleted(iv.status);
            const abandoned = isAbandoned(iv.status);
            const inProg  = isInProgress(iv.status);

            // Link: COMPLETED → report, in-progress → session, abandoned → no link
            const href = done ? `/interview/${iv.id}/report`
              : inProg ? `/interview/${iv.id}/session`
              : null;

            const card = (
              <Card className={`glass border-0 ${href ? "glass-hover cursor-pointer" : "opacity-70"}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                      done ? "bg-violet-500/20 text-violet-400"
                      : abandoned ? "bg-zinc-800 text-zinc-600"
                      : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {done ? (iv.totalScore != null ? iv.totalScore : "—") : "—"}
                    </div>
                    <div>
                      <h3 className="font-medium text-base">{FIELD_LABELS[iv.field]} · {iv.level}</h3>
                      <p className="text-sm text-zinc-500">{new Date(iv.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      done ? "bg-green-500/20 text-green-400"
                      : abandoned ? "bg-zinc-500/20 text-zinc-500"
                      : "bg-blue-500/20 text-blue-400"
                    }>
                      {done ? "✅ Hoàn thành"
                        : abandoned ? "⚪ Bỏ dở"
                        : "🔄 Đang diễn ra"}
                    </Badge>
                    {href && <ChevronRight className="h-4 w-4 text-zinc-500" />}
                  </div>
                </CardContent>
              </Card>
            );

            return (
              <motion.div key={iv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                {href ? <Link href={href}>{card}</Link> : card}
              </motion.div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-zinc-400">Trang {page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
