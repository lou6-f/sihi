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

// ─── FPT AI voices ───────────────────────────────────────────────────────────
export const FPT_VOICES = [
  { id: "banmai",    label: "Ban Mai",    gender: "Nữ",  region: "Bắc" },
  { id: "leminh",   label: "Lê Minh",    gender: "Nam", region: "Bắc" },
  { id: "thuminh",  label: "Thu Minh",   gender: "Nữ",  region: "Bắc" },
  { id: "lannhi",   label: "Lan Nhi",    gender: "Nữ",  region: "Bắc" },
  { id: "minhquang",label: "Minh Quang", gender: "Nam", region: "Bắc" },
  { id: "myan",     label: "Mỹ An",      gender: "Nữ",  region: "Nam" },
  { id: "giahuy",   label: "Gia Huy",    gender: "Nam", region: "Nam" },
  { id: "linhsan",  label: "Linh San",   gender: "Nữ",  region: "Trung" },
] as const;

export type FptVoiceId = typeof FPT_VOICES[number]["id"];

// ─── Voice priority list (higher index = higher priority) ────────────────────
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

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of langVoices) {
    const name = voice.name.toLowerCase();
    const idx = priorities.findIndex((p) => name.includes(p));
    const score = idx >= 0 ? idx : -1;
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
    .replace(/```[\s\S]*?```/g, ". đoạn code.")
    .replace(/`[^`]+`/g, (m) => m.replace(/`/g, " "))
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/https?:\/\/\S+/g, "liên kết")
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
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
  // FPT voice: null = dùng browser, string = dùng FPT với voice id này
  const [selectedFptVoice, setSelectedFptVoice] = useState<FptVoiceId | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fptAudioRef = useRef<HTMLAudioElement | null>(null);

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // ─── Load browser voices (async on Chrome) ────────────────────────────────
  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      if (all.length > 0) {
        setVoices(all);
        // Chỉ auto-set browser voice nếu chưa chọn FPT
        setSelectedVoice((prev) => prev ?? pickBestVoice(all, lang));
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported, lang]);

  // ─── FPT TTS ─────────────────────────────────────────────────────────────
  const speakFPT = useCallback(
    async (text: string, voiceId?: FptVoiceId | null) => {
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
          body: JSON.stringify({ text, voice: voiceId ?? undefined }),
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

  // ─── Speak ────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (rawText: string) => {
      const text = preprocessTTSText(rawText);
      if (!text) return;

      // 1. User đã chọn FPT voice → luôn dùng FPT
      if (selectedFptVoice) {
        if (supported) window.speechSynthesis.cancel();
        speakFPT(text, selectedFptVoice);
        return;
      }

      // 2. Browser không hỗ trợ speech → dùng FPT default
      if (!supported) {
        speakFPT(text, null);
        return;
      }

      window.speechSynthesis.cancel();

      // 3. Không có giọng Việt trên browser → FPT fallback tự động
      const isVI = lang.startsWith("vi");
      const currentVoices = window.speechSynthesis.getVoices();
      const hasVIVoice = currentVoices.some((v) => v.lang.startsWith("vi"));
      if (isVI && !hasVIVoice) {
        speakFPT(text, null); // dùng voice mặc định từ .env
        return;
      }

      // 4. Dùng browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voice = selectedVoice ?? pickBestVoice(currentVoices, lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        onStart?.();
      };
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") setIsSpeaking(false);
      };

      utteranceRef.current = utterance;

      // Chrome bug: speechSynthesis pauses after ~15s
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
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
    [supported, lang, rate, pitch, volume, selectedVoice, selectedFptVoice, onEnd, onStart, speakFPT]
  );

  // ─── Stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    if (fptAudioRef.current) {
      fptAudioRef.current.pause();
      fptAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, [supported]);

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
    // FPT
    fptVoices: FPT_VOICES,
    selectedFptVoice,
    setSelectedFptVoice,
  };
}
