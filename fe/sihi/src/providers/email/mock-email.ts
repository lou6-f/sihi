import type { EmailProvider, SendEmailOptions, EmailResult } from "./email-provider";

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const width = 60;
    const line = "─".repeat(width);
    const doubleLine = "═".repeat(width);

    console.log("");
    console.log(`╔${doubleLine}╗`);
    console.log(`║${"  📧 MOCK EMAIL SENT".padEnd(width)}║`);
    console.log(`╠${doubleLine}╣`);
    console.log(`║${"  Message ID: ".padEnd(16)}${messageId.padEnd(width - 16)}║`);
    console.log(`╟${line}╢`);
    console.log(`║${"  To:".padEnd(16)}${options.to.padEnd(width - 16)}║`);
    console.log(`║${"  From:".padEnd(16)}${(options.from || "noreply@sihi.vn").padEnd(width - 16)}║`);
    console.log(`║${"  Subject:".padEnd(16)}${options.subject.substring(0, width - 16).padEnd(width - 16)}║`);
    console.log(`╟${line}╢`);
    console.log(`║${"  Body:".padEnd(width)}║`);

    const bodyText = options.text || options.html.replace(/<[^>]*>/g, "");
    const bodyLines = bodyText.split("\n").slice(0, 10);
    for (const bodyLine of bodyLines) {
      const trimmed = bodyLine.trim().substring(0, width - 4);
      console.log(`║  ${trimmed.padEnd(width - 2)}║`);
    }
    if (bodyText.split("\n").length > 10) {
      console.log(`║${"  ... (truncated)".padEnd(width)}║`);
    }

    console.log(`╚${doubleLine}╝`);
    console.log("");

    return {
      success: true,
      messageId,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
