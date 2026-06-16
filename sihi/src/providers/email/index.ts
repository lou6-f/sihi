import type { EmailProvider } from "./email-provider";
import { MockEmailProvider } from "./mock-email";
import { ResendEmailProvider } from "./resend-email";
import { SmtpEmailProvider } from "./smtp-email";

export type { SendEmailOptions, EmailResult, EmailProvider } from "./email-provider";

let emailProviderInstance: EmailProvider | null = null;

function createEmailProvider(): EmailProvider {
  const providerName = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();

  switch (providerName) {
    case "mock":
      return new MockEmailProvider();

    case "resend":
      return new ResendEmailProvider();

    case "smtp":
      return new SmtpEmailProvider();

    default:
      console.warn(
        `[Email] Provider "${providerName}" không hợp lệ, sử dụng mock`
      );
      return new MockEmailProvider();
  }
}

export function getEmailProvider(): EmailProvider {
  if (!emailProviderInstance) {
    emailProviderInstance = createEmailProvider();
    console.log(`[Email] Đã khởi tạo provider: ${emailProviderInstance.name}`);
  }
  return emailProviderInstance;
}
