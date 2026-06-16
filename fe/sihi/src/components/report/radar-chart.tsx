"use client";

import { motion } from "motion/react";

interface RadarChartProps {
  data: Array<{ label: string; value: number; maxValue?: number }>;
  size?: number;
}

/**
 * Pure SVG radar chart — no external chart library needed.
 */
export function RadarChart({ data, size = 200 }: RadarChartProps) {
  if (data.length < 3) return null;

  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / data.length;

  // Generate polygon points for a ring at given fraction
  const ringPoints = (fraction: number) =>
    data
      .map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = maxRadius * fraction;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(" ");

  // Data polygon
  const dataPoints = data
    .map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const fraction = d.value / (d.maxValue || 10);
      const r = maxRadius * Math.min(1, Math.max(0, fraction));
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={ringPoints(f)}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-zinc-700"
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + maxRadius * Math.cos(angle)}
              y2={center + maxRadius * Math.sin(angle)}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-zinc-700"
            />
          );
        })}

        {/* Data polygon */}
        <motion.polygon
          points={dataPoints}
          fill="rgba(139, 92, 246, 0.15)"
          stroke="rgb(139, 92, 246)"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const fraction = d.value / (d.maxValue || 10);
          const r = maxRadius * Math.min(1, Math.max(0, fraction));
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="rgb(139, 92, 246)" />
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = maxRadius + 18;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-400 text-[10px]"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
