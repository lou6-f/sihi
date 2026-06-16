import type { AIMessage } from "@/providers/ai/ai-provider";
import type { RichEvaluation } from "./interviewer";

// ═══════════════════════════════════════
// Answer Evaluation Prompt (real-time, per answer)
// ═══════════════════════════════════════

interface AnswerEvalInput {
  question: string;
  answer: string;
  category: string;
  difficulty: number;
  field: string;
  level: string;
  previousAnswers?: Array<{ question: string; answer: string }>;
  mentionedProjects?: string[];
}

export function buildAnswerEvaluationPrompt(input: AnswerEvalInput): AIMessage[] {
  const { question, answer, category, difficulty, field, level, previousAnswers, mentionedProjects } = input;

  const isBehavioralOrProject = ["PROJECT", "BEHAVIORAL", "SITUATIONAL"].includes(category);

  const previousContext = previousAnswers?.length
    ? `\nLịch sử câu trả lời trước:\n${previousAnswers.slice(-3).map((qa, i) =>
        `Q: ${qa.question}\nA: ${qa.answer}`
      ).join("\n---\n")}`
    : "";

  const starInstruction = isBehavioralOrProject
    ? `\n"starEval": {
    "applicable": true,
    "situation": 0-10,
    "task": 0-10,
    "action": 0-10,
    "result": 0-10
  },`
    : `\n"starEval": { "applicable": false, "situation": 0, "task": 0, "action": 0, "result": 0 },`;

  return [
    {
      role: "system",
      content: `Bạn là chuyên gia đánh giá phỏng vấn IT tại Việt Nam. Đánh giá câu trả lời theo NHIỀU CHIỀU, không chỉ đúng/sai.

Vị trí: ${level} ${field}
Thể loại câu hỏi: ${category} (độ khó ${difficulty}/5)

NGUYÊN TẮC ĐÁNH GIÁ:
- Nếu user không biết nhưng suy luận tốt → vẫn cho điểm reasoning
- Nếu user không biết nhưng tiếp thu gợi ý → ghi nhận learningAbility
- Đánh giá cả giao tiếp và cách diễn đạt, không chỉ kiến thức
- Detect "không biết" từ: "không biết", "chưa học", "không nhớ", "chưa làm", "không rõ"

Trả về JSON:
{
  "score": 0-10,
  "accuracy": 0-10,
  "depth": 0-10,
  "confidence": 0-10,
  "communication": 0-10,
  "understanding": 0-10,
  "isUnknown": boolean,
  "mentionedProjects": ["tên project nhắc đến"],${starInstruction}
  "suggestedAction": "ASK_NEW_QUESTION|FOLLOW_UP|DEEP_DIVE|GIVE_HINT|REDUCE_DIFFICULTY|CLARIFY_ANSWER|EXPLAIN_BRIEFLY|PROJECT_DISCUSSION",
  "keyPointsCovered": ["điểm đã đề cập"],
  "keyPointsMissed": ["điểm bỏ sót"],
  "feedback": "nhận xét ngắn gọn để cải thiện"
}

Hướng dẫn suggestedAction:
- score >= 8 và depth >= 7 → DEEP_DIVE
- score >= 6 và depth < 5 → FOLLOW_UP
- isUnknown và lần đầu → GIVE_HINT
- communication < 5 → CLARIFY_ANSWER
- score < 4 và không phải unknown → REDUCE_DIFFICULTY
- có project được nhắc và liên quan → PROJECT_DISCUSSION
- còn lại → ASK_NEW_QUESTION`,
    },
    {
      role: "user",
      content: `Câu hỏi (${category}, độ khó ${difficulty}/5):
${question}

Câu trả lời:
${answer}${previousContext}`,
    },
  ];
}

// ═══════════════════════════════════════
// Full Report Evaluator Prompt (post-interview)
// ═══════════════════════════════════════

interface EvaluatorPromptInput {
  field: string;
  level: string;
  transcript: Array<{
    role: "AI" | "USER";
    content: string;
    questionNumber?: number;
    category?: string;
    difficulty?: number;
    vocalMetrics?: { wpm: number; fillerCount: number };
  }>;
  cvSummary?: string;
  targetRole?: string;
  jobDescription?: string;
  vocalSummary?: {
    avgWpm: number;
    totalFillers: number;
    totalSpeakingMs: number;
    wpmWarning: boolean;
    communicationPenalty: number;
    confidencePenalty: number;
  };
}

export function buildEvaluatorPrompt(input: EvaluatorPromptInput): AIMessage[] {
  const { field, level, transcript, cvSummary, targetRole, jobDescription, vocalSummary } = input;

  const transcriptText = transcript
    .map(m =>
      `[${m.role}${m.questionNumber ? ` - Q${m.questionNumber} (${m.category}, độ khó ${m.difficulty}/5)` : ""}]: ${m.content}`
    )
    .join("\n\n");

  const cvContext = cvSummary ? `\n\nThông tin CV ứng viên:\n${cvSummary}` : "";
  const jdContext = jobDescription ? `\n\nJob Description mục tiêu:\nVị trí: ${targetRole || field}\n${jobDescription.slice(0, 1000)}` : "";

  // Chỉ đưa vocal vào prompt nếu có dữ liệu thực
  const hasVoiceData = vocalSummary && vocalSummary.totalSpeakingMs > 0;
  const vocalContext = hasVoiceData ? `\n\nPhân tích giọng nói (dùng để hỗ trợ đánh giá communication và confidence):
- Tốc độ nói trung bình: ${vocalSummary!.avgWpm} WPM${vocalSummary!.wpmWarning ? " (⚠️ hơi nhanh)" : ""}
- Tổng từ đệm: ${vocalSummary!.totalFillers}
Lưu ý: Vocal chỉ điều chỉnh tối đa ±10 điểm vào communication.` : "";

  // Check nếu có câu behavioral/situational/project
  const hasBehavioral = transcript.some(m =>
    m.role === "AI" && ["BEHAVIORAL", "SITUATIONAL", "PROJECT_DISCUSSION"].includes(m.category || "")
  );

  const starInstruction = hasBehavioral ? `
  "starEvaluations": [
    {
      "questionNumber": number,
      "question": "câu hỏi behavioral/situational",
      "situation": 0-10,
      "task": 0-10,
      "action": 0-10,
      "result": 0-10,
      "totalScore": 0-10,
      "comment": "nhận xét STAR bằng tiếng Việt"
    }
  ],` : `
  "starEvaluations": [],  // Không có câu hỏi behavioral/situational`;

  return [
    {
      role: "system",
      content: `Bạn là chuyên gia đánh giá phỏng vấn IT cao cấp tại Việt Nam.
Nhiệm vụ: Đánh giá toàn diện buổi phỏng vấn cho vị trí ${level} ${targetRole || field}.

${cvContext}${jdContext}${vocalContext}

NGUYÊN TẮC ĐÁNH GIÁ QUAN TRỌNG:
1. KHÔNG chỉ đúng/sai. Đánh giá tư duy, cách tiếp cận, khả năng lập luận.
2. Ứng viên không biết đáp án nhưng suy luận hợp lý, đặt câu hỏi làm rõ → 40-59 điểm
3. Gần đúng, thiếu chi tiết → 25-39 điểm
4. Không biết, không suy luận được → 0-24 điểm
5. Đánh giá cân bằng với level ${level}, không so sánh với senior nếu ứng viên là junior/fresher
6. Sử dụng 100% tiếng Việt cho mọi comment, reason, nhận xét

CÔNG THỨC TÍNH overallScore:
overallScore = technicalKnowledge×0.35 + problemSolving×0.30 + practicalExperience×0.20 + communication×0.15
Tính điểm tổng theo công thức này, KHÔNG tự ý tính theo cách khác.

Trả về JSON (không có text ngoài JSON):
{
  "overallScore": number,  // Tính theo công thức trên, làm tròn số nguyên
  "dimensionScores": {
    "technicalKnowledge": {
      "score": 0-100,
      "comment": "nhận xét 1-2 câu về kiến thức kỹ thuật",
      "reason": "bằng chứng cụ thể từ câu trả lời: câu nào tốt, câu nào thiếu"
    },
    "problemSolving": {
      "score": 0-100,
      "comment": "nhận xét 1-2 câu về tư duy giải quyết vấn đề",
      "reason": "bằng chứng cụ thể từ cách ứng viên tiếp cận các câu hỏi"
    },
    "practicalExperience": {
      "score": 0-100,
      "comment": "nhận xét 1-2 câu về kinh nghiệm thực tế",
      "reason": "dựa trên project, ví dụ thực tế ứng viên đề cập"
    },
    "communication": {
      "score": 0-100,
      "comment": "nhận xét 1-2 câu về khả năng trình bày",
      "reason": "dựa trên cách diễn đạt, cấu trúc câu trả lời"
    }
  },
  "competencyProfile": {
    "learningAbility": {
      "score": 0-100,
      "comment": "ước tính khả năng học hỏi từ phản ứng khi được gợi ý"
    },
    "confidence": {
      "score": 0-100,
      "comment": "ước tính mức độ tự tin qua cách trình bày"
    },
    "teamwork": {
      "score": 0-100,
      "comment": "ước tính từ cách ứng viên đề cập làm việc nhóm/dự án"
    },
    "initiative": {
      "score": 0-100,
      "comment": "ước tính tinh thần chủ động từ ví dụ và cách trả lời"
    }
  },
  "skillGaps": [
    { "skill": "tên kỹ năng cụ thể", "severity": "CRITICAL|IMPORTANT|OPTIONAL", "evidence": "bằng chứng từ transcript" }
  ],${starInstruction}
  "learningRoadmap": [
    {
      "topic": "chủ đề cần học",
      "priority": "HIGH|MEDIUM|LOW",
      "reason": "lý do từ kết quả phỏng vấn",
      "resources": ["gợi ý tài liệu hoặc từ khóa tìm kiếm"]
    }
  ],
  "overallComment": "nhận xét tổng quan 2-3 câu về ứng viên",
  "strengths": ["điểm mạnh 1", "điểm mạnh 2", "điểm mạnh 3"],
  "weaknesses": ["điểm yếu 1", "điểm yếu 2", "điểm yếu 3"],
  "readinessLevel": "NOT_READY|NEEDS_PRACTICE|GOOD|READY|EXCELLENT"
}`,
    },
    {
      role: "user",
      content: `Transcript buổi phỏng vấn:\n\n${transcriptText}`,
    },
  ];
}

