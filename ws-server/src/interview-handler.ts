import { WebSocket } from "ws";
import type { WSTokenPayload, ClientMessage, ServerMessage } from "./types.js";
import { processMessage } from "./interview-engine.js";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30s

/**
 * Manages a single WebSocket connection for an interview session.
 * Handles heartbeat, message routing, and clean teardown.
 */
export class InterviewHandler {
  private ws: WebSocket;
  private payload: WSTokenPayload;
  private interviewId: string;
  private isAlive: boolean = true;
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(ws: WebSocket, payload: WSTokenPayload, interviewId: string) {
    this.ws = ws;
    this.payload = payload;
    this.interviewId = interviewId;
  }

  /** Attach listeners and start heartbeat */
  start(): void {
    this.ws.on("message", (data) => this.handleRawMessage(data));
    this.ws.on("close", (code, reason) => this.handleClose(code, reason));
    this.ws.on("error", (error) => this.handleError(error));
    this.ws.on("pong", () => { this.isAlive = true; });

    this.startHeartbeat();

    console.log(
      `🎙️  InterviewHandler started: user=${this.payload.sub}, interview=${this.interviewId}`
    );
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private handleRawMessage(data: unknown): void {
    try {
      const text = Buffer.isBuffer(data) ? data.toString() : String(data);
      const message = JSON.parse(text) as ClientMessage;

      processMessage(
        { userId: this.payload.sub, interviewId: this.interviewId, ws: this.ws },
        message
      ).catch((err) => {
        console.error(`processMessage error for user=${this.payload.sub}:`, err);
        this.send({ type: "ERROR", message: "Lỗi xử lý yêu cầu", code: "PROCESS_ERROR" });
      });
    } catch {
      this.send({ type: "ERROR", message: "Định dạng tin nhắn không hợp lệ", code: "INVALID_MESSAGE" });
    }
  }

  private handleClose(code: number, reason: Buffer): void {
    this.stopHeartbeat();
    console.log(
      `🔌 Disconnected: user=${this.payload.sub}, interview=${this.interviewId}, code=${code}, reason=${reason.toString() || "-"}`
    );
  }

  private handleError(error: Error): void {
    console.error(`⚠️  WS error: user=${this.payload.sub}:`, error.message);
    this.send({ type: "ERROR", message: "Lỗi kết nối", code: "WS_ERROR" });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (!this.isAlive) {
        console.warn(`💔 Heartbeat timeout: user=${this.payload.sub} — terminating`);
        this.ws.terminate();
        return;
      }
      this.isAlive = false;
      this.ws.ping();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private send(message: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
