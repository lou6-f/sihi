import { WebSocket } from "ws";
import type { WSTokenPayload } from "./types.js";
/**
 * Manages a single WebSocket connection for an interview session.
 * Handles heartbeat, message routing, and clean teardown.
 */
export declare class InterviewHandler {
    private ws;
    private payload;
    private interviewId;
    private isAlive;
    private heartbeatTimer?;
    constructor(ws: WebSocket, payload: WSTokenPayload, interviewId: string);
    /** Attach listeners and start heartbeat */
    start(): void;
    private handleRawMessage;
    private handleClose;
    private handleError;
    private startHeartbeat;
    private stopHeartbeat;
    private send;
}
//# sourceMappingURL=interview-handler.d.ts.map