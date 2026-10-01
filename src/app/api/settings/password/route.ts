import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema, firstError, fieldErrors } from "@/lib/validation";

/** POST: cambia la contraseña del usuario que tiene sesión iniciada. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: firstError(parsed.error), fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  // Obligamos a confirmar con la contraseña actual para que un token
  // robado no sirva para dejar la cuenta sin acceso.
  if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
    return Response.json(
      { error: "La contraseña actual no es correcta", fields: { currentPassword: "No coincide" } },
      { status: 401 }
    );
  }

  if (verifyPassword(newPassword, auth.user.passwordHash)) {
    return Response.json(
      {
        error: "La nueva contraseña debe ser distinta de la actual",
        fields: { newPassword: "Es la misma que la actual" },
      },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return Response.json({ ok: true });
}
