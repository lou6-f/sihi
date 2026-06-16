import type { AIMessage } from "@/providers/ai/ai-provider";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export type AdaptiveAction =
  | "ASK_NEW_QUESTION"
  | "FOLLOW_UP"
  | "DEEP_DIVE"
  | "GIVE_HINT"
  | "REDUCE_DIFFICULTY"
  | "CLARIFY_ANSWER"
  | "EXPLAIN_BRIEFLY"
  | "PROJECT_DISCUSSION";

export interface QuestionPlan {
  order: number;
  skillTarget: string;
  difficulty: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  expectedEvidence: string;
  reasonForAsking: string;
  category: string;
  suggestedQuestion?: string;
}

export interface RichEvaluation {
  // Core score
  score: number;           // 0-10 overall
  // 5 dimensions (0-10 each)
  accuracy: number;        // Độ đúng của câu trả lời
  depth: number;           // Độ sâu / chi tiết
  confidence: number;      // Độ tự tin (từ text signals)
  communication: number;   // Rõ ràng, mạch lạc
  understanding: number;   // Hiểu bản chất vấn đề
  // Adaptive signals
  isUnknown: boolean;      // User nói không biết
  mentionedProjects: string[];  // Projects/products nhắc đến
  suggestedAction: AdaptiveAction;
  // Key points
  keyPointsCovered: string[];
  keyPointsMissed: string[];
  feedback: string;
  // STAR (chỉ khi behavioral/project/situational)
  starEval?: {
    situation: number;
    task: number;
    action: number;
    result: number;
    applicable: boolean;
  };
}

export interface AdaptiveAIResponse {
  action: AdaptiveAction;
  question: string;
  category: string;
  difficulty: number;
  expectedKeyPoints: string[];
  skillTarget?: string;
  reasonForAction?: string;
  isFollowUp?: boolean;
}

interface AdaptiveInterviewerInput {
  field: string;
  level: string;
  questionNumber: number;
  totalQuestions: number;
  category: string;
  difficulty: number;
  cvSummary?: string;
  previousQA?: Array<{ question: string; answer: string }>;
  // New adaptive fields
  lastEvaluation?: RichEvaluation;
  unknownAttempts?: number;
  mentionedProjects?: string[];
  targetRole?: string;
  jobDescription?: string;
  jdMode?: string;
  interviewPlan?: QuestionPlan[];
}

// ═══════════════════════════════════════
// Adaptive Interviewer Prompt
// ═══════════════════════════════════════

export function buildInterviewerPrompt(input: AdaptiveInterviewerInput): AIMessage[] {
  const {
    field, level, questionNumber, totalQuestions, category, difficulty,
    cvSummary, previousQA, lastEvaluation, unknownAttempts = 0,
    mentionedProjects = [], targetRole, jobDescription, jdMode, interviewPlan,
  } = input;

  // Build context sections
  const cvContext = cvSummary ? `\n\nThông tin CV ứng viên:\n${cvSummary}` : "";

  const jdContext = jobDescription
    ? `\n\nJob Description mục tiêu:\nVị trí: ${targetRole || field}\nJD:\n${jobDescription.slice(0, 1500)}`
    : "";

  const projectContext = mentionedProjects.length > 0
    ? `\n\nCác project ứng viên đã nhắc đến: ${mentionedProjects.join(", ")}. Hãy khai thác sâu khi phù hợp.`
    : "";

  const planContext = interviewPlan && interviewPlan.length > 0
    ? `\n\nInterview Plan:\n${interviewPlan.map(p =>
        `Q${p.order}: ${p.skillTarget} (${p.category}, độ khó ${p.difficulty}, ${p.priority})`
      ).join("\n")}`
    : "";

  const previousContext = previousQA?.length
    ? `\n\nLịch sử Q&A:\n${previousQA.map((qa, i) =>
        `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
      ).join("\n\n")}`
    : "";

  // Build adaptive decision context
  let adaptiveContext = "";
  if (lastEvaluation) {
    adaptiveContext = `\n\nĐánh giá câu trả lời vừa rồi:
- Điểm tổng: ${lastEvaluation.score}/10
- Độ đúng: ${lastEvaluation.accuracy}/10
- Độ sâu: ${lastEvaluation.depth}/10  
- Giao tiếp: ${lastEvaluation.communication}/10
- Hiểu vấn đề: ${lastEvaluation.understanding}/10
- Không biết: ${lastEvaluation.isUnknown ? "Có" : "Không"}
- Lần không biết liên tiếp: ${unknownAttempts}
- Đề xuất action: ${lastEvaluation.suggestedAction}`;
  }

  // Decision rules based on state
  const decisionGuide = buildDecisionGuide(lastEvaluation, unknownAttempts, mentionedProjects);

  return [
    {
      role: "system",
      content: `Bạn là interviewer IT chuyên nghiệp tại Việt Nam, đang phỏng vấn ứng viên cho vị trí ${level} ${targetRole || field}.

NGUYÊN TẮC PHỎNG VẤN THẬT:
- Không hỏi câu hỏi mới ngay sau mỗi câu trả lời. Phân tích trước rồi quyết định action.
- Hoạt động như người phỏng vấn thực sự: lắng nghe, phân tích, điều chỉnh.
- Tạo cảm giác hỗ trợ người học, không phải kiểm tra máy móc.
- Dùng 100% tiếng Việt.
- Câu hỏi/phản hồi phải tự nhiên, không cứng nhắc.${cvContext}${jdContext}${projectContext}${planContext}

${decisionGuide}`,
    },
    {
      role: "user",
      content: `Câu số: ${questionNumber}/${totalQuestions}
Thể loại: ${category}
Độ khó hiện tại: ${difficulty}/5
${adaptiveContext}${previousContext}

Dựa trên đánh giá và lịch sử, hãy quyết định action phù hợp và tạo câu hỏi/phản hồi.

Trả về JSON:
{
  "action": "ASK_NEW_QUESTION|FOLLOW_UP|DEEP_DIVE|GIVE_HINT|REDUCE_DIFFICULTY|CLARIFY_ANSWER|EXPLAIN_BRIEFLY|PROJECT_DISCUSSION",
  "question": "nội dung câu hỏi hoặc phản hồi của interviewer",
  "category": "${category}",
  "difficulty": ${difficulty},
  "expectedKeyPoints": ["điểm cần có 1", "điểm cần có 2"],
  "skillTarget": "kỹ năng đang kiểm tra",
  "reasonForAction": "lý do chọn action này",
  "isFollowUp": false
}`,
    },
  ];
}

// ═══════════════════════════════════════
// Decision Guide Builder
// ═══════════════════════════════════════

function buildDecisionGuide(
  lastEval: RichEvaluation | undefined,
  unknownAttempts: number,
  mentionedProjects: string[]
): string {
  if (!lastEval) {
    return `HÀNH ĐỘNG: Đây là câu hỏi đầu tiên. Dùng ASK_NEW_QUESTION với câu hỏi mở, thân thiện, phù hợp level.`;
  }

  const lines: string[] = ["QUYẾT ĐỊNH ACTION dựa trên tình huống:"];

  // Unknown handling
  if (lastEval.isUnknown) {
    if (unknownAttempts === 1) {
      lines.push(`→ User vừa nói không biết (lần 1): Dùng GIVE_HINT — Động viên, gợi mở, đưa ví dụ thực tế. KHÔNG chuyển câu hỏi mới.`);
    } else if (unknownAttempts === 2) {
      lines.push(`→ User vẫn không biết (lần 2): Dùng REDUCE_DIFFICULTY hoặc PROJECT_DISCUSSION — Đơn giản hóa câu hỏi hoặc liên hệ với project của họ${mentionedProjects.length > 0 ? ` (${mentionedProjects[0]})` : ""}.`);
    } else if (unknownAttempts >= 3) {
      lines.push(`→ User không biết lần 3+: Dùng EXPLAIN_BRIEFLY rồi ASK_NEW_QUESTION — Giải thích ngắn gọn khái niệm, đánh dấu skill gap, chuyển sang chủ đề mới.`);
    }
  } else if (lastEval.score >= 8 && lastEval.depth >= 7) {
    lines.push(`→ Câu trả lời xuất sắc (score=${lastEval.score}): Dùng DEEP_DIVE — Khai thác sâu hơn, hỏi edge cases, trade-offs.`);
  } else if (lastEval.score >= 6 && lastEval.depth < 5) {
    lines.push(`→ Câu trả lời đúng nhưng hời hợt (depth=${lastEval.depth}): Dùng FOLLOW_UP — Hỏi thêm chi tiết, ví dụ cụ thể.`);
  } else if (lastEval.communication < 5) {
    lines.push(`→ Giao tiếp kém (comm=${lastEval.communication}): Dùng CLARIFY_ANSWER — Hỏi lại để ứng viên diễn đạt rõ hơn.`);
  } else if (mentionedProjects.length > 0 && lastEval.score >= 5) {
    lines.push(`→ Ứng viên có project thực tế: Có thể dùng PROJECT_DISCUSSION để khai thác kinh nghiệm của họ về ${mentionedProjects[0]}.`);
  } else {
    lines.push(`→ Câu trả lời bình thường: Dùng ASK_NEW_QUESTION — Chuyển sang câu hỏi tiếp theo trong kế hoạch.`);
  }

  return lines.join("\n");
}
