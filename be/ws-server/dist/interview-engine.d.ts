import type { WebSocket } from "ws";
import type { ClientMessage } from "./types.js";
export interface MessageContext {
    userId: string;
    interviewId: string;
    ws: WebSocket;
}
/**
 * Route an incoming WS client message to the correct handler.
 */
export declare function processMessage(ctx: MessageContext, raw: ClientMessage): Promise<void>;
//# sourceMappingURL=interview-engine.d.ts.map