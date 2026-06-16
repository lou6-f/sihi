export interface InterviewData {
  id: string;
  field: string;
  level: string;
  status: string;
  totalScore: number | null;
  questionCount: number;
  maxQuestions: number;
  duration: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface InterviewMessage {
  id: string;
  role: "AI" | "USER" | "SYSTEM";
  content: string;
  questionNumber: number | null;
  category: string | null;
  difficulty: number | null;
  aiEvaluation: Record<string, unknown> | null;
  createdAt: string;
}

export interface InterviewReport {
  id: string;
  overallScore: number;
  readinessLevel: string;
  criteriaScores: Record<string, {
    score: number;
    weight: number;
    comment: string;
  }>;
  overallComment: string;
  strengths: string[];
  weaknesses: string[];
  goodAnswers: Array<{ questionNumber: number; reason: string }>;
  improvementAreas: Array<{ area: string; suggestion: string }>;
  suggestedAnswers: Array<{
    questionNumber: number;
    question: string;
    userAnswer: string;
    suggestedAnswer: string;
  }>;
  learningPath: Array<{
    topic: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    reason: string;
  }>;
  recommendedResources: Array<{
    resourceId: string;
    title: string;
    reason: string;
    relevanceScore: number;
  }>;
}
