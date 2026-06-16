"use client";

import { Badge } from "@/components/ui/badge";

interface ReadinessBadgeProps {
  level: string;
  size?: "sm" | "md";
}

const READINESS_CONFIG: Record<string, { label: string; className: string; emoji: string }> = {
  READY: { label: "Sẵn sàng", className: "bg-green-500/20 text-green-400 border-green-500/30", emoji: "🚀" },
  GOOD: { label: "Tốt", className: "bg-blue-500/20 text-blue-400 border-blue-500/30", emoji: "💪" },
  NEEDS_PRACTICE: { label: "Cần luyện thêm", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", emoji: "📝" },
  NOT_READY: { label: "Chưa sẵn sàng", className: "bg-red-500/20 text-red-400 border-red-500/30", emoji: "📚" },
};

export function ReadinessBadge({ level, size = "md" }: ReadinessBadgeProps) {
  const config = READINESS_CONFIG[level] || READINESS_CONFIG.NOT_READY;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
    >
      {config.emoji} {config.label}
    </Badge>
  );
}
