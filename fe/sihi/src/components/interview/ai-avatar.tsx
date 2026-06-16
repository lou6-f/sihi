"use client";

import { motion } from "motion/react";
import { BrainCircuit } from "lucide-react";

interface AIAvatarProps {
  speaking?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AIAvatar({ speaking = false, size = "md" }: AIAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="relative">
      {speaking && (
        <>
          <motion.div
            className={`absolute inset-0 rounded-full bg-violet-500/20 ${sizeClasses[size]}`}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className={`absolute inset-0 rounded-full bg-violet-500/10 ${sizeClasses[size]}`}
            animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
        </>
      )}
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 ${sizeClasses[size]}`}
      >
        <BrainCircuit className={`text-white ${iconSizes[size]} ${speaking ? "animate-pulse" : ""}`} />
      </div>
    </div>
  );
}
