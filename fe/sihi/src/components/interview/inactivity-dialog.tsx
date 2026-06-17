"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Clock, Play, Flag } from "lucide-react";

interface InactivityDialogProps {
  open: boolean;
  idleMinutes: number;          // How many minutes user has been idle
  onContinue: () => void;       // Reset timer, close dialog
  onEndEarly: () => void;       // End interview → get report
  autoAbandonSeconds?: number;  // Countdown before auto-abandon (default 300 = 5min)
}

export function InactivityDialog({
  open,
  idleMinutes,
  onContinue,
  onEndEarly,
  autoAbandonSeconds = 300,
}: InactivityDialogProps) {
  const [countdown, setCountdown] = useState(autoAbandonSeconds);

  // Reset countdown whenever dialog opens
  useEffect(() => {
    if (!open) { setCountdown(autoAbandonSeconds); return; }
    setCountdown(autoAbandonSeconds);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, autoAbandonSeconds]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const countdownLabel = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;

  const urgency = countdown <= 60; // last minute → red

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop blur */}
          <motion.div
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog box — bottom-right corner, not full-screen */}
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-80"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
              {/* Countdown bar */}
              <div className="h-1 bg-zinc-800">
                <motion.div
                  className={`h-full ${urgency ? "bg-red-500" : "bg-violet-500"}`}
                  initial={{ width: "100%" }}
                  animate={{ width: `${(countdown / autoAbandonSeconds) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>

              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-100">
                      Bạn còn ở đây không?
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Không có thao tác trong {idleMinutes} phút
                    </p>
                  </div>
                </div>

                {/* Countdown */}
                <div className={`rounded-xl border px-4 py-2.5 text-center ${
                  urgency
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-zinc-700 bg-zinc-800/50"
                }`}>
                  <p className="text-xs text-zinc-400 mb-0.5">Tự động kết thúc sau</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    urgency ? "text-red-400" : "text-zinc-100"
                  }`}>
                    {countdownLabel}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={onContinue}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Tiếp tục phỏng vấn
                  </Button>
                  <Button
                    onClick={onEndEarly}
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2"
                  >
                    <Flag className="h-4 w-4" />
                    Kết thúc sớm &amp; nhận đánh giá
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
