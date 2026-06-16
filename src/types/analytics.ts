// ═══════════════════════════════════════
// Analytics Types
// ═══════════════════════════════════════

export interface ProgressSnapshot {
  id: string;
  overallScore: number;
  readinessLevel: "NOT_READY" | "NEEDS_PRACTICE" | "GOOD" | "READY";
  totalInterviews: number;
  suggestion?: string;
  snapshotAt: string;
}

export interface SkillAssessment {
  id: string;
  skillName: string;
  currentScore: number;
  assessments: Array<{
    id: string;
    score: number;
    createdAt: string;
  }>;
}

export interface InterviewSummary {
  id: string;
  field: string;
  level: string;
  status: string;
  totalScore: number | null;
  maxQuestions: number;
  questionCount: number;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
}
