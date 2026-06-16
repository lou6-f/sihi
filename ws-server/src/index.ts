import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { jwtVerify } from "jose";
import { IncomingMessage } from "http";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

interface WSClient {
  ws: WebSocket;
  userId: string;
  email: string;
  interviewId: string | null;
  isAlive: boolean;
}

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ═══════════════════════════════════════
// Config
// ═══════════════════════════════════════

const PORT = parseInt(process.env.WS_PORT || "3001");
const WS_JWT_SECRET = process.env.WS_JWT_SECRET;

if (!WS_JWT_SECRET) {
  console.error("❌ WS_JWT_SECRET is required");
  process.exit(1);
}

const secret = new TextEncoder().encode(WS_JWT_SECRET);

// ═══════════════════════════════════════
// JWT Verification
// ═══════════════════════════════════════

async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (err) {
    console.error("JWT verify failed:", (err as Error).message);
    return null;
  }
}

// ═══════════════════════════════════════
// Server
// ═══════════════════════════════════════

const wss = new WebSocketServer({ port: PORT });
const clients = new Map<WebSocket, WSClient>();

console.log(`🚀 SiHi WebSocket Server running on ws://localhost:${PORT}`);

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  // Parse URL params
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");
  const interviewId = url.searchParams.get("interviewId");

  // Authenticate
  if (!token) {
    ws.close(4001, "Missing token");
    return;
  }

  const auth = await verifyToken(token);
  if (!auth) {
    ws.close(4003, "Invalid token");
    return;
  }

  // Register client
  const client: WSClient = {
    ws,
    userId: auth.userId,
    email: auth.email,
    interviewId: interviewId || null,
    isAlive: true,
  };
  clients.set(ws, client);

  console.log(`✅ Connected: ${auth.email} (interview: ${interviewId || "none"})`);

  // Send welcome
  sendMessage(ws, {
    type: "CONNECTED",
    payload: { userId: auth.userId, interviewId },
    timestamp: Date.now(),
  });

  // Message handler
  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString()) as WSMessage;
      await handleMessage(client, msg);
    } catch (err) {
      sendMessage(ws, {
        type: "ERROR",
        payload: { code: "PARSE_ERROR", message: "Invalid JSON message" },
        timestamp: Date.now(),
      });
    }
  });

  // Ping/pong for keepalive
  ws.on("pong", () => {
    client.isAlive = true;
  });

  // Disconnect
  ws.on("close", () => {
    clients.delete(ws);
    console.log(`❌ Disconnected: ${auth.email}`);
  });

  ws.on("error", (err) => {
    console.error(`WS error for ${auth.email}:`, err.message);
    clients.delete(ws);
  });
});

// ═══════════════════════════════════════
// Message Handler
// ═══════════════════════════════════════

async function handleMessage(client: WSClient, msg: WSMessage) {
  switch (msg.type) {
    case "PING":
      sendMessage(client.ws, { type: "PONG", payload: {}, timestamp: Date.now() });
      break;

    case "INTERVIEW_START":
      // Client signals interview start — bind interviewId
      if (msg.payload.interviewId) {
        client.interviewId = msg.payload.interviewId as string;
      }
      sendMessage(client.ws, {
        type: "INTERVIEW_START",
        payload: { interviewId: client.interviewId, status: "started" },
        timestamp: Date.now(),
      });
      break;

    case "INTERVIEW_ANSWER":
      // Forward STT result to AI processing
      // In MVP, interview processing happens via HTTP API routes
      // WS is used for real-time STT streaming only
      sendMessage(client.ws, {
        type: "INTERVIEW_ANSWER",
        payload: {
          received: true,
          questionNumber: msg.payload.questionNumber,
        },
        timestamp: Date.now(),
      });
      break;

    case "STT_AUDIO":
      // Future: forward audio chunk to PhoWhisper STT service
      // For MVP: acknowledge receipt
      sendMessage(client.ws, {
        type: "STT_PROCESSING",
        payload: { status: "received" },
        timestamp: Date.now(),
      });
      break;

    default:
      sendMessage(client.ws, {
        type: "ERROR",
        payload: { code: "UNKNOWN_TYPE", message: `Unknown message type: ${msg.type}` },
        timestamp: Date.now(),
      });
  }
}

// ═══════════════════════════════════════
// Utilities
// ═══════════════════════════════════════

function sendMessage(ws: WebSocket, msg: WSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// Broadcast to specific interview
function broadcastToInterview(interviewId: string, msg: WSMessage) {
  for (const [, client] of clients) {
    if (client.interviewId === interviewId) {
      sendMessage(client.ws, msg);
    }
  }
}

// Heartbeat — every 30s, drop dead connections
const heartbeatInterval = setInterval(() => {
  for (const [ws, client] of clients) {
    if (!client.isAlive) {
      console.log(`💀 Dead connection: ${client.email}`);
      ws.terminate();
      clients.delete(ws);
      return;
    }
    client.isAlive = false;
    ws.ping();
  }
}, 30000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down WebSocket server...");
  clearInterval(heartbeatInterval);
  for (const [ws] of clients) {
    ws.close(1001, "Server shutting down");
  }
  wss.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

export { wss, broadcastToInterview };
