export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(options: SendEmailOptions): Promise<EmailResult>;
  isAvailable(): Promise<boolean>;
}
