"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users, FileText, Settings2,
  Activity, BarChart3, ChevronLeft, LogOut, Menu, X, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiHiLogo } from "@/components/shared/sihi-logo";

const adminNavItems = [
  { href: "/admin/stats",      label: "Thống kê chi tiết",    icon: BarChart3       },
  { href: "/admin/users",      label: "Quản lý người dùng",   icon: Users           },
  { href: "/admin/resources",  label: "Quản lý tài liệu",     icon: FileText        },
  { href: "/admin/templates",  label: "Khung phỏng vấn",      icon: Settings2       },
  { href: "/admin/ai-monitor", label: "Giám sát AI",           icon: Activity        },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const initials = session?.user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div className="flex h-screen bg-background text-zinc-100">

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/30 md:flex" style={{ fontSize: "14px" }}>

        {/* Logo + Admin badge */}
        <div className="flex h-16 items-center gap-2 px-5">
          <SiHiLogo iconSize={40} textSize="1.5rem" />
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
            Admin
          </span>
        </div>

        {/* Nút về trang chính — nằm ngay dưới logo */}
        <div className="px-3 pb-2">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Về trang chính
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-3 mb-2 border-t border-zinc-800" />

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-zinc-100 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user info + logout */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 ring-2 ring-amber-500/30">
              {session?.user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/uploads/${(session.user.avatar as string).replace(/\\/g, "/")}`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{session?.user?.name}</p>
              <p className="truncate text-xs text-zinc-500">{session?.user?.email}</p>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-red-400"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Mobile topbar ────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <SiHiLogo iconSize={24} textSize="1rem" />
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* ── Mobile menu overlay ──────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/95 pt-14 md:hidden" onClick={() => setMobileOpen(false)}>
          <nav className="space-y-1 p-4">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-zinc-300 hover:bg-zinc-800"
              >
                <item.icon className="h-5 w-5" />{item.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-zinc-800 mt-3">
              <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-4 py-3 text-zinc-400 hover:bg-zinc-800">
                <ChevronLeft className="h-5 w-5" /> Về trang chính
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-400 hover:bg-zinc-800"
              >
                <LogOut className="h-5 w-5" /> Đăng xuất
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>

    </div>
  );
}
