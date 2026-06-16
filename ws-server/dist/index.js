"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ws_1 = require("ws");
const auth_js_1 = require("./auth.js");
const interview_handler_js_1 = require("./interview-handler.js");
const PORT = parseInt(process.env.WS_PORT || "3001", 10);
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`🔌 SiHi WebSocket Server running on port ${PORT}`);
function sendMessage(ws, message) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const interviewId = url.searchParams.get("interviewId");
    // 1. Verify WS JWT
    const payload = await (0, auth_js_1.verifyWSToken)(token);
    if (!payload) {
        sendMessage(ws, { type: "ERROR", message: "Unauthorized", code: "AUTH_FAILED" });
        ws.close(4001, "Unauthorized");
        return;
    }
    // 2. Validate interviewId
    if (!interviewId) {
        sendMessage(ws, {
            type: "ERROR",
            message: "Missing interviewId",
            code: "MISSING_INTERVIEW_ID",
        });
        ws.close(4002, "Missing interviewId");
        return;
    }
    console.log(`✅ Connection: user=${payload.sub}, interview=${interviewId}`);
    // 3. Send initial state
    sendMessage(ws, { type: "STATE_CHANGE", state: "CONNECTING" });
    // 4. Create and start handler
    const handler = new interview_handler_js_1.InterviewHandler(ws, payload, interviewId);
    handler.start();
    sendMessage(ws, { type: "STATE_CHANGE", state: "READY" });
});
wss.on("error", (error) => {
    console.error("⚠️ WebSocket Server Error:", error);
});
//# sourceMappingURL=index.js.map