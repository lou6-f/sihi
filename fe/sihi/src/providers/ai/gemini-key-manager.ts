import prisma from "@/lib/prisma";

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

type KeyStatus = "ACTIVE" | "COOLDOWN" | "DISABLED";

interface KeyState {
  key: string; // actual API key — NEVER logged or exposed
  alias: string; // "key_1", "key_2" — safe for logging
  status: KeyStatus;
  cooldownUntil: Date | null;
  totalRequests: number;
  totalErrors: number;
  lastUsedAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorCode: string | null;
}

export interface KeyStatusReport {
  alias: string;
  status: KeyStatus;
  cooldownUntil: Date | null;
  totalRequests: number;
  totalErrors: number;
  lastUsedAt: Date | null;
  lastErrorCode: string | null;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UsageStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  rateLimitCount: number;
  quotaExceededCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  avgLatencyMs: number;
  keyBreakdown: KeyStatusReport[];
}

// Errors that trigger key cooldown
const COOLDOWN_ERROR_CODES = [
  "429",
  "RESOURCE_EXHAUSTED",
  "RATE_LIMIT_EXCEEDED",
  "QUOTA_EXCEEDED",
];

// ═══════════════════════════════════════
// GeminiKeyManager
// ═══════════════════════════════════════

export class GeminiKeyManager {
  private keys: KeyState[];
  private currentIndex: number = 0;
  readonly maxRetries: number;
  private cooldownSeconds: number;

  constructor() {
    const rawKeys = process.env.GEMINI_API_KEYS?.split(",") || [];
    this.maxRetries = parseInt(process.env.GEMINI_MAX_RETRIES || "3", 10);
    this.cooldownSeconds = parseInt(
      process.env.GEMINI_COOLDOWN_SECONDS || "600",
      10
    );

    if (rawKeys.length === 0 || (rawKeys.length === 1 && !rawKeys[0].trim())) {
      console.warn(
        "⚠️ No Gemini API keys found in GEMINI_API_KEYS env variable"
      );
    }

    this.keys = rawKeys
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .map((key, i) => ({
        key,
        alias: `key_${i + 1}`,
        status: "ACTIVE" as KeyStatus,
        cooldownUntil: null,
        totalRequests: 0,
        totalErrors: 0,
        lastUsedAt: null,
        lastErrorAt: null,
        lastErrorCode: null,
      }));
  }

  /**
   * Get the next available key using round-robin rotation.
   * Skips keys in COOLDOWN or DISABLED status.
   * Auto-restores expired cooldowns.
   */
  getNextKey(): KeyState | null {
    this.checkCooldowns();

    const totalKeys = this.keys.length;
    if (totalKeys === 0) return null;

    for (let i = 0; i < totalKeys; i++) {
      const index = (this.currentIndex + i) % totalKeys;
      const key = this.keys[index];

      if (key.status === "ACTIVE") {
        this.currentIndex = (index + 1) % totalKeys;
        return key;
      }
    }

    return null; // All keys exhausted
  }

  /**
   * Record a successful API call.
   */
  async recordSuccess(
    alias: string,
    tokens: TokenUsage,
    latencyMs: number,
    requestType: string = "chat",
    endpoint?: string
  ): Promise<void> {
    const key = this.keys.find((k) => k.alias === alias);
    if (key) {
      key.totalRequests++;
      key.lastUsedAt = new Date();
    }

    // Log to database (async, non-blocking)
    try {
      await prisma.apiProviderUsageLog.create({
        data: {
          provider: "gemini",
          keyAlias: alias,
          requestType,
          endpoint,
          status: "success",
          promptTokens: tokens.promptTokens,
          completionTokens: tokens.completionTokens,
          totalTokens: tokens.totalTokens,
          latencyMs,
        },
      });
    } catch (err) {
      // Don't let logging failures break the main flow
      console.error("Failed to log API usage:", err);
    }
  }

  /**
   * Record a failed API call. Sets key to COOLDOWN if it's a quota/rate-limit error.
   */
  async recordFailure(
    alias: string,
    errorCode: string,
    errorMessage?: string,
    requestType: string = "chat",
    endpoint?: string
  ): Promise<void> {
    const key = this.keys.find((k) => k.alias === alias);
    if (key) {
      key.totalErrors++;
      key.lastErrorAt = new Date();
      key.lastErrorCode = errorCode;

      if (this.isCooldownError(errorCode)) {
        key.status = "COOLDOWN";
        key.cooldownUntil = new Date(
          Date.now() + this.cooldownSeconds * 1000
        );
        console.warn(
          `🔑 ${alias} → COOLDOWN until ${key.cooldownUntil.toISOString()} (${errorCode})`
        );
      }
    }

    // Log to database
    try {
      await prisma.apiProviderUsageLog.create({
        data: {
          provider: "gemini",
          keyAlias: alias,
          requestType,
          endpoint,
          status: this.isCooldownError(errorCode) ? "rate_limit" : "error",
          errorCode,
          errorMessage: errorMessage?.slice(0, 500),
        },
      });
    } catch (err) {
      console.error("Failed to log API error:", err);
    }
  }

  /**
   * Check if any key is available for use.
   */
  hasAvailableKey(): boolean {
    this.checkCooldowns();
    return this.keys.some((k) => k.status === "ACTIVE");
  }

  /**
   * Get status of all keys WITHOUT exposing raw API keys.
   */
  getKeyStatuses(): KeyStatusReport[] {
    this.checkCooldowns();
    return this.keys.map((k) => ({
      alias: k.alias,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      totalRequests: k.totalRequests,
      totalErrors: k.totalErrors,
      lastUsedAt: k.lastUsedAt,
      lastErrorCode: k.lastErrorCode,
    }));
  }

  /**
   * Get aggregated usage stats from the database.
   */
  async getUsageStats(timeRange?: {
    from: Date;
    to: Date;
  }): Promise<UsageStats> {
    const where: Record<string, unknown> = { provider: "gemini" };
    if (timeRange) {
      where.createdAt = { gte: timeRange.from, lte: timeRange.to };
    }

    const logs = await prisma.apiProviderUsageLog.findMany({
      where: where as never,
      select: {
        status: true,
        promptTokens: true,
        completionTokens: true,
        latencyMs: true,
      },
    });

    const totalRequests = logs.length;
    const successCount = logs.filter((l) => l.status === "success").length;
    const errorCount = logs.filter((l) => l.status === "error").length;
    const rateLimitCount = logs.filter((l) => l.status === "rate_limit").length;
    const quotaExceededCount = rateLimitCount; // Same category

    const totalPromptTokens = logs.reduce(
      (sum, l) => sum + (l.promptTokens || 0),
      0
    );
    const totalCompletionTokens = logs.reduce(
      (sum, l) => sum + (l.completionTokens || 0),
      0
    );
    const latencies = logs
      .map((l) => l.latencyMs)
      .filter((l): l is number => l !== null);
    const avgLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    return {
      totalRequests,
      successCount,
      errorCount,
      rateLimitCount,
      quotaExceededCount,
      totalPromptTokens,
      totalCompletionTokens,
      avgLatencyMs,
      keyBreakdown: this.getKeyStatuses(),
    };
  }

  /**
   * Get the total number of keys configured.
   */
  get totalKeys(): number {
    return this.keys.length;
  }

  /**
   * Check if an error code should trigger a key cooldown.
   */
  isCooldownError(errorCode: string): boolean {
    return COOLDOWN_ERROR_CODES.some(
      (code) =>
        errorCode === code || errorCode.toUpperCase().includes(code)
    );
  }

  /**
   * Auto-restore keys whose cooldown period has expired.
   */
  private checkCooldowns(): void {
    const now = new Date();
    for (const key of this.keys) {
      if (
        key.status === "COOLDOWN" &&
        key.cooldownUntil &&
        now >= key.cooldownUntil
      ) {
        key.status = "ACTIVE";
        key.cooldownUntil = null;
        console.info(`🔑 ${key.alias} → ACTIVE (cooldown expired)`);
      }
    }
  }
}
