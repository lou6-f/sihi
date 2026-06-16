import { PrismaClient } from "@prisma/client";
import type { WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "./types.js";

const prisma = new PrismaClient();

export interface MessageContext {
  userId: string;
  interviewId: string;
  ws: WebSocket;
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Route an incoming WS client message to the correct handler.
 */
export async function processMessage(
  ctx: MessageContext,
  raw: ClientMessage
): Promise<void> {
  const { userId, interviewId, ws } = ctx;

  switch (raw.type) {
    case "PING":
      send(ws, { type: "PONG" });
      break;

    case "START_INTERVIEW": {
      try {
        const interview = await prisma.interview.findFirst({
          where: { id: interviewId, userId },
          select: { id: true, status: true, maxQuestions: true },
        });

        if (!interview) {
          send(ws, { type: "ERROR", message: "Không tìm thấy phỏng vấn", code: "NOT_FOUND" });
          return;
        }

        if (interview.status === "COMPLETED") {
          send(ws, { type: "ERROR", message: "Phỏng vấn đã kết thúc", code: "ALREADY_COMPLETED" });
          return;
        }

        // Mark as PROCESSING (interview started)
        await prisma.interview.update({
          where: { id: interviewId },
          data: { status: "PROCESSING", startedAt: new Date() },
        });

        send(ws, { type: "STATE_CHANGE", state: "PROCESSING" });

        // Load first pending AI message
        const firstMessage = await prisma.interviewMessage.findFirst({
          where: { interviewId, role: "AI" },
          orderBy: { createdAt: "asc" },
          select: { content: true, questionNumber: true, category: true, difficulty: true },
        });

        if (firstMessage) {
          send(ws, {
            type: "AI_QUESTION",
            text: firstMessage.content,
            questionNumber: firstMessage.questionNumber ?? 1,
            category: firstMessage.category ?? "TECHNICAL",
            difficulty: firstMessage.difficulty ?? 3,
          });
          send(ws, { type: "STATE_CHANGE", state: "AI_SPEAKING" });
        } else {
          send(ws, { type: "STATE_CHANGE", state: "READY" });
        }
      } catch (error) {
        console.error("START_INTERVIEW error:", error);
        send(ws, { type: "ERROR", message: "Lỗi khởi động phỏng vấn", code: "START_ERROR" });
      }
      break;
    }

    case "USER_TEXT": {
      try {
        send(ws, { type: "STATE_CHANGE", state: "PROCESSING" });

        // Count current question
        const questionCount = await prisma.interviewMessage.count({
          where: { interviewId, role: "USER" },
        });

        const interview = await prisma.interview.findUnique({
          where: { id: interviewId },
          select: { maxQuestions: true },
        });

        const total = interview?.maxQuestions ?? 10;

        send(ws, {
          type: "PROGRESS",
          current: questionCount + 1,
          total,
          elapsed: 0,
        });

        // Get the latest AI response (already saved via HTTP API)
        const latestAI = await prisma.interviewMessage.findFirst({
          where: { interviewId, role: "AI" },
          orderBy: { createdAt: "desc" },
          select: { content: true, questionNumber: true, category: true, difficulty: true },
        });

        if (latestAI) {
          send(ws, {
            type: "AI_QUESTION",
            text: latestAI.content,
            questionNumber: latestAI.questionNumber ?? questionCount + 1,
            category: latestAI.category ?? "TECHNICAL",
            difficulty: latestAI.difficulty ?? 3,
          });
          send(ws, { type: "STATE_CHANGE", state: "AI_SPEAKING" });
        }
      } catch (error) {
        console.error("USER_TEXT error:", error);
        send(ws, { type: "ERROR", message: "Lỗi xử lý câu trả lời", code: "PROCESS_ERROR" });
      }
      break;
    }

    case "END_INTERVIEW": {
      try {
        const interview = await prisma.interview.findFirst({
          where: { id: interviewId, userId },
          select: { id: true, report: { select: { id: true } } },
        });

        if (!interview) {
          send(ws, { type: "ERROR", message: "Không tìm thấy phỏng vấn", code: "NOT_FOUND" });
          return;
        }

        send(ws, { type: "STATE_CHANGE", state: "COMPLETED" });

        if (interview.report) {
          send(ws, { type: "COMPLETED", reportId: interview.report.id });
        } else {
          send(ws, { type: "COMPLETED", reportId: "" });
        }
      } catch (error) {
        console.error("END_INTERVIEW error:", error);
        send(ws, { type: "ERROR", message: "Lỗi kết thúc phỏng vấn", code: "END_ERROR" });
      }
      break;
    }

    case "PAUSE":
      send(ws, { type: "STATE_CHANGE", state: "PAUSED" });
      break;

    case "RESUME":
      send(ws, { type: "STATE_CHANGE", state: "READY" });
      break;

    default:
      send(ws, { type: "ERROR", message: "Tin nhắn không hợp lệ", code: "UNKNOWN_MESSAGE" });
  }
}
