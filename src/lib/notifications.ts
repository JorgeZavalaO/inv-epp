/**
 * Notifies a new public access request.
 *
 * Two optional channels, both configured through environment variables:
 * - CONTACT_WEBHOOK_URL: POSTs the lead as JSON (Zapier, Make, WhatsApp Cloud API, etc.)
 * - RESEND_API_KEY + CONTACT_NOTIFICATION_EMAIL: sends an email through Resend.
 *
 * Notification failures never reject the request; the lead is already stored.
 */
export interface AccessRequestNotification {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  createdAt: Date;
}

function buildText(data: AccessRequestNotification): string {
  return [
    `Nueva solicitud de acceso #${data.id}`,
    `Nombre: ${data.name}`,
    `Correo: ${data.email}`,
    data.phone ? `Teléfono: ${data.phone}` : null,
    data.company ? `Empresa: ${data.company}` : null,
    data.message ? `Mensaje: ${data.message}` : null,
    `Fecha: ${data.createdAt.toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendWebhook(data: AccessRequestNotification): Promise<void> {
  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "access_request",
      ...data,
      createdAt: data.createdAt.toISOString(),
    }),
    signal: AbortSignal.timeout(5000),
  });
}

async function sendEmail(data: AccessRequestNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.CONTACT_NOTIFICATION_FROM ?? "onboarding@resend.dev";
  const text = buildText(data);

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Solicitud de acceso: ${data.name}`,
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    }),
    signal: AbortSignal.timeout(5000),
  });
}

export async function notifyAccessRequest(
  data: AccessRequestNotification,
): Promise<void> {
  const results = await Promise.allSettled([
    sendWebhook(data),
    sendEmail(data),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Access request notification failed:", result.reason);
    }
  }
}
