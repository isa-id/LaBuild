import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema, firstError } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json(
      { error: "Email o contraseña incorrectos" },
      { status: 401 }
    );
  }

  await createSession(user.id);

  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
}