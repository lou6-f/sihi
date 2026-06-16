import nodemailer from "nodemailer";
import type { EmailProvider, SendEmailOptions, EmailResult } from "./email-provider";

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP chưa được cấu hình đầy đủ. Cần: SMTP_HOST, SMTP_USER, SMTP_PASS"
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const defaultFrom = process.env.EMAIL_FROM || `SiHi <${process.env.SMTP_USER}>`;

      const info = await this.transporter.sendMail({
        from: options.from || defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`[SMTP] ✅ Email sent to ${options.to} — ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lỗi gửi email qua SMTP";
      console.error(`[SMTP] ❌ Failed to send to ${options.to}:`, message);
      return {
        success: false,
        error: message,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
