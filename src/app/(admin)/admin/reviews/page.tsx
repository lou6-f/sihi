"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  XCircle,
  ExternalLink,
  ClipboardList,
} from "lucide-react";

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
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────
const TYPE_OPTIONS = [
  { value: "ARTICLE", label: "Bài viết" },
  { value: "ROADMAP", label: "Roadmap" },
  { value: "VIDEO", label: "Video" },
  { value: "EXTERNAL_LINK", label: "Liên kết ngoài" },
] as const;

const FIELD_OPTIONS = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "DATA", label: "Data" },
  { value: "FULLSTACK", label: "Fullstack" },
] as const;

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

// ─── Helpers ─────────────────────────────────────────────
function getTypeLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

function getFieldLabel(field: string) {
  return FIELD_OPTIONS.find((f) => f.value === field)?.label ?? field;
}

function getLevelLabel(level: string) {
  return LEVEL_OPTIONS.find((l) => l.value === level)?.label ?? level;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────
export default function AdminReviewsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────
  const loadResources = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/resources?status=PENDING_REVIEW&limit=50")
      .then((r) => r.json())
      .then((d) => {
        setResources(d.resources || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Lỗi tải danh sách tài liệu chờ duyệt");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // ─── Handlers ───────────────────────────────────────
  const handleApprove = async (resource: Resource) => {
    setProcessingId(resource.id);
    try {
      const res = await fetch(`/api/admin/resources/${resource.id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(`Đã duyệt "${resource.title}"`);
        loadResources();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Lỗi duyệt tài liệu");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (resource: Resource) => {
    if (!confirm(`Từ chối tài liệu "${resource.title}"?`)) return;
    setProcessingId(resource.id);
    try {
      const res = await fetch(`/api/admin/resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (res.ok) {
        toast.success(`Đã từ chối "${resource.title}"`);
        loadResources();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Lỗi từ chối tài liệu");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Duyệt tài liệu</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Danh sách tài liệu chờ phê duyệt
          </p>
        </div>

        {/* Badge showing count */}
        {!loading && (
          <Badge className="bg-yellow-500/20 text-yellow-400 px-3 py-1.5 text-sm">
            {resources.length} chờ duyệt
          </Badge>
        )}
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
          transition={{ delay: 0.15 }}
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
                      <TableHead className="text-right text-zinc-400">
                        Hành động
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-16 text-center text-zinc-500"
                        >
                          <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
                          <p className="text-sm">
                            Không có tài liệu nào chờ duyệt
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      resources.map((resource, idx) => (
                        <motion.tr
                          key={resource.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          {/* Title + description */}
                          <TableCell className="max-w-[260px] font-medium">
                            <div
                              className="truncate"
                              title={resource.title}
                            >
                              {resource.title}
                            </div>
                            {resource.description && (
                              <p className="mt-0.5 truncate text-xs text-zinc-500">
                                {resource.description}
                              </p>
                            )}
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(resource.type)}
                            </Badge>
                          </TableCell>

                          {/* Field */}
                          <TableCell>
                            <Badge className="bg-violet-500/20 text-violet-400 text-xs">
                              {getFieldLabel(resource.field)}
                            </Badge>
                          </TableCell>

                          {/* Level */}
                          <TableCell className="text-sm text-zinc-300">
                            {getLevelLabel(resource.level)}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                              Chờ duyệt
                            </Badge>
                          </TableCell>

                          {/* Created at */}
                          <TableCell className="text-sm text-zinc-400">
                            {formatDate(resource.createdAt)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Open URL */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(resource.url, "_blank")
                                }
                                title="Mở liên kết"
                              >
                                <ExternalLink className="h-4 w-4 text-zinc-400" />
                              </Button>

                              {/* Approve */}
                              <Button
                                size="sm"
                                disabled={processingId === resource.id}
                                onClick={() => handleApprove(resource)}
                                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                                title="Duyệt tài liệu"
                              >
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                Duyệt
                              </Button>

                              {/* Reject */}
                              <Button
                                size="sm"
                                disabled={processingId === resource.id}
                                onClick={() => handleReject(resource)}
                                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                title="Từ chối tài liệu"
                              >
                                <XCircle className="mr-1.5 h-4 w-4" />
                                Từ chối
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
    </div>
  );
}
