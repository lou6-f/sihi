"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings2,
  Activity,
  BarChart3,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/resources", label: "Tài liệu", icon: FileText },
  { href: "/admin/templates", label: "Templates", icon: Settings2 },
  { href: "/admin/ai-monitor", label: "AI Monitor", icon: Activity },
  { href: "/admin/stats", label: "Thống kê", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/50 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            SiHi
          </span>
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
            Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-violet-500/20 text-violet-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-zinc-400">
              <ChevronLeft className="h-4 w-4" />
              Về trang chính
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
