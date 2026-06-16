import type { AIMessage } from "@/providers/ai/ai-provider";

export function buildCVAnalyzerPrompt(
  cvText: string,
  field: string
): AIMessage[] {
  return [
    {
      role: "system",
      content: `Bạn là chuyên gia tuyển dụng IT tại Việt Nam, chuyên đánh giá CV của sinh viên/fresher trong lĩnh vực ${field}.

Nhiệm vụ: Phân tích CV dưới đây và trả về kết quả đánh giá chi tiết.

Trả về JSON với cấu trúc:
{
  "overallScore": number (0-100),
  "strengths": string[] (tối đa 5 điểm mạnh),
  "weaknesses": string[] (tối đa 5 điểm yếu),
  "skills": {
    "technical": string[] (kỹ năng kỹ thuật tìm thấy),
    "soft": string[] (kỹ năng mềm),
    "missing": string[] (kỹ năng thiếu cho vị trí ${field})
  },
  "experience": {
    "projects": number,
    "relevantExperience": string,
    "assessment": string
  },
  "suggestions": string[] (gợi ý cải thiện CV, tối đa 5),
  "interviewFocus": string[] (các chủ đề nên tập trung khi phỏng vấn),
  "readinessLevel": "NOT_READY" | "NEEDS_PRACTICE" | "GOOD" | "READY"
}

Lưu ý:
- Đánh giá khách quan, công bằng
- Phù hợp với thị trường tuyển dụng IT Việt Nam
- Tập trung vào sinh viên mới ra trường / fresher
- Trả lời hoàn toàn bằng tiếng Việt`,
    },
    {
      role: "user",
      content: `Nội dung CV:\n\n${cvText}`,
    },
  ];
}
