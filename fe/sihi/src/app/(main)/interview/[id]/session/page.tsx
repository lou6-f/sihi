"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, StopCircle, BrainCircuit, User, Loader2,
  AlertCircle, Mic, MicOff, Volume2, VolumeX, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useTextToSpeech, FPT_VOICES } from "@/hooks/use-text-to-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useInterviewGuard } from "@/contexts/interview-guard-context";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InactivityDialog } from "@/components/interview/inactivity-dialog";

const INACTIVITY_MS = 10 * 60 * 1000; // 10 phút
const AUTO_ABANDON_S = 5 * 60;        // 5 phút countdown

// ─── IT Tips for loading screen ──────────────────────────────────────────────
const IT_TIPS = [
  "useCallback và useMemo trong React giúp tránh re-render không cần thiết khi state thay đổi.",
  "HTTP/2 hỗ trợ multiplexing, cho phép nhiều request chạy trên cùng một TCP connection, giảm đáng kể độ trễ.",
  "Index trong SQL hoạt động giống mục lục sách, giúp database tìm dữ liệu mà không cần quét toàn bộ bảng.",
  "JWT gồm 3 phần Header.Payload.Signature. Chỉ có Signature là bí mật, còn Payload có thể decode mà không cần key.",
  "O(n log n) là độ phức tạp tốt nhất có thể đạt được với các thuật toán sắp xếp dựa trên so sánh.",
  "Docker container chia sẻ kernel với host OS nên nhẹ hơn VM, nhưng vẫn đảm bảo cách ly ở mức OS process.",
  "useState trong React hoạt động bất đồng bộ, vì vậy không nên đọc giá trị state ngay sau khi gọi setState.",
  "Deadlock xảy ra khi hai process cùng chờ nhau giải phóng resource. Giải pháp là dùng timeout hoặc quy ước thứ tự lock nhất quán.",
  "Flexbox xử lý layout theo một chiều còn Grid xử lý hai chiều. Chọn đúng công cụ sẽ giúp code CSS gọn và dễ bảo trì hơn.",
  "CAP Theorem phát biểu rằng hệ thống phân tán chỉ đảm bảo được 2 trong 3 tính chất: Consistency, Availability và Partition Tolerance.",
];

interface Message {
  id: string;
  role: string;
  content: string;
  questionNumber?: number;
  category?: string;
  action?: string;
  createdAt?: string;
}

interface InterviewData {
  id: string;
  field: string;
  level: string;
  status: string;
  maxQuestions: number;
  questionCount: number;
}

// ─── Action Badge Labels ─────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  FOLLOW_UP: "⬆ Follow-up",
  DEEP_DIVE: "🔍 Deep dive",
  GIVE_HINT: "💡 Gợi ý",
  REDUCE_DIFFICULTY: "⬇ Đơn giản hơn",
  PROJECT_DISCUSSION: "📋 Project",
  CLARIFY_ANSWER: "❓ Làm rõ",
  EXPLAIN_BRIEFLY: "📖 Giải thích",
};

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const [error, setError] = useState("");
  const [vocalWarning, setVocalWarning] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showInactivityDialog, setShowInactivityDialog] = useState(false);
  const [finishing, setFinishing] = useState(false); // loading khi kết thúc sớm
  const [isReadonly, setIsReadonly] = useState(false); // true khi xem lại buổi đã hoàn thành
  const interviewActiveRef = useRef(false);
  const isCompletedRef = useRef(false);
  const { setIsInInterview } = useInterviewGuard();
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * IT_TIPS.length));
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingStartRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenIdRef = useRef<string>("");

  // ─── Reset inactivity timer ────────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (!interviewActiveRef.current || isCompletedRef.current) return;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowInactivityDialog(false);
    inactivityTimerRef.current = setTimeout(() => {
      if (interviewActiveRef.current && !isCompletedRef.current) {
        setShowInactivityDialog(true);
      }
    }, INACTIVITY_MS);
  }, []);

  // Loading steps for progress UI
  const LOADING_STEPS = useMemo(() => [
    { label: "Đang kết nối...",             detail: "Thiết lập phiên phỏng vấn" },
    { label: "Đang phân tích hồ sơ...",     detail: "Đọc CV và thông tin công việc" },
    { label: "Đang tạo kế hoạch câu hỏi...",detail: "AI đang xây dựng lộ trình phỏng vấn" },
    { label: "Chuẩn bị câu hỏi đầu tiên...",detail: "Sắp sẵn sàng!" },
  ], []);

  // Auto-advance loading steps + rotate IT tips
  useEffect(() => {
    if (!loading) return;
    const timers = [
      setTimeout(() => setLoadingStep(1), 1500),
      setTimeout(() => setLoadingStep(2), 4000),
      setTimeout(() => setLoadingStep(3), 8000),
    ];
    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % IT_TIPS.length);
    }, 4000);
    return () => { timers.forEach(clearTimeout); clearInterval(tipInterval); };
  }, [loading]);

  // Tầng 3: sendBeacon + Navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!interviewActiveRef.current || isCompletedRef.current) return;
      e.preventDefault();
      e.returnValue = "Bạn đang trong phỏng vấn. Thoát ra sẽ mất tiến trình!";
      // Tầng 3: gửi beacon để đánh dấu ABANDONED
      navigator.sendBeacon(`/api/interviews/${id}/abandon`);
    };
    const handlePopState = () => {
      if (!interviewActiveRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setShowExitModal(true);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      // Cleanup inactivity timer
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [id]);

  // Tầng 2: attach inactivity event listeners when interview starts
  useEffect(() => {
    if (!interviewActiveRef.current) return;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer(); // start timer immediately
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview, resetInactivityTimer]);

  // ─── TTS Hook ──────────────────────────────────────────────────────────────
  const { isSpeaking, supported: ttsSupported, speak, stop: stopSpeaking,
    viVoices, enVoices, selectedVoice, setSelectedVoice,
    fptVoices, selectedFptVoice, setSelectedFptVoice,
  } = useTextToSpeech({
    lang: "vi-VN",
    rate: 1.0,
  });

  // ─── STT Hook ──────────────────────────────────────────────────────────────
  const { isListening, transcript, supported: sttSupported, start: startListening, stop: stopListening } =
    useSpeechRecognition({
      lang: "vi-VN",
      continuous: true,
      interimResults: true,
      onResult: (text) => {
        setInput(text);
        if (!recordingStartRef.current) {
          recordingStartRef.current = Date.now();
        }
      },
      onError: (err) => {
        if (err !== "no-speech") toast.error(`Lỗi nhận giọng nói: ${err}`);
      },
    });

  // ─── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiThinking]);

  // ─── Auto-speak new AI messages ────────────────────────────────────────────
  useEffect(() => {
    if (!ttsEnabled || !ttsSupported) return;
    const aiMessages = messages.filter((m) => m.role === "AI");
    if (aiMessages.length === 0) return;
    const latest = aiMessages[aiMessages.length - 1];
    if (latest.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = latest.id;
      speak(latest.content);
    }
  }, [messages, ttsEnabled, ttsSupported, speak]);

  // ─── Load interview ────────────────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    setAiThinking(true);
    try {
      const res = await fetch(`/api/interviews/${id}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Không thể bắt đầu phỏng vấn");
        setAiThinking(false);
        return;
      }
      const data = await res.json();
      const firstQ = data.firstQuestion;
      const aiMsg: Message = {
        id: `start-${Date.now()}`,
        role: "AI",
        content: firstQ.question,
        questionNumber: 1,
        category: firstQ.category,
      };
      setMessages([aiMsg]);
      setQuestionNum(1);
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    }
    setAiThinking(false);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const [ivRes, msgRes] = await Promise.all([
          fetch(`/api/interviews/${id}`),
          fetch(`/api/interviews/${id}/messages`),
        ]);

        if (!ivRes.ok) { setError("Phỏng vấn không tồn tại"); setLoading(false); return; }

        const ivData = await ivRes.json();
        setInterview(ivData);

        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
          const lastQ = (msgData.messages || [])
            .filter((m: Message) => m.role === "AI" && m.questionNumber)
            .pop();
          setQuestionNum(lastQ?.questionNumber || 0);
        }

        if (ivData.status === "COMPLETED") {
          // Buổi đã kết thúc → hiển thị chế độ xem lại (readonly), không kích hoạt timer
          setIsReadonly(true);
          setLoading(false);
          return;
        }

        if (ivData.status === "CREATED" || ivData.questionCount === 0) {
          await startInterview();
        }
        interviewActiveRef.current = true;
        setIsInInterview(true);
        resetInactivityTimer(); // ← start 10-min inactivity timer

        setLoading(false);
      } catch {
        setError("Lỗi tải phỏng vấn");
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Mic toggle ───────────────────────────────────────────────────────────
  const handleMicToggle = () => {
    if (!sttSupported) {
      toast.error("Trình duyệt không hỗ trợ nhận dạng giọng nói");
      return;
    }
    if (isListening) {
      stopListening();
      textareaRef.current?.focus();
    } else {
      // Stop TTS if playing when user starts speaking
      if (isSpeaking) stopSpeaking();
      setInput("");
      recordingStartRef.current = Date.now();
      startListening();
    }
  };

  // ─── Send answer ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || sending || aiThinking) return;

    // Stop recording / TTS
    if (isListening) stopListening();
    if (isSpeaking) stopSpeaking();

    const userAnswer = input.trim();
    const answerStartedAt = recordingStartRef.current
      ? new Date(recordingStartRef.current).toISOString()
      : new Date().toISOString();
    const answerEndedAt = new Date().toISOString();
    const recordingDurationMs = recordingStartRef.current
      ? Date.now() - recordingStartRef.current
      : undefined;

    setInput("");
    setVocalWarning(null);
    setSending(true);
    resetInactivityTimer(); // reset on every answer sent

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "USER",
      content: userAnswer,
      questionNumber: questionNum,
    };
    setMessages((prev) => [...prev, userMsg]);

    setAiThinking(true);
    try {
      const res = await fetch(`/api/interviews/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: userAnswer,
          questionNumber: questionNum,
          recordingDurationMs,
          startedAt: answerStartedAt,
          endedAt: answerEndedAt,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        toast.error(errData.error || "Lỗi xử lý câu trả lời");
        setAiThinking(false);
        setSending(false);
        return;
      }

      const result = await res.json();

      if (result.vocalWarning) setVocalWarning(result.vocalWarning);

      if (result.isComplete) {
        isCompletedRef.current = true;
        interviewActiveRef.current = false;
        setIsInInterview(false);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        setShowInactivityDialog(false);
        const endMsg: Message = {
          id: `end-${Date.now()}`,
          role: "AI",
          content: "🎉 Cảm ơn bạn đã hoàn thành buổi phỏng vấn!\n\nTôi đang tổng hợp đánh giá chi tiết. Bạn sẽ được chuyển sang trang báo cáo ngay.",
        };
        setMessages((prev) => [...prev, endMsg]);
        toast.success("Phỏng vấn hoàn thành!");
        await fetch(`/api/interviews/${id}/report`, { method: "POST" }).catch(() => {});
        setTimeout(() => router.push(`/interview/${id}/report`), 2500);
      } else if (result.nextQuestion) {
        const isNewQuestion = result.action === "ASK_NEW_QUESTION";
        const nextNum = isNewQuestion ? questionNum + 1 : questionNum;
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "AI",
          content: result.nextQuestion.question,
          questionNumber: isNewQuestion ? nextNum : undefined,
          category: result.nextQuestion.category,
          action: result.action,
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (isNewQuestion) setQuestionNum(nextNum);
      }
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    }

    setAiThinking(false);
    setSending(false);
    recordingStartRef.current = null;
  };

  // ─── End interview (manual / exit modal) ──────────────────────────────────
  const doEnd = async () => {
    isCompletedRef.current = true;
    interviewActiveRef.current = false;
    setIsInInterview(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowInactivityDialog(false);
    setShowExitModal(false);
    stopSpeaking();
    if (isListening) stopListening();

    // Hiện loading overlay ngay lập tức
    setFinishing(true);

    try {
      await fetch(`/api/interviews/${id}/end`, { method: "POST" });
      await fetch(`/api/interviews/${id}/report`, { method: "POST" }).catch(() => {});
      router.push(`/interview/${id}/report`);
    } catch {
      router.push(`/interview/${id}/report`);
    }
  };

  // Tầng 2 handlers — InactivityDialog
  const handleEndEarly = async () => {
    setShowInactivityDialog(false);
    await doEnd();
  };
  const handleContinueFromDialog = () => {
    setShowInactivityDialog(false);
    resetInactivityTimer();
  };

  const handleEnd = () => setShowExitModal(true);

  // ─── Loading / Error States ───────────────────────────────────────────────
  // ─── Finishing overlay (kết thúc sớm) ──────────────────────────────────────
  if (finishing) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm w-full px-6"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-violet-500/10 animate-ping" style={{ animationDelay: "0.3s" }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30">
            <BrainCircuit className="h-12 w-12 text-violet-400" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-zinc-100">Đang tổng hợp đánh giá...</p>
          <p className="text-sm text-zinc-400">AI đang phân tích buổi phỏng vấn của bạn</p>
          <p className="text-xs text-zinc-600">Quá trình này có thể mất 15-30 giây</p>
        </div>
        <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-1 rounded-full bg-violet-500"
            animate={{ width: ["0%", "85%"] }}
            transition={{ duration: 25, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8 max-w-sm w-full px-6"
      >
        {/* Animated brain icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-violet-500/10 animate-ping" style={{ animationDelay: "0.3s" }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30">
            <BrainCircuit className="h-12 w-12 text-violet-400" />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {LOADING_STEPS.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: idx <= loadingStep ? 1 : 0.25, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 text-left"
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                idx < loadingStep  ? "border-green-500 bg-green-500/20" :
                idx === loadingStep ? "border-violet-500 bg-violet-500/20" :
                "border-zinc-700 bg-zinc-900"
              }`}>
                {idx < loadingStep  ? <span className="text-green-400 text-xs">✓</span> :
                 idx === loadingStep ? <Loader2 className="h-3 w-3 text-violet-400 animate-spin" /> :
                 <span className="text-zinc-600 text-xs">{idx + 1}</span>}
              </div>
              <div>
                <p className={`text-sm font-medium ${ idx <= loadingStep ? "text-zinc-200" : "text-zinc-600" }`}>
                  {step.label}
                </p>
                {idx === loadingStep && (
                  <p className="text-xs text-zinc-500">{step.detail}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-zinc-800">
          <motion.div
            className="h-1 rounded-full bg-violet-500"
            animate={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {/* IT Tip — rotates every 4s */}
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-4 py-3"
        >
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-violet-400 font-medium">💡 Kiến thức: </span>
            {IT_TIPS[tipIndex]}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-red-400" />
        <p className="text-red-400">{error}</p>
        <Button onClick={() => router.push("/interview")} variant="outline">Quay lại</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-5 w-5 text-violet-400" />
          <h1 className="font-semibold">Phỏng vấn {interview?.field}</h1>
          <Badge variant="secondary">{interview?.level}</Badge>
        </div>
        <div className="flex items-center gap-2">


          {/* Voice selector — hiện cả browser lẫn FPT AI */}
          {ttsSupported && ttsEnabled && (
            <Select
              value={
                selectedFptVoice
                  ? `fpt:${selectedFptVoice}`
                  : selectedVoice
                  ? `browser:${selectedVoice.name}`
                  : ""
              }
              onValueChange={(val) => {
                if (val.startsWith("fpt:")) {
                  const voiceId = val.slice(4) as typeof FPT_VOICES[number]["id"];
                  setSelectedFptVoice(voiceId);
                  setSelectedVoice(null);
                } else if (val.startsWith("browser:")) {
                  const name = val.slice(8);
                  const all = [...viVoices, ...enVoices];
                  const v = all.find((v) => v.name === name);
                  if (v) { setSelectedVoice(v); setSelectedFptVoice(null); }
                }
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs border-zinc-700 bg-zinc-900">
                <Volume2 className="h-3 w-3 mr-1 text-violet-400" />
                <SelectValue placeholder="Chọn giọng" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {/* FPT AI voices — luôn hiện */}
                <div className="px-2 py-1 text-xs text-violet-400 font-medium">🤖 FPT AI</div>
                {fptVoices.map((v) => (
                  <SelectItem key={v.id} value={`fpt:${v.id}`} className="text-xs">
                    {v.label}
                    <span className="ml-1 text-zinc-500">{v.gender} · {v.region}</span>
                  </SelectItem>
                ))}
                {/* Browser voices */}
                {(viVoices.length > 0 || enVoices.length > 0) && (
                  <>
                    {viVoices.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-zinc-500 font-medium mt-1">🇻🇳 Browser · Tiếng Việt</div>
                        {viVoices.map((v) => (
                          <SelectItem key={v.name} value={`browser:${v.name}`} className="text-xs">
                            {v.name.replace(/Microsoft |Google /i, "")}
                            {!v.localService && " ✦"}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {enVoices.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-zinc-500 font-medium mt-1">🇺🇸 Browser · English</div>
                        {enVoices.map((v) => (
                          <SelectItem key={v.name} value={`browser:${v.name}`} className="text-xs">
                            {v.name.replace(/Microsoft |Google /i, "")}
                            {!v.localService && " ✦"}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          )}

          {/* TTS toggle */}
          {ttsSupported && (
            <Button
              variant="ghost"
              size="sm"
              title={ttsEnabled ? "Tắt giọng đọc" : "Bật giọng đọc"}
              onClick={() => {
                if (ttsEnabled) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              className={ttsEnabled ? "text-violet-400" : "text-zinc-500"}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          )}

          <Button variant="destructive" size="sm" onClick={handleEnd}>
            <StopCircle className="h-4 w-4 mr-1" /> Kết thúc
          </Button>
        </div>
      </div>

      {/* ── Vocal warning ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {vocalWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-400 text-sm mb-3"
          >
            ⚡ {vocalWarning}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i < 3 ? i * 0.1 : 0 }}
            className={`flex gap-3 ${msg.role === "USER" ? "flex-row-reverse" : ""}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              msg.role === "AI" ? "bg-violet-600" : "bg-zinc-700"
            }`}>
              {msg.role === "AI" ? <BrainCircuit className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>

            <Card className={`max-w-[80%] ${
              msg.role === "USER"
                ? "bg-violet-600/20 border-violet-500/30"
                : "glass border-0"
            }`}>
              <CardContent className="p-4">
                {msg.role === "AI" && msg.questionNumber && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">Câu {msg.questionNumber}</Badge>
                {msg.action && msg.action !== "ASK_NEW_QUESTION" && (
                      <Badge className="text-xs bg-violet-500/20 text-violet-300">
                        {ACTION_LABELS[msg.action] ?? msg.action}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Replay TTS button for AI messages */}
                {msg.role === "AI" && ttsSupported && ttsEnabled && (
                  <button
                    onClick={() => speak(msg.content)}
                    className="mt-2 text-xs text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1"
                    title="Nghe lại"
                  >
                    <Volume2 className="h-3 w-3" /> Nghe lại
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* AI thinking indicator */}
        {aiThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600">
              <BrainCircuit className="h-4 w-4 animate-pulse" />
            </div>
            <Card className="glass border-0">
              <CardContent className="p-4 flex items-center gap-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI đang phân tích và tạo câu hỏi...</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI speaking indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 text-violet-400 text-xs pl-11"
            >
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block w-1 bg-violet-400 rounded-full animate-bounce"
                    style={{ height: "12px", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              <span>AI đang nói...</span>
              <button onClick={stopSpeaking} className="underline hover:text-violet-300">
                Dừng
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area OR Readonly banner ─────────────────────────────── */}
      {isReadonly ? (
        /* ── READONLY: buổi đã kết thúc, chỉ xem lại ── */
        <div className="pt-4 border-t border-zinc-800 mt-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              <span>Buổi phỏng vấn đã kết thúc — đang xem lại</span>
            </div>
            <Link
              href={`/interview/${id}/report`}
              className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              Xem báo cáo →
            </Link>
          </div>
        </div>
      ) : (
        /* ── ACTIVE: giao diện nhập ── */
        <div className="pt-4 border-t border-zinc-800 mt-4 space-y-2">
          {/* Live transcript badge when listening */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30"
              >
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400">Đang ghi âm...</span>
                {transcript && (
                  <span className="text-xs text-zinc-300 truncate max-w-[60%]">{transcript}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            {/* Microphone button */}
            {sttSupported && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleMicToggle}
                disabled={sending || aiThinking}
                title={isListening ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
                className={`shrink-0 transition-all ${
                  isListening
                    ? "border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 animate-pulse"
                    : "border-zinc-700 text-zinc-400 hover:border-violet-500 hover:text-violet-400"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}

            {/* Text input */}
            <Textarea
              ref={textareaRef}
              placeholder={
                isListening
                  ? "Đang lắng nghe... (nhấn dừng hoặc gõ thêm)"
                  : sttSupported
                  ? "Gõ hoặc nhấn 🎙️ để nói... (Enter gửi, Shift+Enter xuống dòng)"
                  : "Nhập câu trả lời của bạn..."
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!recordingStartRef.current && e.target.value.length === 1) {
                  recordingStartRef.current = Date.now();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              className="min-h-[60px] max-h-[160px] resize-none"
              disabled={sending || aiThinking}
            />

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sending || aiThinking || !input.trim()}
              className="bg-violet-600 hover:bg-violet-700 px-4 self-end shrink-0"
              title="Gửi câu trả lời"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Hint text */}
          {!sttSupported && (
            <p className="text-xs text-zinc-600 text-center">
              💡 Trình duyệt không hỗ trợ thu âm. Vui lòng dùng Chrome hoặc Edge.
            </p>
          )}
        </div>
      )}

      {/* ── Exit Confirm Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
                  <StopCircle className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Kết thúc phỏng vấn?</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Tiến trình phỏng vấn sẽ được lưu lại và AI sẽ tạo báo cáo đánh giá cho bạn.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700"
                    onClick={() => setShowExitModal(false)}
                  >
                    Tiếp tục phỏng vấn
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={async () => { setShowExitModal(false); await doEnd(); }}
                  >
                    Kết thúc &amp; Xem báo cáo
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tầng 2: Inactivity Dialog ──────────────────────────────────── */}
      <InactivityDialog
        open={showInactivityDialog}
        idleMinutes={10}
        onContinue={handleContinueFromDialog}
        onEndEarly={handleEndEarly}
        autoAbandonSeconds={AUTO_ABANDON_S}
      />
    </div>
  );
}
