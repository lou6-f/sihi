"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWSToken = verifyWSToken;
const jose_1 = require("jose");
const WS_JWT_SECRET = new TextEncoder().encode(process.env.WS_JWT_SECRET || "");
async function verifyWSToken(token) {
    if (!token)
        return null;
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, WS_JWT_SECRET);
        // Verify purpose claim
        if (payload.purpose !== "websocket_interview")
            return null;
        // Verify required fields
        if (!payload.sub || !payload.email || !payload.role)
            return null;
        return {
            sub: payload.sub,
            email: payload.email,
            role: payload.role,
            purpose: payload.purpose,
        };
    }
    catch {
        // Token expired, invalid signature, malformed, etc.
        return null;
    }
}
//# sourceMappingURL=auth.js.map