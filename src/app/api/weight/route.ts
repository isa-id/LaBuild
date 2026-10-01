import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { weightLogSchema, firstError } from "@/lib/validation";
import { POINTS, awardPoints } from "@/lib/gamification";
import { dateToKey, keyToDate } from "@/lib/dates";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = weightLogSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { date, weightKg } = parsed.data;
  const dateObj = keyToDate(date);

  const isNew = !(await prisma.weightLog.findUnique({
    where: { userId_date: { userId: user.id, date: dateObj } },
  }));

  await prisma.weightLog.upsert({
    where: { userId_date: { userId: user.id, date: dateObj } },
    update: { weightKg },
    create: { userId: user.id, date: dateObj, weightKg },
  });

  let pointsAwarded = 0;
  if (isNew) {
    await awardPoints(
      user.id,
      POINTS.WEIGHT_LOGGED,
      "Peso registrado",
      "weight",
      date
    );
    pointsAwarded = POINTS.WEIGHT_LOGGED;
  }

  return Response.json({ ok: true, pointsAwarded });
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const logs = await prisma.weightLog.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  return Response.json({
    logs: logs.map((l) => ({ date: dateToKey(l.date), weightKg: Number(l.weightKg) })),
  });
}