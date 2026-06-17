"use client";

import { useEffect, useState } from "react";
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
  Settings2, Search, Plus, CheckCircle, XCircle,
  Layers, Clock, MoreHorizontal, Pencil,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Interfaces ─────────────────────────────────────────
interface TemplateSection {
  category: string;
  questionCount: number;
}

interface Template {
  id: string;
  field: string;
  level: string;
  questionCount: number;
  isActive: boolean;
  sections: TemplateSection[];
}

// ─── Constants ──────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  DATA: "Data",
  FULLSTACK: "Fullstack",
};

const LEVEL_LABELS: Record<string, string> = {
  INTERN:   "Intern",
  FRESHER:  "Fresher",
  JUNIOR:   "Junior",
};

const FIELD_COLORS: Record<string, string> = {
  FRONTEND: "bg-blue-500/20 text-blue-400",
  BACKEND: "bg-green-500/20 text-green-400",
  DATA: "bg-orange-500/20 text-orange-400",
  FULLSTACK: "bg-violet-500/20 text-violet-400",
};

const LEVEL_COLORS: Record<string, string> = {
  INTERN: "bg-zinc-500/20 text-zinc-400",
  FRESHER: "bg-cyan-500/20 text-cyan-400",
  JUNIOR: "bg-fuchsia-500/20 text-fuchsia-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  FOUNDATION: "Kiến thức nền tảng",
  TECHNICAL: "Kỹ thuật chuyên sâu",
  PROJECT: "Kinh nghiệm dự án",
  ALGORITHM: "Thuật toán",
  SITUATIONAL: "Tình huống",
  BEHAVIORAL: "Hành vi",
};



// ─── Component ──────────────────────────────────────────
export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then((data: Array<{
        id: string; field: string; level: string;
        questionCount: number; isActive: boolean;
        sections: Array<{ category: string; questionCount: number }>;
      }>) => {
        setTemplates(
          data.map((t) => ({
            id: t.id,
            field: t.field,
            level: t.level,
            questionCount: t.questionCount,
            isActive: t.isActive,
            sections: (t.sections || []).map((s) => ({
              category: s.category,
              questionCount: s.questionCount,
            })),
          }))
        );
      })
      .catch(() => {
        // fallback: không có data
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    const newValue = !template.isActive;

    // Optimistic update
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: newValue } : t))
    );

    try {
      const res = await fetch(`/api/admin/templates/${id}/toggle`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("API error");

      toast.success(newValue ? "Đã kích hoạt template" : "Đã vô hiệu hóa template");
    } catch {
      // Rollback nếu lỗi
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !newValue } : t))
      );
      toast.error("Không thể cập nhật trạng thái template");
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchField = selectedField === "ALL" || t.field === selectedField;
    const matchSearch =
      !searchQuery ||
      t.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.level.toLowerCase().includes(searchQuery.toLowerCase());
    return matchField && matchSearch;
  });

  const totalSections = templates.reduce(
    (acc, t) => acc + t.sections.length,
    0
  );
  const activeCount = templates.filter((t) => t.isActive).length;
  const totalQuestions = templates.reduce(
    (acc, t) => acc + t.questionCount,
    0
  );

  // ─── Summary Cards ─────────────────────────────────
  const summaryCards = [
    {
      label: "Tổng Templates",
      value: templates.length,
      icon: Layers,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      label: "Đang hoạt động",
      value: activeCount,
      icon: CheckCircle,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      label: "Tổng Sections",
      value: totalSections,
      icon: Settings2,
      gradient: "from-fuchsia-500 to-pink-600",
    },
    {
      label: "Tổng câu hỏi",
      value: totalQuestions,
      icon: Clock,
      gradient: "from-blue-500 to-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Khung phỏng vấn</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Quản lý khung phỏng vấn theo lĩnh vực và cấp độ
            </p>
          </div>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => toast.info("Tính năng thêm template sắp ra mắt")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm Template
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">{c.label}</p>
                    {loading ? (
                      <Skeleton className="mt-1 h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold">{c.value}</p>
                    )}
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Tìm theo lĩnh vực hoặc cấp độ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedField === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedField("ALL")}
            className={
              selectedField === "ALL"
                ? "bg-violet-600 hover:bg-violet-700"
                : "border-zinc-700 text-zinc-400"
            }
          >
            Tất cả
          </Button>
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedField === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedField(key)}
              className={
                selectedField === key
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "border-zinc-700 text-zinc-400"
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Templates Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Lĩnh vực</TableHead>
                      <TableHead className="text-zinc-400">Cấp độ</TableHead>
                      <TableHead className="text-zinc-400">Số câu hỏi</TableHead>
                      <TableHead className="text-zinc-400">Sections</TableHead>
                      <TableHead className="text-zinc-400">Trạng thái</TableHead>
                      <TableHead className="text-right text-zinc-400">
                        Hành động
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-12 text-center text-zinc-500"
                        >
                          <Settings2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          Không tìm thấy template nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTemplates.map((template, idx) => (
                        <motion.tr
                          key={template.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <TableCell>
                            <Badge
                              className={`${
                                FIELD_COLORS[template.field] ||
                                "bg-zinc-500/20 text-zinc-400"
                              } text-xs`}
                            >
                              {FIELD_LABELS[template.field] || template.field}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${
                                LEVEL_COLORS[template.level] ||
                                "bg-zinc-500/20 text-zinc-400"
                              } text-xs`}
                            >
                              {LEVEL_LABELS[template.level] || template.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {template.questionCount} câu
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-left"
                              onClick={() =>
                                setExpandedId(
                                  expandedId === template.id
                                    ? null
                                    : template.id
                                )
                              }
                            >
                              <span className="text-sm text-zinc-300">
                                {template.sections.length} sections
                              </span>
                              {expandedId === template.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mt-2 space-y-1"
                                >
                                  {template.sections.map((s, si) => (
                                    <div
                                      key={si}
                                      className="flex items-center gap-2 text-xs text-zinc-400"
                                    >
                                      <span className="h-1 w-1 rounded-full bg-violet-400" />
                                      {CATEGORY_LABELS[s.category] ||
                                        s.category}{" "}
                                      ({s.questionCount})
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                template.isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-zinc-500/20 text-zinc-400"
                              }
                            >
                              {template.isActive
                                ? "Hoạt động"
                                : "Vô hiệu hóa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => toast.info("Tính năng chỉnh sửa đang phát triển")}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                {template.isActive ? (
                                  <DropdownMenuItem
                                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                                    onClick={() => toggleActive(template.id)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Vô hiệu hóa
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-green-400 focus:text-green-300 focus:bg-green-500/10 cursor-pointer"
                                    onClick={() => toggleActive(template.id)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Kích hoạt
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass border-0 border-l-2 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Settings2 className="mt-0.5 h-5 w-5 text-violet-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Về Khung phỏng vấn
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Mỗi template xác định cấu trúc phỏng vấn cho một lĩnh vực và
                  cấp độ cụ thể. Template bao gồm các sections với số câu hỏi
                  và rubric đánh giá riêng. Hệ thống AI sẽ sử dụng template để
                  tạo câu hỏi phù hợp cho ứng viên.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
