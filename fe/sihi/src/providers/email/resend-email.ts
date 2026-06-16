import { Resend } from "resend";
import type { EmailProvider, SendEmailOptions, EmailResult } from "./email-provider";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private client: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY không được cấu hình");
    }
    this.client = new Resend(apiKey);
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const defaultFrom = process.env.EMAIL_FROM || "SiHi <noreply@sihi.vn>";

      const { data, error } = await this.client.emails.send({
        from: options.from || defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định khi gửi email";
      return {
        success: false,
        error: message,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.RESEND_API_KEY;
  }
}
