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
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
        active ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
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
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/30 md:flex" style={{ fontSize: "14px" }}>
        <div className="flex h-16 items-center gap-2 px-5">
          <SiHiLogo iconSize={40} textSize="1.5rem" />
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />
            );
          })}

          {session?.user?.role === "ADMIN" && (
            <>
              <Separator className="my-2 bg-zinc-800" />
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-zinc-800"
              >
                <Shield className="h-5 w-5 shrink-0" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 ring-2 ring-violet-500/30">
              {session?.user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/uploads/${(session.user.avatar as string).replace(/\\/g, "/")}`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{session?.user?.name}</p>
              <p className="truncate text-xs text-zinc-500">{session?.user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="h-4 w-4" />
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
