import type { AIMessage } from "@/providers/ai/ai-provider";
import type { QuestionPlan } from "./interviewer";

// ═══════════════════════════════════════
// Question Planner Prompt
// Called BEFORE interview starts to create a plan
// ═══════════════════════════════════════

interface QuestionPlannerInput {
  field: string;
  level: string;
  maxQuestions: number;
  cvSummary?: string;
  targetRole?: string;
  jobDescription?: string;
  jdMode?: string; // "CV_JD" | "CV_ONLY" | "JD_ONLY" | "GENERAL"
}

export function buildQuestionPlannerPrompt(input: QuestionPlannerInput): AIMessage[] {
  const { field, level, maxQuestions, cvSummary, targetRole, jobDescription, jdMode } = input;

  const cvContext = cvSummary
    ? `\n\nThông tin CV ứng viên:\n${cvSummary}`
    : "";

  const jdContext = jobDescription
    ? `\n\nJob Description mục tiêu:\nVị trí: ${targetRole || field}\nJD:\n${jobDescription.slice(0, 2000)}`
    : "";

  const modeInstruction = jdMode === "JD_ONLY"
    ? "Tập trung vào yêu cầu từ JD. CV không có, đánh giá hoàn toàn dựa trên JD."
    : jdMode === "CV_JD"
    ? "Kết hợp thông tin từ CV và JD để tạo câu hỏi liên quan và cá nhân hóa tối đa."
    : jdMode === "CV_ONLY"
    ? "Dựa vào CV của ứng viên để tạo câu hỏi cá nhân hóa. Không có JD."
    : "Phỏng vấn tổng quát không có JD hay CV. Bám vào field và level.";

  return [
    {
      role: "system",
      content: `Bạn là senior interviewer IT chuyên nghiệp. Nhiệm vụ là tạo Interview Plan trước khi phỏng vấn bắt đầu.

Mục tiêu của Interview Plan:
- Đảm bảo phỏng vấn có chiều sâu, đánh giá được đúng năng lực
- Phân bổ câu hỏi theo các skill category hợp lý
- Mỗi câu hỏi có mục tiêu rõ ràng

${modeInstruction}${cvContext}${jdContext}

Trả về JSON array với ${maxQuestions} câu hỏi theo cấu trúc:
[
  {
    "order": 1,
    "skillTarget": "tên kỹ năng cụ thể cần đánh giá",
    "difficulty": 1-5,
    "priority": "HIGH|MEDIUM|LOW",
    "expectedEvidence": "ứng viên cần thể hiện điều gì",
    "reasonForAsking": "tại sao hỏi câu này",
    "category": "FOUNDATION|TECHNICAL|PROJECT|ALGORITHM|SITUATIONAL|BEHAVIORAL",
    "suggestedQuestion": "câu hỏi gợi ý (AI có thể điều chỉnh khi phỏng vấn)"
  }
]

Nguyên tắc phân bổ cho ${level} ${field}:
- FOUNDATION: 1-2 câu (warm-up, tự giới thiệu, background)
- TECHNICAL: 40-50% (core skills của ${field})
- PROJECT: 20-30% (kinh nghiệm thực tế, dự án)
- SITUATIONAL/BEHAVIORAL: 10-20% (soft skills, xử lý tình huống)
- ALGORITHM: 10-20% (tùy field, nhiều hơn với Backend/Data)

Độ khó phải tăng dần từ câu 1 đến câu cuối.
Ưu tiên skill xuất hiện trong JD (nếu có).
Sử dụng 100% tiếng Việt.`,
    },
    {
      role: "user",
      content: `Tạo Interview Plan cho vị trí ${level} ${targetRole || field} với ${maxQuestions} câu hỏi.`,
    },
  ];
}
