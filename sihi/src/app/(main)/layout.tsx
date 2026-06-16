"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard, BrainCircuit, Clock, BookOpen, BarChart3,
  User, Shield, LogOut, Menu, X, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SiHiLogo } from "@/components/shared/sihi-logo";
import { InterviewGuardProvider, useInterviewGuard } from "@/contexts/interview-guard-context";

const navItems = [
  { href: "/dashboard", label: "Trang chủ",    icon: LayoutDashboard },
  { href: "/interview", label: "Phỏng vấn",   icon: BrainCircuit    },
  { href: "/cv",        label: "Quản lý CV",  icon: FileText        },
  { href: "/history",   label: "Lịch sử",     icon: Clock           },
  { href: "/resources", label: "Tài liệu",    icon: BookOpen        },
  { href: "/analytics", label: "Phân tích",   icon: BarChart3       },
  { href: "/profile",   label: "Hồ sơ",       icon: User            },
];

// ─── Guarded nav link — intercepts when user is mid-interview ───────────────
function NavLink({
  href, label, icon: Icon, active, mobile = false, onClick,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; mobile?: boolean; onClick?: () => void;
}) {
  const { isInInterview, requestNavigation } = useInterviewGuard();

  const handleClick = (e: React.MouseEvent) => {
    // Always allow navigating TO the interview page itself
    if (isInInterview && !href.startsWith("/interview/")) {
      e.preventDefault();
      onClick?.();
      requestNavigation(href);
    } else {
      onClick?.();
    }
  };

  if (mobile) {
    return (
      <Link
        href={href}
        onClick={handleClick}
        className="flex items-center gap-3 rounded-lg px-4 py-3 text-zinc-300 hover:bg-zinc-800"
      >
        <Icon className="h-5 w-5" />{label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-center gap-5 rounded-2xl px-5 py-4 text-base font-semibold transition-all ${
        active ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-6 w-6 shrink-0" />
      {label}
    </Link>
  );
}

// ─── Inner layout (needs access to hook inside provider) ────────────────────
function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = session?.user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar — giữ cỡ chữ 16px để không bị ảnh hưởng bởi html font-size 17px */}
      <aside className="hidden w-96 flex-col border-r border-zinc-800 bg-zinc-900/30 md:flex" style={{ fontSize: "16px" }}>
        <div className="flex h-28 items-center gap-3 px-8">
          <SiHiLogo iconSize={60} textSize="2.2rem" />
        </div>

        <nav className="flex-1 space-y-1.5 px-5 py-6">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />
            );
          })}

          {session?.user?.role === "ADMIN" && (
            <>
              <Separator className="my-3 bg-zinc-800" />
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-5 rounded-2xl px-5 py-4 text-lg font-semibold text-amber-400 hover:bg-zinc-800"
              >
                <Shield className="h-6 w-6 shrink-0" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-zinc-800 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-violet-600 text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-lg font-bold">{session?.user?.name}</p>
              <p className="truncate text-sm text-zinc-500">{session?.user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-400" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <SiHiLogo iconSize={24} textSize="1rem" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/95 pt-14 md:hidden" onClick={() => setMobileOpen(false)}>
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href} href={item.href} label={item.label} icon={item.icon}
                active={false} mobile
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

// ─── Default export — wraps with provider ────────────────────────────────────
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <InterviewGuardProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </InterviewGuardProvider>
  );
}
