"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseTextToSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onStart?: () => void;
}

// ─── Voice priority list (higher index = higher priority) ───────────────────
const VOICE_PRIORITY_VI = [
  "google tiếng việt",
  "google vietnamese",
  "microsoft an online",
  "microsoft linh online",
  "microsoft nam online",
  "microsoft hoa online",
];
const VOICE_PRIORITY_EN = [
  "google us english",
  "google uk english",
  "microsoft aria online",
  "microsoft jenny online",
  "microsoft guy online",
];

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const isVI = lang.startsWith("vi");
  const priorities = isVI ? VOICE_PRIORITY_VI : VOICE_PRIORITY_EN;
  const langVoices = voices.filter((v) =>
    isVI ? v.lang.startsWith("vi") : v.lang.startsWith("en")
  );

  if (langVoices.length === 0) return null;

  // Score each voice by priority list
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of langVoices) {
    const name = voice.name.toLowerCase();
    const idx = priorities.findIndex((p) => name.includes(p));
    const score = idx >= 0 ? idx : -1;
    // Prefer remote/online voices (usually better quality)
    const qualityBonus = voice.localService ? 0 : 10;
    if (score + qualityBonus > bestScore) {
      bestScore = score + qualityBonus;
      best = voice;
    }
  }
  return best ?? langVoices[0];
}

/**
 * Tiền xử lý text trước khi đọc TTS:
 * - Loại bỏ markdown, code block, ký tự đặc biệt
 * - Chuẩn hoá số, dấu câu
 */
export function preprocessTTSText(raw: string): string {
  return raw
    // Remove code blocks ```...```
    .replace(/```[\s\S]*?```/g, ". đoạn code.")
    // Remove inline code `...`
    .replace(/`[^`]+`/g, (m) => m.replace(/`/g, " "))
    // Remove markdown bold/italic **text** or *text*
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    // Remove markdown headers ### ...
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bullet points - or *
    .replace(/^\s*[-*]\s+/gm, "")
    // Remove URLs
    .replace(/https?:\/\/\S+/g, "liên kết")
    // Remove emoji (basic range)
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    // Collapse multiple spaces/newlines
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function useTextToSpeech({
  lang = "vi-VN",
  rate = 0.95,
  pitch = 1.0,
  volume = 1.0,
  onEnd,
  onStart,
}: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fptAudioRef = useRef<HTMLAudioElement | null>(null);  // FPT audio element

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // ─── Load voices (async on Chrome) ────────────────────────────────────────
  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      if (all.length > 0) {
        setVoices(all);
        setSelectedVoice((prev) => prev ?? pickBestVoice(all, lang));
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported, lang]);

  // ─── FPT TTS (fallback khi không có giọng Việt trên browser) ─────────────────────
  const speakFPT = useCallback(
    async (text: string) => {
      // Dừng audio FPT cũ nếu đang phát
      if (fptAudioRef.current) {
        fptAudioRef.current.pause();
        fptAudioRef.current = null;
      }

      setIsSpeaking(true);
      onStart?.();

      try {
        const res = await fetch("/api/tts/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error("FPT TTS API failed");

        const { url } = await res.json();
        const audio = new Audio(url);
        audio.volume = volume;
        fptAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          fptAudioRef.current = null;
          onEnd?.();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          fptAudioRef.current = null;
          onEnd?.();
        };

        await audio.play();
      } catch (err) {
        console.warn("[FPT TTS] Lỗi:", err);
        setIsSpeaking(false);
        onEnd?.();
      }
    },
    [volume, onEnd, onStart]
  );

  // ─── Speak ───────────────────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (rawText: string) => {
      if (!supported) return;

      window.speechSynthesis.cancel();

      const text = preprocessTTSText(rawText);
      if (!text) return;

      // ─ FPT fallback: dùng khi không có giọng Việt trên browser ─
      const isVI = lang.startsWith("vi");
      const currentVoices = window.speechSynthesis.getVoices();
      const hasVIVoice = currentVoices.some((v) => v.lang.startsWith("vi"));
      if (isVI && !hasVIVoice) {
        speakFPT(text);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Use selected voice, fallback to best available
      const voice =
        selectedVoice ??
        pickBestVoice(window.speechSynthesis.getVoices(), lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        onStart?.();
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = (e) => {
        // "interrupted" is normal when we cancel manually
        if (e.error !== "interrupted") setIsSpeaking(false);
      };

      utteranceRef.current = utterance;

      // Chrome bug: speechSynthesis pauses after ~15s without this
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAlive);
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);

      window.speechSynthesis.speak(utterance);

      utterance.onend = () => {
        clearInterval(keepAlive);
        setIsSpeaking(false);
        onEnd?.();
      };
    },
    [supported, lang, rate, pitch, volume, selectedVoice, onEnd, onStart, speakFPT]
  );

  // ─── Stop ───────────────────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!supported) return;
    // Dừng cả browser TTS lẫn FPT audio
    window.speechSynthesis.cancel();
    if (fptAudioRef.current) {
      fptAudioRef.current.pause();
      fptAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, [supported]);

  // ─── Available Vietnamese voices ─────────────────────────────────────────
  const viVoices = voices.filter((v) => v.lang.startsWith("vi"));
  const enVoices = voices.filter((v) => v.lang.startsWith("en"));

  return {
    isSpeaking,
    supported,
    speak,
    stop,
    voices,
    viVoices,
    enVoices,
    selectedVoice,
    setSelectedVoice,
  };
}
