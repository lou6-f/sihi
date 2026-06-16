// ═══════════════════════════════════════
// Email Types
// ═══════════════════════════════════════

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
