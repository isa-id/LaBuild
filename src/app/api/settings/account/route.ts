import { prisma } from "@/lib/prisma";
import { getSessionUserId, destroySession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { deleteAccountSchema, firstError, fieldErrors } from "@/lib/validation";

/**
 * DELETE: borra la cuenta y todos sus datos.
 *
 * Exigimos la contraseña y que escriban BORRAR. Casi todas las relaciones
 * están en `onDelete: Cascade`, así que una sola llamada limpia el historial
 * de entrenamientos, comidas, peso, penalizaciones y logros.
 */
export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: firstError(parsed.error), fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { password, confirm } = parsed.data;

  // La cookie es httpOnly, así que el frontend no puede saber el id del
  // usuario: lo leemos del token verificado.
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return Response.json(
      { error: "La contraseña no es correcta", fields: { password: "No coincide" } },
      { status: 401 }
    );
  }

  await prisma.user.delete({ where: { id: userId } });

  await destroySession();

  return Response.json({ ok: true });
}
