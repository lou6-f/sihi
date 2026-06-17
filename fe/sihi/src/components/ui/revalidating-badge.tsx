"use client";

import { Loader2 } from "lucide-react";

/**
 * Hiển thị spinner nhỏ khi SWR đang làm mới dữ liệu ngầm (revalidate).
 * Chỉ xuất hiện khi isValidating=true VÀ isLoading=false
 * (tức là đã có cached data rồi, đang cập nhật ngầm).
 */
export function RevalidatingBadge({
  isValidating,
  isLoading = false,
  label = "Đang cập nhật",
  className = "",
}: {
  isValidating: boolean;
  isLoading?: boolean;
  label?: string;
  className?: string;
}) {
  // Chỉ hiện khi revalidating + đã có data (không hiện khi đang loading lần đầu)
  if (!isValidating || isLoading) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-zinc-800/70 px-2 py-0.5 text-[11px] text-zinc-400 ${className}`}
    >
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      {label}
    </span>
  );
}
