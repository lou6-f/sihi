"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";

// ─── Inner component (needs Suspense because of useSearchParams) ──────────────
function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (completeRef.current) clearTimeout(completeRef.current);
    if (hideRef.current)    clearTimeout(hideRef.current);
  };

  // ── Start loading when user clicks an internal link ────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      // Skip external, hash-only, or javascript: links
      if (href.startsWith("http") || href.startsWith("//") ||
          href.startsWith("#")    || href.startsWith("mailto") ||
          href.startsWith("tel")) return;

      // Don't start if clicking the same page
      const targetPath = href.split("?")[0];
      if (targetPath === pathname) return;

      clearAll();
      setVisible(true);
      setWidth(0);

      // Fake incremental progress up to ~85%
      let w = 5;
      intervalRef.current = setInterval(() => {
        // Slow down as we approach 85
        const step = Math.random() * (w < 50 ? 12 : w < 70 ? 6 : 2);
        w = Math.min(w + step, 85);
        setWidth(w);
      }, 150);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Complete bar when pathname actually changes ────────────────────────────
  useEffect(() => {
    clearAll();
    setWidth(100);
    completeRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 300);
    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-violet-500 via-purple-400 to-violet-500 transition-all ease-out"
        style={{
          width: `${width}%`,
          transitionDuration: width === 100 ? "200ms" : "150ms",
          boxShadow: "0 0 8px 0 rgb(139 92 246 / 0.8)",
        }}
      />
    </div>
  );
}

// ─── Public export — wrapped in Suspense (required for useSearchParams) ───────
export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
