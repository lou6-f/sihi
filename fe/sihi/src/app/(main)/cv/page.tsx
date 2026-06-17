"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Trash2, Pencil, Check, X, GripVertical,
  FileText, Loader2, AlertCircle, Star,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

interface CvItem {
  id: string;
  fileName: string;
  displayName: string | null;
  fileSize: number;
  orderIndex: number;
  createdAt: string;
}

const formatSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function CVManagementPage() {
  const [cvs, setCvs] = useState<CvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialogUI } = useConfirmDialog();

  // ─── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cv");
      const data = await res.json();
      const list: CvItem[] = (Array.isArray(data) ? data : []).sort(
        (a: CvItem, b: CvItem) => a.orderIndex - b.orderIndex
      );
      setCvs(list);
    } catch {
      toast.error("Lỗi tải danh sách CV");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") { toast.error("Chỉ chấp nhận file PDF"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File PDF tối đa 5MB"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tải CV thành công!");
        // Add with next orderIndex
        const newCv: CvItem = { ...data.cv, displayName: null, orderIndex: cvs.length };
        setCvs((prev) => [...prev, newCv]);
      } else {
        toast.error(data.error || "Lỗi tải CV");
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // ─── Rename ───────────────────────────────────────────────────────────────
  const startEdit = (cv: CvItem) => {
    setEditingId(cv.id);
    setEditName(cv.displayName ?? cv.fileName.replace(/\.pdf$/i, ""));
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveEdit = async (id: string) => {
    const trimmed = editName.trim();
    try {
      const res = await fetch(`/api/cv/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed || null }),
      });
      if (res.ok) {
        setCvs((prev) => prev.map((c) => c.id === id ? { ...c, displayName: trimmed || null } : c));
        toast.success("Đã cập nhật tên");
      } else {
        toast.error("Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
    setEditingId(null);
  };

  // ─── Reorder (save after drag) ────────────────────────────────────────────
  const handleReorder = (newOrder: CvItem[]) => {
    setCvs(newOrder);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      await Promise.all(
        cvs.map((cv, idx) =>
          fetch(`/api/cv/${cv.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderIndex: idx }),
          })
        )
      );
      toast.success("Đã lưu thứ tự ưu tiên");
    } catch {
      toast.error("Lỗi lưu thứ tự");
    }
    setSavingOrder(false);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm(`Bạn muốn xóa CV “${name}”?`, {
      title: "Xóa CV",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/cv/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCvs((prev) => prev.filter((c) => c.id !== id));
        toast.success("Đã xoá CV");
      } else {
        toast.error("Lỗi xoá CV");
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Quản lý CV</h1>
        <p className="mt-1 text-zinc-400">
          Upload, đặt tên và sắp xếp thứ tự ưu tiên CV của bạn
        </p>
      </motion.div>

      {/* Upload zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card
          className={`glass border-2 border-dashed transition-all cursor-pointer ${
            isDragging ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-violet-500/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center gap-3 py-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
                <p className="text-violet-400">Đang tải lên...</p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Upload className="h-8 w-8 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Nhấn hoặc kéo file PDF vào đây</p>
                  <p className="text-sm text-zinc-500 mt-1">Chỉ nhận file PDF · Tối đa 5MB</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* CV list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Danh sách CV
            {cvs.length > 0 && (
              <Badge variant="secondary" className="ml-2">{cvs.length}</Badge>
            )}
          </h2>
          {cvs.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={saveOrder}
              disabled={savingOrder}
              className="border-zinc-700 text-zinc-400 hover:text-violet-400 hover:border-violet-500"
            >
              {savingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Lưu thứ tự
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : cvs.length === 0 ? (
          <Card className="glass border-0">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-zinc-600" />
              <p className="text-zinc-500">Chưa có CV nào. Hãy tải lên CV đầu tiên!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <GripVertical className="h-3 w-3" />
              Kéo thả để sắp xếp thứ tự ưu tiên — CV đầu tiên sẽ được chọn mặc định
            </p>
            <Reorder.Group axis="y" values={cvs} onReorder={handleReorder} className="space-y-3">
              <AnimatePresence>
                {cvs.map((cv, idx) => (
                  <Reorder.Item key={cv.id} value={cv} className="list-none">
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card className="glass border-0 hover:border hover:border-zinc-700 transition-all">
                        <CardContent className="flex items-center gap-4 p-4">
                          {/* Drag handle */}
                          <GripVertical className="h-5 w-5 text-zinc-600 cursor-grab active:cursor-grabbing shrink-0" />

                          {/* Priority badge */}
                          {idx === 0 && (
                            <span title="CV ưu tiên hàng đầu">
                              <Star className="h-4 w-4 text-amber-400 shrink-0" />
                            </span>
                          )}

                          {/* PDF icon */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                            <FileText className="h-5 w-5 text-red-400" />
                          </div>

                          {/* Name + info */}
                          <div className="flex-1 min-w-0">
                            {editingId === cv.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  ref={editInputRef}
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(cv.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                  className="h-8 text-sm"
                                />
                                <Button size="sm" variant="ghost" onClick={() => saveEdit(cv.id)} className="text-green-400 hover:text-green-300 px-2">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-zinc-500 px-2">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium truncate">
                                  {cv.displayName ?? cv.fileName.replace(/\.pdf$/i, "")}
                                </p>
                                {cv.displayName && (
                                  <p className="text-xs text-zinc-600 truncate">{cv.fileName}</p>
                                )}
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {formatSize(cv.fileSize)} · {formatDate(cv.createdAt)}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          {editingId !== cv.id && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(cv)}
                                title="Đổi tên"
                                className="text-zinc-500 hover:text-violet-400"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(cv.id, cv.displayName ?? cv.fileName)}
                                title="Xoá CV"
                                className="text-zinc-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </>
        )}
      </motion.div>
    </div>
    <ConfirmDialogUI />
    </>
  );
}
