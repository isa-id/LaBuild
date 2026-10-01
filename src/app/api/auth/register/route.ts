import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { registerSchema, firstError } from "@/lib/validation";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { name, email, password, age, heightCm, startingWeightKg } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "Ya existe una cuenta con ese email" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      age,
      heightCm,
      startingWeightKg,
      settings: { create: {} },
      streak: { create: {} },
    },
  });

  // Asigna el programa oficial por defecto.
  const officialTemplate = await prisma.workoutTemplate.findFirst({
    where: { isOfficial: true },
  });
  if (officialTemplate) {
    await prisma.userProgram.create({
      data: {
        userId: user.id,
        templateId: officialTemplate.id,
        kind: "WORKOUT",
        startDate: new Date(),
        isActive: true,
      },
    });
  }

  await createSession(user.id);

  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
}