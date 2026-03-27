import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { sendTransactional } from "@/lib/email-service";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }

    const randomPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(randomPassword, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone ?? null,
        role: role ?? "COLABORADOR",
        mustChangePassword: true,
      },
    });

    // Enviar senha aleatória por email
    try {
      await sendTransactional({
        to: email,
        subject: "[CimagFlow] Sua senha de acesso",
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 32px;">
              <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #10B981 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">✍️ CimagFlow</h1>
                  <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Bem-vindo ao sistema</p>
                </div>
                <div style="padding: 32px;">
                  <p style="font-size: 16px; color: #374151;">Olá, <strong>${name}</strong>!</p>
                  <p style="color: #6B7280;">Sua conta foi criada com sucesso. Use a senha abaixo para fazer seu primeiro acesso:</p>
                  <div style="background: #F0FDF4; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">Sua senha temporária:</p>
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1E3A5F; letter-spacing: 3px; font-family: monospace;">${randomPassword}</p>
                  </div>
                  <p style="color: #EF4444; font-size: 14px;">⚠️ Recomendamos que você altere sua senha após o primeiro acesso.</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'https://cimagflow.com'}/login" style="background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">Acessar o Sistema</a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
                  <p style="color: #9CA3AF; font-size: 12px; text-align: center;">Este e-mail foi enviado pelo CimagFlow. Não responda a este e-mail.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email com senha:", emailError);
    }

    // Registrar auditoria de criação de conta
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")?.[0] ?? req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entity: "user",
      entityId: user.id,
      entityName: `${user.name} - ${user.email}`,
      details: `Conta criada: ${user.name} - ${user.email}, Perfil: ${user.role}`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ success: true, id: user.id }, { status: 201 });
  } catch (error) {
    console.error("Erro no signup:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
