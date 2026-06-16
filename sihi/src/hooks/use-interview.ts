"use client";

import { useState, useCallback } from "react";

type InterviewPhase = "SETUP" | "STARTING" | "IN_PROGRESS" | "ENDING" | "COMPLETED" | "ERROR";

interface InterviewState {
  phase: InterviewPhase;
  interviewId: string | null;
  questionNumber: number;
  maxQuestions: number;
  field: string;
  level: string;
  error: string | null;
}

/**
 * Interview state machine hook.
 */
export function useInterview() {
  const [state, setState] = useState<InterviewState>({
    phase: "SETUP",
    interviewId: null,
    questionNumber: 0,
    maxQuestions: 10,
    field: "",
    level: "",
    error: null,
  });

  const createInterview = useCallback(async (field: string, level: string, cvId?: string) => {
    setState((s) => ({ ...s, phase: "STARTING", field, level, error: null }));

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, level, cvId }),
      });

      if (!res.ok) throw new Error("Không thể tạo phỏng vấn");

      const data = await res.json();
      setState((s) => ({
        ...s,
        phase: "IN_PROGRESS",
        interviewId: data.id,
        maxQuestions: data.maxQuestions || 10,
      }));

      return data.id as string;
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: "ERROR",
        error: err instanceof Error ? err.message : "Lỗi không xác định",
      }));
      return null;
    }
  }, []);

  const advanceQuestion = useCallback(() => {
    setState((s) => ({ ...s, questionNumber: s.questionNumber + 1 }));
  }, []);

  const complete = useCallback(() => {
    setState((s) => ({ ...s, phase: "COMPLETED" }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((s) => ({ ...s, phase: "ERROR", error }));
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: "SETUP",
      interviewId: null,
      questionNumber: 0,
      maxQuestions: 10,
      field: "",
      level: "",
      error: null,
    });
  }, []);

  return {
    ...state,
    createInterview,
    advanceQuestion,
    complete,
    setError,
    reset,
  };
}
