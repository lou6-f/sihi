import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { verifyWSToken } from "./auth.js";
import { InterviewHandler } from "./interview-handler.js";
import type { WSTokenPayload, ServerMessage } from "./types.js";

const PORT = parseInt(process.env.WS_PORT || "3001", 10);

const wss = new WebSocketServer({ port: PORT });

console.log(`🔌 SiHi WebSocket Server running on port ${PORT}`);

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  const interviewId = url.searchParams.get("interviewId");

  // 1. Verify WS JWT
  const payload = await verifyWSToken(token);
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

  console.log(
    `✅ Connection: user=${payload.sub}, interview=${interviewId}`
  );

  // 3. Send initial state
  sendMessage(ws, { type: "STATE_CHANGE", state: "CONNECTING" });

  // 4. Create and start handler
  const handler = new InterviewHandler(ws, payload, interviewId);
  handler.start();

  sendMessage(ws, { type: "STATE_CHANGE", state: "READY" });

});

wss.on("error", (error) => {
  console.error("⚠️ WebSocket Server Error:", error);
});
