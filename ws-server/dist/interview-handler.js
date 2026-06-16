"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewHandler = void 0;
const ws_1 = require("ws");
const interview_engine_js_1 = require("./interview-engine.js");
const HEARTBEAT_INTERVAL_MS = 30_000; // 30s
/**
 * Manages a single WebSocket connection for an interview session.
 * Handles heartbeat, message routing, and clean teardown.
 */
class InterviewHandler {
    ws;
    payload;
    interviewId;
    isAlive = true;
    heartbeatTimer;
    constructor(ws, payload, interviewId) {
        this.ws = ws;
        this.payload = payload;
        this.interviewId = interviewId;
    }
    /** Attach listeners and start heartbeat */
    start() {
        this.ws.on("message", (data) => this.handleRawMessage(data));
        this.ws.on("close", (code, reason) => this.handleClose(code, reason));
        this.ws.on("error", (error) => this.handleError(error));
        this.ws.on("pong", () => { this.isAlive = true; });
        this.startHeartbeat();
        console.log(`🎙️  InterviewHandler started: user=${this.payload.sub}, interview=${this.interviewId}`);
    }
    // ─── Private ────────────────────────────────────────────────────────────────
    handleRawMessage(data) {
        try {
            const text = Buffer.isBuffer(data) ? data.toString() : String(data);
            const message = JSON.parse(text);
            (0, interview_engine_js_1.processMessage)({ userId: this.payload.sub, interviewId: this.interviewId, ws: this.ws }, message).catch((err) => {
                console.error(`processMessage error for user=${this.payload.sub}:`, err);
                this.send({ type: "ERROR", message: "Lỗi xử lý yêu cầu", code: "PROCESS_ERROR" });
            });
        }
        catch {
            this.send({ type: "ERROR", message: "Định dạng tin nhắn không hợp lệ", code: "INVALID_MESSAGE" });
        }
    }
    handleClose(code, reason) {
        this.stopHeartbeat();
        console.log(`🔌 Disconnected: user=${this.payload.sub}, interview=${this.interviewId}, code=${code}, reason=${reason.toString() || "-"}`);
    }
    handleError(error) {
        console.error(`⚠️  WS error: user=${this.payload.sub}:`, error.message);
        this.send({ type: "ERROR", message: "Lỗi kết nối", code: "WS_ERROR" });
    }
    startHeartbeat() {
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
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }
    send(message) {
        if (this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
exports.InterviewHandler = InterviewHandler;
//# sourceMappingURL=interview-handler.js.map