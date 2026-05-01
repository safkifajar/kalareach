// Wrapper Brevo Transactional Email API
// Docs: https://developers.brevo.com/reference/sendtransacemail

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type BrevoAttachment =
  | { name: string; url: string }
  | { name: string; content: string }; // content = base64

export type BrevoSendInput = {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: BrevoAttachment[];
};

export async function sendEmailBrevo(input: BrevoSendInput) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Kalareach";

  if (!apiKey || !senderEmail) {
    throw new Error("BREVO_API_KEY / BREVO_SENDER_EMAIL belum diset di .env.local");
  }

  const payload: Record<string, unknown> = {
    sender: { email: senderEmail, name: senderName },
    to: [input.to],
    subject: input.subject,
    htmlContent: input.htmlContent,
  };
  if (input.textContent) payload.textContent = input.textContent;
  if (input.attachments && input.attachments.length > 0) {
    payload.attachment = input.attachments;
  }

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ messageId: string }>;
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v ? String(v) : "";
  });
}
