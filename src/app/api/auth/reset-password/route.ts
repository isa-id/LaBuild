import { prisma } from "@/lib/prisma";
import { hashPassword, generateResetToken, hashToken } from "@/lib/password";
import { forgotPasswordSchema, resetPasswordSchema, firstError } from "@/lib/validation";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * POST: solicita un enlace para restablecer la contraseña.
 *
 * La app no manda correo (no hay proveedor de email configurado), así que
 * devolvemos el enlace directamente. En producción habría que enviarlo por
 * email y nunca devolverlo en la respuesta.
 *
 * Siempre respondemos 200, exista o no el email: si no, un atacante podría
 * usar este endpoint para averiguar qué correos están registrados.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Respuesta idéntica exista o no el usuario.
  if (!user) {
    return Response.json({
      ok: true,
      message: "Si ese email está registrado, se generó un enlace de restablecimiento.",
    });
  }

  const token = generateResetToken();

  // Invalida los enlaces anteriores: sólo el último sirve.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return Response.json({
    ok: true,
    message: "Si ese email está registrado, se generó un enlace de restablecimiento.",
    // Sólo en desarrollo: en producción esto viajaría por email.
    devResetUrl: `/reset-password?token=${token}`,
  });
}

/** PUT: aplica la nueva contraseña usando un token válido. */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { token, newPassword } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return Response.json(
      { error: "El enlace expiró o ya fue usado. Solicita uno nuevo." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    // Marcarlo usado cierra el token aunque alguien repita la petición.
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
