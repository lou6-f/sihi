"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Monitor, Server, Database, Layers, BrainCircuit,
  Loader2, FileText, CheckCircle, Upload, X, AlertTriangle, Play, Trash2,
  Sparkles, Clock, Target, User,
} from "lucide-react";
import { toast } from "sonner";

const FIELD_LABELS: Record<string, string> = {
  FRONTEND: "Frontend", BACKEND: "Backend", DATA: "Data", FULLSTACK: "Fullstack",
};

// ─── Data ────────────────────────────────────────────────────────────────────

const FIELDS = [
  { value: "FRONTEND",  label: "Frontend",  icon: Monitor,  gradient: "from-blue-500 to-cyan-500",      desc: "React, Vue, Angular" },
  { value: "BACKEND",   label: "Backend",   icon: Server,   gradient: "from-green-500 to-emerald-500",  desc: "Node.js, Java, Python" },
  { value: "DATA",      label: "Data",      icon: Database, gradient: "from-orange-500 to-amber-500",   desc: "SQL, ML, Analytics" },
  { value: "FULLSTACK", label: "Fullstack", icon: Layers,   gradient: "from-violet-500 to-purple-500",  desc: "Frontend + Backend" },
];

const LEVELS = [
  { value: "INTERN",  label: "Intern",  desc: "Sinh viên / Thực tập" },
  { value: "FRESHER", label: "Fresher", desc: "0 – 1 năm" },
  { value: "JUNIOR",  label: "Junior",  desc: "1 – 3 năm" },
  { value: "MID",     label: "Mid",     desc: "3 – 5 năm" },
  { value: "SENIOR",  label: "Senior",  desc: "5+ năm" },
];

const LEVEL_LABELS: Record<string, string> = {
  INTERN: "Intern", FRESHER: "Fresher", JUNIOR: "Junior", MID: "Mid", SENIOR: "Senior",
};

interface CvItem {
  id: string;
  fileName: string;
  displayName: string | null;
  fileSize: number;
  orderIndex?: number;
  createdAt: string;
}

const fmtSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewSetupPage() {
  const router = useRouter();

  // Form state
  const [field, setField]   = useState("");
  const [level, setLevel]   = useState("");
  const [cvId, setCvId]     = useState<string>(""); // empty = no CV
  const [jd, setJd]         = useState("");
  const [starting, setStarting] = useState(false);

  // CV list — SWR cầm dữ liệu, navigate về trang show ngay
  const { data: cvData, isLoading: cvLoading, mutate: mutateCvList } = useSWR<CvItem[]>(
    "/api/cv",
    async (url: string) => {
      const res = await fetch(url);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).sort(
        (a: CvItem, b: CvItem) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );
    }
  );
  const cvList: CvItem[] = cvData || [];
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Active interview state (for 409 dialog) ──────────────────────────────
  interface ActiveInterview { id: string; field: string; level: string; createdAt: string; }
  const [activeInterview, setActiveInterview] = useState<ActiveInterview | null>(null);
  const [abandoning, setAbandoning] = useState(false);

  // ── Upload inline CV ──────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") { toast.error("Chỉ chấp nhận file PDF"); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("File PDF tối đa 5MB"); return; }

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        const newCv: CvItem = { ...data.cv, displayName: null, orderIndex: cvList.length };
        // Optimistic update — không revalidate lại, giữ UI nhanh
        await mutateCvList((prev) => [...(prev || []), newCv], { revalidate: false });
        setCvId(newCv.id);
        toast.success("Tải CV thành công!");
      } else {
        toast.error(data.error || "Lỗi tải CV");
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
    setUploading(false);
  };

  // ── Determine jdMode automatically ───────────────────────────────────────
  const resolveMode = () => {
    const hasCV = !!cvId;
    const hasJD = jd.trim().length > 0;
    if (hasCV && hasJD)  return "CV_JD";
    if (hasCV && !hasJD) return "CV_ONLY";
    if (!hasCV && hasJD) return "JD_ONLY";
    return "GENERAL";
  };

  // ── Start interview ───────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!field || !level) return;
    setStarting(true);
    try {
      const body: Record<string, string> = { field, level, jdMode: resolveMode() };
      if (cvId)      body.cvId = cvId;
      if (jd.trim()) body.jobDescription = jd.trim();

      const res  = await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (res.status === 409 && data.activeInterview) {
        setActiveInterview(data.activeInterview);
        setStarting(false);
        return;
      }
      if (!res.ok) { toast.error(data.error || "Không thể tạo phỏng vấn"); setStarting(false); return; }
      router.push(`/interview/${data.id}/session`);
    } catch {
      toast.error("Lỗi kết nối");
      setStarting(false);
    }
  };

  const handleResume = () => {
    if (activeInterview) router.push(`/interview/${activeInterview.id}/session`);
  };

  const handleAbandonAndStart = async () => {
    if (!activeInterview) return;
    setAbandoning(true);
    try {
      await fetch(`/api/interviews/${activeInterview.id}/abandon`, { method: "PATCH" });
      setActiveInterview(null);
      await handleStart();
    } catch {
      toast.error("Lỗi hủy phiên cũ");
    }
    setAbandoning(false);
  };

  const canStart = !!field && !!level && !starting;

  // ── Derived values for preview ─────────────────────────────────────────────
  const selectedField = FIELDS.find((f) => f.value === field);
  const selectedCv    = cvList.find((c) => c.id === cvId);
  const mode          = resolveMode();

  const modeInfo = {
    CV_JD:   { label: "CV + JD",    desc: "Câu hỏi cá nhân hóa theo CV và yêu cầu công việc", color: "text-violet-400" },
    CV_ONLY: { label: "CV",         desc: "Câu hỏi dựa trên kinh nghiệm trong CV của bạn",    color: "text-blue-400"   },
    JD_ONLY: { label: "JD",         desc: "Câu hỏi theo yêu cầu công việc",                   color: "text-amber-400"  },
    GENERAL: { label: "Tổng quát",  desc: "Câu hỏi phỏng vấn chung theo lĩnh vực & cấp độ",  color: "text-zinc-400"   },
  }[mode];

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <>
    {/* ── Two-column wrapper ─────────────────────────────────────────────── */}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">

      {/* ════ LEFT — Form ══════════════════════════════════════════════════ */}
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold">Thiết lập phỏng vấn</h1>
          <p className="mt-1 text-sm text-zinc-500">Chọn lĩnh vực và cấp độ để AI tạo bộ câu hỏi phù hợp</p>
        </motion.div>

        {/* ── 1. Lĩnh vực ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <h2 className="font-semibold text-base text-zinc-200">1. Lĩnh vực <span className="text-red-400">*</span></h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <button
                key={f.value}
                onClick={() => setField(f.value)}
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:scale-[1.02] ${
                  field === f.value
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                }`}
              >
                <div className={`rounded-lg bg-gradient-to-br ${f.gradient} p-2.5`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="text-xs text-zinc-500">{f.desc}</span>
                {field === f.value && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] text-white">✓</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── 2. Cấp độ ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <h2 className="font-semibold text-base text-zinc-200">2. Cấp độ <span className="text-red-400">*</span></h2>
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`flex flex-col items-center rounded-lg border-2 px-2 py-3 transition-all hover:scale-[1.02] ${
                  level === l.value
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span className="text-sm font-semibold">{l.label}</span>
                <span className="text-[10px] text-zinc-500 mt-0.5 text-center leading-tight">{l.desc}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── 3. CV ───────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base text-zinc-200">
              3. CV <span className="text-xs font-normal text-zinc-500 ml-1">(tuỳ chọn)</span>
            </h2>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:border-violet-500 hover:text-violet-400 disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />
              }
              Tải CV mới lên
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
          </div>

          {cvLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách CV...
            </div>
          ) : (
            <div className="space-y-2">
              {/* No CV option */}
              <button
                onClick={() => setCvId("")}
                className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                  cvId === ""
                    ? "border-zinc-600 bg-zinc-800/50 text-zinc-300"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
                }`}
              >
                <X className="h-4 w-4 shrink-0" />
                <span className="text-sm">Không dùng CV</span>
                {cvId === "" && <CheckCircle className="ml-auto h-4 w-4 text-zinc-400" />}
              </button>

              {/* CV list */}
              {cvList.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => setCvId(cv.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all hover:scale-[1.005] ${
                    cvId === cv.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                    <FileText className={`h-4 w-4 ${cvId === cv.id ? "text-violet-400" : "text-red-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {cv.displayName ?? cv.fileName.replace(/\.pdf$/i, "")}
                    </p>
                    <p className="text-xs text-zinc-500">{fmtSize(cv.fileSize)}</p>
                  </div>
                  {cvId === cv.id && <CheckCircle className="ml-auto h-5 w-5 text-violet-400 shrink-0" />}
                </button>
              ))}

              {cvList.length === 0 && (
                <p className="text-sm text-zinc-600 py-1">
                  Chưa có CV nào. Nhấn &quot;Tải CV mới lên&quot; để thêm.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* ── 4. Mô tả công việc ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <div>
            <h2 className="font-semibold text-base text-zinc-200">
              4. Mô tả công việc (JD) <span className="text-xs font-normal text-zinc-500 ml-1">(tuỳ chọn)</span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              💡 Dán JD từ LinkedIn, TopCV... AI sẽ cá nhân hóa câu hỏi theo yêu cầu công việc.
            </p>
          </div>
          <Textarea
            placeholder={"Dán Job Description vào đây...\nVí dụ: We are looking for a React Developer with 2+ years experience in TypeScript, REST API integration..."}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className="min-h-[140px] resize-y text-sm leading-relaxed"
          />
          <p className="text-xs text-zinc-600 text-right">{jd.length} / 5000</p>
        </motion.div>

      </div>
      {/* ════ END LEFT ═════════════════════════════════════════════════════ */}

      {/* ════ RIGHT — Preview Card ════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="lg:sticky lg:top-6 h-fit"
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm overflow-hidden">

          {/* Card header */}
          <div className="border-b border-zinc-800 bg-gradient-to-r from-violet-500/10 to-transparent px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="font-semibold text-sm text-zinc-200">Tóm tắt phiên phỏng vấn</span>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* Selections summary */}
            <div className="space-y-3">

              {/* Field */}
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${selectedField?.gradient ?? "from-zinc-700 to-zinc-600"}`}>
                  {selectedField
                    ? <selectedField.icon className="h-4 w-4 text-white" />
                    : <Target className="h-4 w-4 text-zinc-400" />
                  }
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Lĩnh vực</p>
                  <p className={`text-sm font-medium ${selectedField ? "text-zinc-200" : "text-zinc-600"}`}>
                    {selectedField ? selectedField.label : "Chưa chọn"}
                  </p>
                </div>
              </div>

              {/* Level */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                  <Clock className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Cấp độ</p>
                  <p className={`text-sm font-medium ${level ? "text-zinc-200" : "text-zinc-600"}`}>
                    {level ? `${LEVEL_LABELS[level]} — ${LEVELS.find(l => l.value === level)?.desc}` : "Chưa chọn"}
                  </p>
                </div>
              </div>

              {/* CV */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">CV</p>
                  <p className={`text-sm font-medium truncate ${cvId ? "text-zinc-200" : "text-zinc-600"}`}>
                    {selectedCv
                      ? (selectedCv.displayName ?? selectedCv.fileName.replace(/\.pdf$/i, ""))
                      : "Không dùng CV"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-800" />

              {/* Mode badge */}
              <div className="rounded-lg bg-zinc-800/60 px-3 py-2.5">
                <p className="text-xs text-zinc-500 mb-0.5">Chế độ phỏng vấn</p>
                <p className={`text-sm font-semibold ${modeInfo.color}`}>
                  {modeInfo.label}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{modeInfo.desc}</p>
              </div>
            </div>

            {/* Start button */}
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full bg-violet-600 hover:bg-violet-700 py-5 text-sm font-semibold gap-2 transition-all disabled:opacity-40"
            >
              {starting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo phỏng vấn...</>
                : <><BrainCircuit className="h-4 w-4" /> Bắt đầu phỏng vấn</>
              }
            </Button>

            {(!field || !level) && (
              <p className="text-center text-xs text-zinc-600">
                {!field && !level ? "Chọn lĩnh vực và cấp độ để bắt đầu"
                  : !field ? "Chọn lĩnh vực để tiếp tục"
                  : "Chọn cấp độ để tiếp tục"}
              </p>
            )}

            {/* Tips */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-400">💡 Gợi ý</p>
              <ul className="space-y-1.5 text-xs text-zinc-500">
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  Thêm CV để AI cá nhân hóa câu hỏi theo kinh nghiệm của bạn
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  Dán JD để luyện đúng với vị trí tuyển dụng thực tế
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  Mỗi phiên gồm 5–10 câu, kết thúc có báo cáo đánh giá chi tiết
                </li>
              </ul>
            </div>

          </div>
        </div>
      </motion.div>
      {/* ════ END RIGHT ════════════════════════════════════════════════════ */}

    </div>

    {/* ── Tầng 1: Resume/Abandon dialog ─────────────────────────────────── */}
    <AnimatePresence>
      {activeInterview && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActiveInterview(null)}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="rounded-2xl border border-amber-500/30 bg-zinc-900 shadow-2xl overflow-hidden">
              {/* Header strip */}
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-100">Bạn có phỏng vấn đang dở</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {FIELD_LABELS[activeInterview.field] ?? activeInterview.field} · {activeInterview.level}
                    {" · "}
                    {new Date(activeInterview.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-sm text-zinc-400">
                  Tiếp tục buổi cũ để không mất tiến trình, hoặc hủy để bắt đầu phỏng vấn mới.
                </p>
                <Button
                  onClick={handleResume}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Tiếp tục phỏng vấn cũ
                </Button>
                <Button
                  onClick={handleAbandonAndStart}
                  disabled={abandoning}
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-red-400 hover:border-red-500/50 gap-2"
                >
                  {abandoning
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                  Hủy buổi cũ &amp; bắt đầu mới
                </Button>
                <button
                  onClick={() => setActiveInterview(null)}
                  className="w-full text-xs text-zinc-600 hover:text-zinc-400 py-1"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
