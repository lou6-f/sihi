import type { AIMessage } from "@/providers/ai/ai-provider";

export function buildResourceClassifierPrompt(
  title: string,
  content: string
): AIMessage[] {
  return [
    {
      role: "system",
      content: `Bạn là chuyên gia phân loại tài liệu IT. Phân tích nội dung bên dưới và phân loại.

Trả về JSON:
{
  "title": "tiêu đề tối ưu cho tài liệu",
  "summary": "tóm tắt ngắn gọn (tối đa 200 từ)",
  "type": "ARTICLE" | "ROADMAP" | "VIDEO" | "EXTERNAL_LINK",
  "field": "FRONTEND" | "BACKEND" | "DATA" | "FULLSTACK",
  "level": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
  "tags": ["tag1", "tag2", "tag3"],
  "relevanceScore": number (0-1, mức độ liên quan đến phỏng vấn IT)
}`,
    },
    {
      role: "user",
      content: `Tiêu đề: ${title}\n\nNội dung:\n${content.slice(0, 4000)}`,
    },
  ];
}

export function buildResourceSummarizerPrompt(
  content: string
): AIMessage[] {
  return [
    {
      role: "system",
      content: `Bạn là chuyên gia tóm tắt tài liệu kỹ thuật IT. Hãy tóm tắt nội dung bên dưới một cách ngắn gọn, dễ hiểu, bằng tiếng Việt.

Trả về JSON:
{
  "summary": "tóm tắt chính (200-300 từ)",
  "keyTopics": ["chủ đề 1", "chủ đề 2"],
  "prerequisites": ["kiến thức cần có trước"],
  "learningOutcomes": ["kết quả sau khi đọc"]
}`,
    },
    {
      role: "user",
      content: content.slice(0, 6000),
    },
  ];
}
