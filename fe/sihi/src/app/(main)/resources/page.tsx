"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { RevalidatingBadge } from "@/components/ui/revalidating-badge";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Search, BookOpen, Sparkles } from "lucide-react";

interface Resource { id: string; title: string; description?: string; type: string; url: string; field: string; level: string; }
interface Recommendation { id: string; reason: string; resource: Resource; }

const TYPE_LABELS: Record<string, string> = { ARTICLE: "Bài viết", ROADMAP: "Lộ trình", VIDEO: "Video", EXTERNAL_LINK: "Liên kết" };
const LEVEL_LABELS: Record<string, string> = { BEGINNER: "Cơ bản", INTERMEDIATE: "Trung bình", ADVANCED: "Nâng cao" };
const LEVEL_COLORS: Record<string, string> = { BEGINNER: "bg-green-500/20 text-green-400", INTERMEDIATE: "bg-yellow-500/20 text-yellow-400", ADVANCED: "bg-red-500/20 text-red-400" };

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  // Debounce search — tránh gọi API mỗi ký tự gõ (giảm từ N calls → 1 call/300ms)
  const debouncedSearch = useDebounce(search, 300);

  // SWR: resources — key thay đổi khi filter thay đổi (sau debounce)
  const params = new URLSearchParams();
  if (debouncedSearch) params.set("q", debouncedSearch);
  if (fieldFilter !== "all") params.set("field", fieldFilter);
  if (levelFilter !== "all") params.set("level", levelFilter);

  const { data: resData, isLoading, isValidating } = useSWR<{ resources: Resource[] }>(
    `/api/resources?${params}`,
    fetcher
  );

  // SWR: recommended — key TĨNH, chỉ fetch 1 lần rồi cache
  // Không phụ thuộc vào filter nên không re-fetch khi user thay đổi tìm kiếm
  const { data: recData } = useSWR<Recommendation[]>(
    "/api/resources/recommended",
    async (url: string) => {
      const res = await fetch(url);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  );

  const resources = resData?.resources || [];
  const recommended = recData || [];
  const loading = isLoading;
  const revalidating = isValidating && !isLoading;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
          Tài liệu học tập
          <RevalidatingBadge isValidating={revalidating} label="Đang cập nhật" />
        </h1>
        <p className="text-zinc-400">Khám phá tài liệu phù hợp với bạn</p>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Tìm kiếm tài liệu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Lĩnh vực" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="FRONTEND">Frontend</SelectItem>
            <SelectItem value="BACKEND">Backend</SelectItem>
            <SelectItem value="DATA">Data</SelectItem>
            <SelectItem value="FULLSTACK">Fullstack</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Cấp độ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="BEGINNER">Cơ bản</SelectItem>
            <SelectItem value="INTERMEDIATE">Trung bình</SelectItem>
            <SelectItem value="ADVANCED">Nâng cao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recommended.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-violet-400" /> Gợi ý cho bạn
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {recommended.slice(0, 4).map((rec) => (
              <a key={rec.id} href={rec.resource.url} target="_blank" rel="noopener noreferrer">
                <Card className="glass glass-hover cursor-pointer border-violet-500/20 border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm">{rec.resource.title}</h3>
                      <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{rec.reason}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-violet-400" /> Tất cả tài liệu
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32" />)}</div>
        ) : resources.length === 0 ? (
          <p className="py-6 text-center text-zinc-500">Không tìm thấy tài liệu phù hợp.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((res, i) => (
              <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <a href={res.url} target="_blank" rel="noopener noreferrer">
                  <Card className="glass glass-hover cursor-pointer border-0 h-full">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm line-clamp-2">{res.title}</h3>
                        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5" />
                      </div>
                      {res.description && <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{res.description}</p>}
                      <div className="mt-auto flex items-center gap-2 pt-3">
                        <Badge variant="secondary" className="text-xs">{TYPE_LABELS[res.type] || res.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{res.field}</Badge>
                        <Badge className={`text-xs ${LEVEL_COLORS[res.level] || ""}`}>{LEVEL_LABELS[res.level] || res.level}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
