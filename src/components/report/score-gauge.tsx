"use client";

import { motion } from "motion/react";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function ScoreGauge({ score, maxScore = 100, label, size = "md" }: ScoreGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const radius = size === "sm" ? 36 : size === "md" ? 50 : 64;
  const strokeWidth = size === "sm" ? 5 : size === "md" ? 6 : 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  const getColor = (pct: number) => {
    if (pct >= 80) return { stroke: "#22c55e", text: "text-green-400" };
    if (pct >= 60) return { stroke: "#a78bfa", text: "text-violet-400" };
    if (pct >= 40) return { stroke: "#eab308", text: "text-yellow-400" };
    return { stroke: "#ef4444", text: "text-red-400" };
  };

  const color = getColor(percentage);
  const fontSize = size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-4xl";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
          />
          {/* Progress circle */}
          <motion.circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize} ${color.text}`}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="mt-2 text-sm text-zinc-400">{label}</span>}
    </div>
  );
}
