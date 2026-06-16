"use client";

import { Badge } from "@/components/ui/badge";

interface ProgressBarProps {
  current: number;
  total: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  FOUNDATION: "Nền tảng",
  TECHNICAL: "Kỹ thuật",
  PROBLEM_SOLVING: "Giải quyết vấn đề",
  BEHAVIORAL: "Kỹ năng mềm",
  SITUATIONAL: "Tình huống",
};

export function InterviewProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">Tiến trình</span>
        <Badge variant="outline" className="font-mono">
          {current}/{total}
        </Badge>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { CATEGORY_LABELS };
