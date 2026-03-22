import { Resend } from "resend";

const DEFAULT_FROM = "CimagFlow <onboarding@resend.dev>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

// ─────────────────────────────────────────────
// 1. EMAIL TRANSACIONAL — confirmação / senha
// ─────────────────────────────────────────────
export async function sendTransactional({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return getResend().emails.send({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });
}

// ─────────────────────────────────────────────
// 2. NOTIFICAÇÃO DE AÇÃO NO APP
// ─────────────────────────────────────────────
export async function sendActionNotification({
  to,
  userName,
  action,
  details,
  ctaUrl,
  ctaLabel,
}: {
  to: string;
  userName: string;
  action: string;
  details: string;
  ctaUrl?: string;
  ctaLabel?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background:#f4f4f4; padding: 32px;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:32px;">
          <h2 style="color:#1a1a1a;">Olá, ${userName} 👋</h2>
          <p style="color:#444; font-size:16px;">Uma nova ação foi registrada no seu app:</p>
          <div style="background:#f0f4ff; border-left:4px solid #4361ee; padding:16px; border-radius:4px; margin: 16px 0;">
            <strong style="color:#1a1a1a;">${action}</strong>
            <p style="color:#555; margin:8px 0 0;">${details}</p>
          </div>
          ${
            ctaUrl
              ? `
          <a href="${ctaUrl}" style="
            display:inline-block; margin-top:24px;
            background:#4361ee; color:#fff;
            padding:12px 24px; border-radius:6px;
            text-decoration:none; font-weight:600;
          ">${ctaLabel || "Ver no App"}</a>`
              : ""
          }
          <p style="color:#999; font-size:12px; margin-top:32px;">
            Você está recebendo este email porque está cadastrado no nosso sistema.
          </p>
        </div>
      </body>
    </html>
  `;

  return getResend().emails.send({
    from: DEFAULT_FROM,
    to,
    subject: `[CimagFlow] ${action}`,
    html,
  });
}

// ─────────────────────────────────────────────
// 3. RELATÓRIO AUTOMÁTICO
// ─────────────────────────────────────────────
export async function sendReport({
  to,
  reportTitle,
  periodLabel,
  metrics,
}: {
  to: string;
  reportTitle: string;
  periodLabel: string;
  metrics: { label: string; value: string }[];
}) {
  const rows = metrics
    .map(
      (m) => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #eee; color:#555;">${m.label}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #eee; font-weight:600; color:#1a1a1a; text-align:right;">${m.value}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background:#f4f4f4; padding: 32px;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:32px;">
          <h2 style="color:#1a1a1a;">${reportTitle}</h2>
          <p style="color:#888; font-size:14px;">Período: <strong>${periodLabel}</strong></p>
          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <thead>
              <tr style="background:#f8f8f8;">
                <th style="padding:10px 12px; text-align:left; color:#888; font-size:13px;">Métrica</th>
                <th style="padding:10px 12px; text-align:right; color:#888; font-size:13px;">Valor</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#999; font-size:12px; margin-top:32px;">
            Relatório gerado automaticamente — ${new Date().toLocaleString("pt-BR")}.
          </p>
        </div>
      </body>
    </html>
  `;

  return getResend().emails.send({
    from: DEFAULT_FROM,
    to,
    subject: `📊 ${reportTitle} — ${periodLabel}`,
    html,
  });
}
