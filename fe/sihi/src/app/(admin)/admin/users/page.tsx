"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MoreHorizontal, ShieldCheck, ShieldOff } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadUsers = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("q", search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users || []); setTotalPages(d.totalPages || 1); setLoading(false); });
  };

  useEffect(() => { loadUsers(); }, [page, search]);

  const toggleActive = async (userId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) { toast.success(isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt"); loadUsers(); }
    else toast.error("Lỗi cập nhật");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quản lý người dùng</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input placeholder="Tìm theo tên hoặc email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <Card className="glass border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="p-4">Tên</th><th className="p-4">Email</th><th className="p-4">Vai trò</th>
                  <th className="p-4">PV</th><th className="p-4">Trạng thái</th><th className="p-4">Hành động</th>
                </tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="p-4 font-medium">{u.name as string}</td>
                      <td className="p-4 text-zinc-400">{u.email as string}</td>
                      <td className="p-4"><Badge variant="secondary">{{ ADMIN: "Quản trị", USER: "Người dùng" }[u.role as string] ?? (u.role as string)}</Badge></td>
                      <td className="p-4">{((u._count as Record<string, number>)?.interviews) ?? 0}</td>
                      <td className="p-4">
                        <Badge className={u.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                          {u.isActive ? "Đang hoạt động" : "Vô hiệu hóa"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900">
                            {u.isActive ? (
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                                onClick={() => toggleActive(u.id as string, u.isActive as boolean)}
                              >
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Vô hiệu hóa tài khoản
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-400 focus:text-green-300 focus:bg-green-500/10 cursor-pointer"
                                onClick={() => toggleActive(u.id as string, u.isActive as boolean)}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Kích hoạt tài khoản
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
