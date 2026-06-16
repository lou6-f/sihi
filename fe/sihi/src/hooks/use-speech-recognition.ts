"use client";

import { useState, useCallback, useRef } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * Web Speech API hook — tạo instance mới mỗi lần start()
 * để tránh lỗi "already started" / "invalid state" trên Chrome.
 */
export function useSpeechRecognition({
  lang = "vi-VN",
  continuous = true,
  interimResults = true,
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Refs giữ giá trị mới nhất mà không gây re-render / stale closure
  const recognitionRef = useRef<any>(null);
  const onResultRef   = useRef(onResult);
  const onErrorRef    = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current  = onError;

  // Check support (chỉ chạy browser-side)
  const supported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  // ── Start: luôn tạo instance mới ──────────────────────────────────────────
  const start = useCallback(() => {
    if (!supported) return;

    // Dừng instance cũ nếu còn
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang            = lang;
    rec.continuous      = continuous;
    rec.interimResults  = interimResults;
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsListening(true);

    let finalAcc = "";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalAcc += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      const display = (finalAcc + interim).trim();
      setTranscript(display);
      onResultRef.current?.(display, !interim);
    };

    rec.onerror = (event: any) => {
      const err = event.error as string;
      if (err === "not-allowed" || err === "service-not-allowed") {
        onErrorRef.current?.("Trình duyệt chưa được cấp quyền micro. Vui lòng cho phép trong cài đặt.");
        setIsListening(false);
      } else if (err === "no-speech") {
        // Không nói gì — bình thường, không báo lỗi
      } else if (err === "aborted") {
        // Dừng thủ công — bình thường
        setIsListening(false);
      } else {
        onErrorRef.current?.(err);
        setIsListening(false);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    try {
      rec.start();
    } catch (e: any) {
      // "already started" hoặc lỗi khác
      console.warn("SpeechRecognition start error:", e?.message);
      setIsListening(false);
    }
  }, [supported, lang, continuous, interimResults]);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // ── Reset transcript ───────────────────────────────────────────────────────
  const reset = useCallback(() => setTranscript(""), []);

  return { isListening, transcript, supported, start, stop, reset };
}
