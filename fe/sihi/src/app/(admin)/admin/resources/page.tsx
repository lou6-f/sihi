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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

// ─── Interfaces ─────────────────────────────────────────
interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  url: string;
  field: string;
  level: string;
  status: string;
  isAiGenerated: boolean;
  relevanceScore?: number | null;
  createdAt: string;
}

interface ResourceFormData {
  title: string;
  description: string;
  type: string;
  url: string;
  field: string;
  level: string;
}

// ─── Constants ──────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "ARCHIVED", label: "Lưu trữ" },
] as const;

const TYPE_OPTIONS = [
  { value: "ARTICLE",       label: "Bài viết"      },
  { value: "ROADMAP",       label: "Lộ trình"       },
  { value: "VIDEO",         label: "Video"          },
  { value: "EXTERNAL_LINK", label: "Liên kết ngoài" },
] as const;

const FIELD_OPTIONS = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "DATA", label: "Data" },
  { value: "FULLSTACK", label: "Fullstack" },
] as const;

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Cơ bản" },
  { value: "INTERMEDIATE", label: "Trung bình" },
  { value: "ADVANCED", label: "Nâng cao" },
] as const;

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung bình",
  ADVANCED: "Nâng cao",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-500/20 text-zinc-400",
  PENDING_REVIEW: "bg-yellow-500/20 text-yellow-400",
  PUBLISHED: "bg-green-500/20 text-green-400",
  ARCHIVED: "bg-red-500/20 text-red-400",
};

const EMPTY_FORM: ResourceFormData = {
  title: "",
  description: "",
  type: "ARTICLE",
  url: "",
  field: "FRONTEND",
  level: "BEGINNER",
};

// ─── Component ──────────────────────────────────────────
export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { confirm, ConfirmDialogUI } = useConfirmDialog();
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // ─── AI Curator state ─────────────────────────────────────
  const [curating, setCurating] = useState(false);
  const [curateProgress, setCurateProgress] = useState("");
  const [curateResult, setCurateResult] = useState<{
    saved: number; pendingReview: number; skipped: number; durationMs: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleBulkDelete = async (status: string) => {
    const statusLabel: Record<string, string> = {
      ALL: "TẤT CẢ tài liệu trong hệ thống",
      DRAFT: "nháp",
      PENDING_REVIEW: "chờ duyệt",
      PUBLISHED: "đã xuất bản",
      ARCHIVED: "lưu trữ",
    };
    const label = statusLabel[status] || status;
    const isRisky = status === "ALL" || status === "PUBLISHED";
    const ok = await confirm(
      `Xóa tất cả tài liệu ${label}?\nHành động này không thể hoàn tác.`,
      { title: "Xóa hàng loạt", confirmLabel: "Xóa", danger: isRisky }
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const url = status === "ALL"
        ? "/api/admin/resources"
        : `/api/admin/resources?status=${status}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Đã xóa ${data.deleted} tài liệu`);
        // Optimistic: xóa khỏi state ngay, không reload
        if (status === "ALL") {
          setResources([]);
          setTotalPages(1);
          setPage(1);
        } else {
          setResources((prev) => prev.filter((r) => r.status !== status));
        }
      } else {
        toast.error("Lỗi khi xóa tài liệu");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setDeleting(false);
    }
  };


  const handleCurate = async () => {
    if (curating) return;
    setCurating(true);
    setCurateResult(null);
    setCurateProgress("Đang kết nối các nguồn...");
    try {
      const res = await fetch("/api/admin/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Chỉ dùng các nguồn tiếng Việt: Viblo, YouTube VN, freeCodeCamp VN, Roadmap
          sources: ["viblo", "youtube", "freecodecamp", "roadmap"],
          maxArticles: 15,
        }),
      });
      if (!res.ok) { toast.error("Lỗi khi bắt đầu thu thập"); setCurating(false); return; }

      const progressSteps = [
        "Đang lấy bài từ Viblo.asia...",
        "Đang lấy video YouTube tiếng Việt...",
        "Đang lấy từ freeCodeCamp...",
        "Đang phân tích bằng AI...",
        "Đang lưu vào hàng đợi duyệt...",
      ];
      let stepIdx = 0;
      setCurateProgress(progressSteps[0]);

      // Poll status mỗi 4 giây
      const poll = setInterval(async () => {
        stepIdx = Math.min(stepIdx + 1, progressSteps.length - 1);
        setCurateProgress(progressSteps[stepIdx]);

        const statusRes = await fetch("/api/admin/curate");
        const data = await statusRes.json();
        if (data.status === "done") {
          clearInterval(poll);
          setCurating(false);
          setCurateProgress("");
          setCurateResult(data.result);
          loadResources();
          toast.success(`Thu thập xong! ${data.result.pendingReview} tài liệu đang chờ duyệt`);
        } else if (data.status === "error") {
          clearInterval(poll);
          setCurating(false);
          setCurateProgress("");
          toast.error("Lỗi khi thu thập tài liệu");
        }
      }, 4000);
    } catch {
      toast.error("Lỗi kết nối server");
      setCurating(false);
      setCurateProgress("");
    }
  };

  // ─── Data Fetching ──────────────────────────────────
  const loadResources = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/admin/resources?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setResources(d.resources || []);
        setTotalPages(d.totalPages || 1);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Lỗi tải dữ liệu tài liệu");
        setLoading(false);
      });
  }, [page, statusFilter]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // ─── Handlers ───────────────────────────────────────
  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error("Vui lòng điền tiêu đề và URL");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const created = await res.json();
        toast.success("Tạo tài liệu thành công");
        setShowAddDialog(false);
        setFormData(EMPTY_FORM);
        // Optimistic: thêm vào đầu danh sách, không reload
        if (created.resource) {
          setResources((prev) => [created.resource, ...prev]);
        } else {
          loadResources();
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi tạo tài liệu");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingResource) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/resources/${editingResource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Cập nhật thành công");
        setShowEditDialog(false);
        // Optimistic: cập nhật item tại chỗ, không reload
        setResources((prev) =>
          prev.map((r) =>
            r.id === editingResource.id ? { ...r, ...formData } : r
          )
        );
        setEditingResource(null);
      } else {
        toast.error("Lỗi cập nhật tài liệu");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm(`Bạn muốn xóa tài liệu "${title}"?`, {
      title: "Xóa tài liệu",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa tài liệu");
        setResources((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error("Lỗi xóa tài liệu");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic update ngay lập tức
    setResources((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: newStatus } : r)
    );
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const label =
          newStatus === "PUBLISHED" ? "Tài liệu đã được duyệt" :
          newStatus === "ARCHIVED"  ? "Tài liệu đã lưu trữ" :
          newStatus === "DRAFT"     ? "Đưa về nhuầp" :
          "Cập nhật trạng thái thành công";
        toast.success(label);
      } else {
        // Rollback nếu thất bại
        toast.error("Lỗi cập nhật trạng thái");
        loadResources();
      }
    } catch {
      toast.error("Lỗi kết nối server");
      loadResources();
    } finally {
      setApprovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || "",
      type: resource.type,
      url: resource.url,
      field: resource.field,
      level: resource.level,
    });
    setShowEditDialog(true);
  };

  // ─── Filter by search ──────────────────────────────
  const filteredResources = resources.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    const found = STATUS_OPTIONS.find((s) => s.value === status);
    return found ? found.label : status;
  };

  const getTypeLabel = (type: string) => {
    const found = TYPE_OPTIONS.find((t) => t.value === type);
    return found ? found.label : type;
  };

  // ─── Resource Form ──────────────────────────────────
  const ResourceForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Tiêu đề *</label>
        <Input
          placeholder="Nhập tiêu đề tài liệu..."
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">URL *</label>
        <Input
          placeholder="https://..."
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Loại</label>
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Lĩnh vực</label>
          <Select value={formData.field} onValueChange={(v) => setFormData({ ...formData, field: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Cấp độ</label>
          <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Mô tả</label>
        <Textarea
          placeholder="Mô tả tài liệu..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {submitting ? "Đang xử lý..." : submitLabel}
        </Button>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        {/* Tiêu đề */}
        <div>
          <h1 className="text-3xl font-bold">Quản lý tài liệu</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Quản lý tài liệu học tập và tài nguyên cho người dùng
          </p>
        </div>

        {/* Nhóm nút hành động */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Xóa tất cả — luôn hiện */}
          <Button
            variant="outline"
            className="border-red-800/50 text-red-400 hover:border-red-600 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => handleBulkDelete(statusFilter)}
            disabled={deleting || resources.length === 0}
          >
            {deleting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Trash2 className="mr-2 h-4 w-4" />}
            Xóa tất cả
          </Button>

          {/* Thu thập tự động — hành động phụ */}
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-violet-300"
              onClick={handleCurate}
              disabled={curating}
            >
              {curating
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Sparkles className="mr-2 h-4 w-4" />}
              {curating ? "Đang thu thập..." : "Thu thập tự động"}
            </Button>
            {curating && curateProgress && (
              <p className="text-xs text-violet-400 animate-pulse">{curateProgress}</p>
            )}
          </div>

          {/* Thêm tài liệu — hành động chính */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => setFormData(EMPTY_FORM)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm tài liệu
              </Button>
            </DialogTrigger>
            <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm tài liệu mới</DialogTitle>
              </DialogHeader>
              <ResourceForm onSubmit={handleCreate} submitLabel="Tạo tài liệu" />
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Kết quả curation */}
      <AnimatePresence>
        {curateResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
              <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-sm text-violet-300 font-medium">Kết quả lần cuối:</span>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">⏳ {curateResult.pendingReview} chờ duyệt</Badge>
              <Badge className="bg-zinc-500/20 text-zinc-400 text-xs">✗ {curateResult.skipped} bỏ qua</Badge>
              <span className="ml-auto text-xs text-zinc-500">{Math.round(curateResult.durationMs / 1000)}s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Tìm theo tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Dropdown bộ lọc trạng thái */}
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[160px] border-zinc-700 bg-zinc-900">
            <Filter className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>


      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass border-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Tiêu đề</TableHead>
                      <TableHead className="text-zinc-400">Loại</TableHead>
                      <TableHead className="text-zinc-400">Lĩnh vực</TableHead>
                      <TableHead className="text-zinc-400">Cấp độ</TableHead>
                      <TableHead className="text-zinc-400">Trạng thái</TableHead>
                      <TableHead className="text-zinc-400">Ngày tạo</TableHead>
                      <TableHead className="text-right text-zinc-400">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-zinc-500">
                          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          Không có tài liệu nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredResources.map((resource, idx) => (
                        <motion.tr
                          key={resource.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <TableCell className="max-w-[250px] font-medium">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate hover:text-violet-400 hover:underline underline-offset-2 transition-colors"
                                title={resource.title}
                              >
                                {resource.title}
                              </a>
                              {resource.isAiGenerated && (
                                <span title={`AI thu thập · Độ liên quan: ${resource.relevanceScore ?? "?"}/100`}>
                                  <Sparkles className="h-3 w-3 shrink-0 text-violet-400" />
                                </span>
                              )}
                            </div>
                            {resource.description && (
                              <p className="mt-0.5 truncate text-xs text-zinc-500">
                                {resource.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(resource.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-violet-500/20 text-violet-400 text-xs">
                              {resource.field}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-300">
                            {LEVEL_LABELS[resource.level] || resource.level}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${
                                STATUS_COLORS[resource.status] ||
                                "bg-zinc-500/20 text-zinc-400"
                              }`}
                            >
                              {getStatusLabel(resource.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-400">
                            {formatDate(resource.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Nút Duyệt / Từ chối — chỉ hiện khi PENDING_REVIEW */}
                              {resource.status === "PENDING_REVIEW" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusChange(resource.id, "PUBLISHED")}
                                    title="Duyệt — Xuất bản ngay"
                                    disabled={approvingIds.has(resource.id)}
                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                  >
                                    {approvingIds.has(resource.id)
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <CheckCircle2 className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusChange(resource.id, "ARCHIVED")}
                                    title="Từ chối — Lưu trữ"
                                    disabled={approvingIds.has(resource.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(resource.url, "_blank")}
                                title="Mở liên kết"
                              >
                                <ExternalLink className="h-4 w-4 text-zinc-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(resource)}
                                title="Chỉnh sửa"
                              >
                                <Pencil className="h-4 w-4 text-blue-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDelete(resource.id, resource.title)
                                }
                                title="Xóa"
                                disabled={deletingIds.has(resource.id)}
                              >
                                {deletingIds.has(resource.id)
                                  ? <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                                  : <Trash2 className="h-4 w-4 text-red-400" />}
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="border-zinc-700"
          >
            Trước
          </Button>
          <span className="text-sm text-zinc-400">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="border-zinc-700"
          >
            Sau
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài liệu</DialogTitle>
          </DialogHeader>
          <ResourceForm onSubmit={handleEdit} submitLabel="Lưu thay đổi" />
        </DialogContent>
      </Dialog>
      </div>
      <ConfirmDialogUI />
    </>
  );
}
