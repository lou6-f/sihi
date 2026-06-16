"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface InterviewGuardContextType {
  isInInterview: boolean;
  setIsInInterview: (v: boolean) => void;
  requestNavigation: (href: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────
const InterviewGuardContext = createContext<InterviewGuardContextType>({
  isInInterview: false,
  setIsInInterview: () => {},
  requestNavigation: () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────────
export function InterviewGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isInInterview, setIsInInterview] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const pendingHref = useRef<string | null>(null);

  const requestNavigation = useCallback(
    (href: string) => {
      if (isInInterview) {
        pendingHref.current = href;
        setShowModal(true);
      } else {
        router.push(href);
      }
    },
    [isInInterview, router]
  );

  const confirmLeave = () => {
    setShowModal(false);
    if (pendingHref.current) {
      setIsInInterview(false);
      router.push(pendingHref.current);
      pendingHref.current = null;
    }
  };

  const cancelLeave = () => {
    setShowModal(false);
    pendingHref.current = null;
  };

  return (
    <InterviewGuardContext.Provider value={{ isInInterview, setIsInInterview, requestNavigation }}>
      {children}

      {/* Guard Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={cancelLeave}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="text-center space-y-4">
                {/* Icon */}
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
                  <svg
                    className="h-7 w-7 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="text-base font-bold">Bạn đang trong phỏng vấn</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Thoát ra bây giờ sẽ tạm dừng phỏng vấn. Bạn có thể quay lại và tiếp tục sau.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={cancelLeave}
                    className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-sm font-medium text-white transition-colors"
                  >
                    Ở lại phỏng vấn
                  </button>
                  <button
                    onClick={confirmLeave}
                    className="w-full rounded-lg border border-zinc-700 hover:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors"
                  >
                    Thoát (có thể quay lại sau)
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </InterviewGuardContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useInterviewGuard() {
  return useContext(InterviewGuardContext);
}
