import { Resend } from "resend";

const DEFAULT_FROM = "CimagFlow <onboarding@resend.dev>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  notificationId: string;
}

export async function sendEmail({ to, subject, html, notificationId }: SendEmailParams) {
  try {
    console.log(`[Email] Enviando para: ${to}, assunto: ${subject}`);
    const { data, error } = await getResend().emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[Email] Erro Resend ao enviar para ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Enviado com sucesso para ${to}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error(`[Email] Exceção ao enviar para ${to}:`, error);
    return { success: false, error: String(error) };
  }
}

export function buildSignatureEmail(params: {
  signerName: string;
  documentTitle: string;
  creatorName: string;
  message?: string;
  signLink: string;
  deadline?: string;
}) {
  const { signerName, documentTitle, creatorName, message, signLink, deadline } = params;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #10B981 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">✍️ CimagFlow</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Sistema de Assinatura Digital</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #374151;">Olá, <strong>${signerName}</strong>!</p>
        <p style="color: #6B7280;"><strong>${creatorName}</strong> convidou você para assinar o documento:</p>
        <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1E3A5F;">${documentTitle}</p>
        </div>
        ${message ? `<p style="color: #6B7280;"><em>"${message}"</em></p>` : ""}
        ${deadline ? `<p style="color: #EF4444; font-size: 14px;">⏰ Prazo: <strong>${deadline}</strong></p>` : ""}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${signLink}" style="background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">📝 Assinar Documento</a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">Se o botão não funcionar, copie e cole o link: <br/><a href="${signLink}" style="color: #10B981;">${signLink}</a></p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">Este e-mail foi enviado pelo CimagFlow. Não responda a este e-mail.</p>
      </div>
    </div>
  `;
}

export function buildCompletedEmail(params: {
  creatorName: string;
  documentTitle: string;
  totalSigners: number;
  documentLink: string;
}) {
  const { creatorName, documentTitle, totalSigners, documentLink } = params;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #10B981 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">✍️ CimagFlow</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="background: #F0FDF4; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">✅</div>
        </div>
        <h2 style="color: #1E3A5F; text-align: center;">Documento Completamente Assinado!</h2>
        <p style="color: #6B7280; text-align: center;">Olá, <strong>${creatorName}</strong>! O documento abaixo foi assinado por todos os ${totalSigners} assinante(s).</p>
        <div style="background: #F0FDF4; border: 1px solid #10B981; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1E3A5F;">${documentTitle}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${documentLink}" style="background: #1E3A5F; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">Ver Documento</a>
        </div>
      </div>
    </div>
  `;
}

export function buildReminderEmail(params: {
  signerName: string;
  documentTitle: string;
  signLink: string;
  daysLeft?: number;
}) {
  const { signerName, documentTitle, signLink, daysLeft } = params;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #10B981 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">✍️ CimagFlow</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #374151;">⏰ Lembrete para <strong>${signerName}</strong>!</p>
        <p style="color: #6B7280;">Você ainda não assinou o documento:</p>
        <div style="background: #FFF7ED; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1E3A5F;">${documentTitle}</p>
        </div>
        ${daysLeft !== undefined ? `<p style="color: #EF4444; font-weight: 600;">⚠️ Faltam ${daysLeft} dia(s) para o prazo!</p>` : ""}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${signLink}" style="background: #F59E0B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">📝 Assinar Agora</a>
        </div>
      </div>
    </div>
  `;
}
