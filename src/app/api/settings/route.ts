import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { updateProfileSchema, updateAvatarSchema, firstError, fieldErrors } from "@/lib/validation";

/** GET: datos del perfil para el formulario de configuración. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { user } = auth;

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      heightCm: user.heightCm,
      startingWeightKg: Number(user.startingWeightKg),
      goal: user.goal,
      avatarDataUrl: user.avatarDataUrl,
    },
  });
}

/** PATCH: actualiza nombre, email, datos físicos y objetivo. */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: firstError(parsed.error), fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, age, heightCm, startingWeightKg, goal } = parsed.data;

  // El email debe seguir siendo único: no puede ser el de otra cuenta.
  if (email !== auth.user.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) {
      return Response.json(
        { error: "Ya existe una cuenta con ese email", fields: { email: "Ya está en uso" } },
        { status: 409 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: { name, email, age, heightCm, startingWeightKg, goal },
    select: { name: true, email: true },
  });

  return Response.json({ ok: true, user });
}

/** PUT: reemplaza o borra la foto de perfil. */
export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = updateAvatarSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: firstError(parsed.error), fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { avatarDataUrl } = parsed.data;

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: { avatarDataUrl },
    select: { avatarDataUrl: true },
  });

  return Response.json({ ok: true, avatarDataUrl: user.avatarDataUrl });
}
