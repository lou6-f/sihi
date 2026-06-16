"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseInterviewWSOptions {
  interviewId: string;
  onQuestion?: (question: { question: string; questionNumber: number; category: string }) => void;
  onEvaluation?: (eval_: { score: number; feedback: string }) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * WebSocket hook for real-time interview.
 * Gets WS token from /api/auth/ws-token, connects to WS server.
 */
export function useInterviewWS({
  interviewId,
  onQuestion,
  onEvaluation,
  onComplete,
  onError,
}: UseInterviewWSOptions) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string>("");

  const getToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/auth/ws-token");
    if (!res.ok) throw new Error("Failed to get WS token");
    const data = await res.json();
    return data.token;
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setConnecting(true);

    try {
      const token = await getToken();
      tokenRef.current = token;

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
      const ws = new WebSocket(`${wsUrl}?token=${token}&interviewId=${interviewId}`);

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "INTERVIEW_QUESTION":
              onQuestion?.(msg.payload);
              break;
            case "INTERVIEW_EVALUATION":
              onEvaluation?.(msg.payload);
              break;
            case "INTERVIEW_END":
              onComplete?.();
              break;
            case "ERROR":
              onError?.(msg.payload.message);
              break;
          }
        } catch {
          console.error("WS parse error");
        }
      };

      ws.onerror = () => {
        onError?.("WebSocket connection error");
        setConnected(false);
        setConnecting(false);
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
      };

      wsRef.current = ws;
    } catch (err) {
      onError?.("Failed to connect");
      setConnecting(false);
    }
  }, [interviewId, getToken, onQuestion, onEvaluation, onComplete, onError]);

  const sendAnswer = useCallback((transcript: string, questionNumber: number) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: "INTERVIEW_ANSWER",
      payload: { transcript, questionNumber },
      timestamp: Date.now(),
    }));
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  return {
    connected,
    connecting,
    connect,
    disconnect,
    sendAnswer,
  };
}
