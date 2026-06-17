"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Props ───────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────
export function ConfirmDialog({
  open,
  title = "Xác nhận",
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        // Overlay
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          {/* Dialog box */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 w-full max-w-sm rounded-2xl border border-violet-500/40 bg-zinc-900 p-6 shadow-2xl shadow-violet-500/10"
          >
            {/* Icon + Title */}
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-500/15" : "bg-violet-500/15"}`}>
                <AlertTriangle className={`h-5 w-5 ${danger ? "text-red-400" : "text-violet-400"}`} />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
            </div>

            {/* Message */}
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">{message}</p>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                className="border-red-700/60 text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-300"
                onClick={onCancel}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {cancelLabel}
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={onConfirm}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hook ────────────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (val: boolean) => void;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = (
    message: string,
    options?: { title?: string; confirmLabel?: string; danger?: boolean }
  ): Promise<boolean> =>
    new Promise((resolve) => {
      setState({
        open: true,
        title: options?.title ?? "Xác nhận",
        message,
        confirmLabel: options?.confirmLabel ?? "Xác nhận",
        danger: options?.danger ?? false,
        resolve,
      });
    });

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  const ConfirmDialogUI = () =>
    state ? (
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        danger={state.danger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ) : null;

  return { confirm, ConfirmDialogUI };
}
