"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Monitor, Server, Database, Layers, BrainCircuit,
  Loader2, FileText, CheckCircle, Upload, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Data ────────────────────────────────────────────────────────────────────

const FIELDS = [
  { value: "FRONTEND",  label: "Frontend",  icon: Monitor,      gradient: "from-blue-500 to-cyan-500",      desc: "React, Vue, Angular" },
  { value: "BACKEND",   label: "Backend",   icon: Server,       gradient: "from-green-500 to-emerald-500",  desc: "Node.js, Java, Python" },
  { value: "DATA",      label: "Data",      icon: Database,     gradient: "from-orange-500 to-amber-500",   desc: "SQL, ML, Analytics" },
  { value: "FULLSTACK", label: "Fullstack", icon: Layers,       gradient: "from-violet-500 to-purple-500",  desc: "Frontend + Backend" },
];

const LEVELS = [
  { value: "INTERN",   label: "Intern",   desc: "Sinh viên / Thực tập" },
  { value: "FRESHER",  label: "Fresher",  desc: "0 – 1 năm" },
  { value: "JUNIOR",   label: "Junior",   desc: "1 – 3 năm" },
  { value: "MID",      label: "Mid",      desc: "3 – 5 năm" },
  { value: "SENIOR",   label: "Senior",   desc: "5+ năm" },
];

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

  // CV list
  const [cvList, setCvList]     = useState<CvItem[]>([]);
  const [cvLoading, setCvLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load CVs on mount
  useEffect(() => {
    fetch("/api/cv")
      .then((r) => r.json())
      .then((data) => {
        const list: CvItem[] = (Array.isArray(data) ? data : []).sort(
          (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
        );
        setCvList(list);
      })
      .catch(() => {})
      .finally(() => setCvLoading(false));
  }, []);

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
        setCvList((prev) => [...prev, newCv]);
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
    if (!field) { toast.error("Vui lòng chọn lĩnh vực"); return; }
    if (!level) { toast.error("Vui lòng chọn cấp độ");   return; }

    setStarting(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          level,
          jdMode: resolveMode(),
          jobDescription: jd.trim() || undefined,
          cvId: cvId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/interview/${data.id}/session`);
      } else {
        toast.error(data.error || "Không thể tạo phỏng vấn");
        setStarting(false);
      }
    } catch {
      toast.error("Lỗi kết nối");
      setStarting(false);
    }
  };

  const canStart = !!field && !!level && !starting;

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Thiết lập thông tin phỏng vấn</h1>
      </motion.div>

      {/* ── 1. Lĩnh vực ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
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

      {/* ── 2. Cấp độ ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
        <h2 className="font-semibold text-base text-zinc-200">2. Cấp độ <span className="text-red-400">*</span></h2>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={`flex flex-col items-start rounded-lg border-2 px-4 py-2.5 transition-all hover:scale-[1.02] ${
                level === l.value
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <span className="text-sm font-semibold">{l.label}</span>
              <span className="text-xs text-zinc-500">{l.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── 3. CV ───────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base text-zinc-200">
            3. CV <span className="text-xs font-normal text-zinc-500 ml-1">(tuỳ chọn)</span>
          </h2>
          {/* Upload button */}
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
                Chưa có CV nào. Nhấn "Tải CV mới lên" để thêm.
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* ── 4. Mô tả công việc ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
        <div>
          <h2 className="font-semibold text-base text-zinc-200">
            4. Mô tả công việc (JD) <span className="text-xs font-normal text-zinc-500 ml-1">(tuỳ chọn)</span>
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            💡 Gợi ý: dán toàn bộ nội dung JD từ LinkedIn, TopCV... AI sẽ dựa vào đó để cá nhân hóa câu hỏi.
            Có thể để trống để phỏng vấn tổng quát.
          </p>
        </div>
        <Textarea
          placeholder="Dán Job Description vào đây...&#10;Ví dụ: We are looking for a React Developer with 2+ years experience in TypeScript, REST API integration..."
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          className="min-h-[160px] resize-y text-sm leading-relaxed"
        />
        <p className="text-xs text-zinc-600 text-right">{jd.length} / 5000</p>
      </motion.div>

      {/* ── Mode indicator ───────────────────────────────────────────────── */}
      {(cvId || jd.trim()) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-violet-300"
        >
          <span className="text-zinc-500 mr-1">Chế độ phỏng vấn:</span>
          {resolveMode() === "CV_JD"   && "📄 CV + JD — câu hỏi cá nhân hóa theo CV và yêu cầu công việc"}
          {resolveMode() === "CV_ONLY" && "📄 CV — câu hỏi dựa trên kinh nghiệm trong CV"}
          {resolveMode() === "JD_ONLY" && "💼 JD — câu hỏi theo yêu cầu công việc"}
        </motion.div>
      )}

      {/* ── Start button ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <Button
          size="lg"
          onClick={handleStart}
          disabled={!canStart}
          className="w-full bg-violet-600 hover:bg-violet-700 py-4 text-base font-semibold gap-2 transition-all"
        >
          {starting
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Đang tạo phỏng vấn...</>
            : <><BrainCircuit className="h-5 w-5" /> Thiết lập thông tin phỏng vấn</>
          }
        </Button>
        {!field || !level ? (
          <p className="mt-2 text-center text-xs text-zinc-600">
            {!field && !level ? "Chọn lĩnh vực và cấp độ để bắt đầu"
              : !field ? "Chọn lĩnh vực để tiếp tục"
              : "Chọn cấp độ để tiếp tục"}
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}
