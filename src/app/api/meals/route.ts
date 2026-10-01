import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { mealLogSchema, firstError } from "@/lib/validation";
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

  const parsed = mealLogSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { date, mealType, mealName, completed, notes } = parsed.data;
  const dateObj = keyToDate(date);

  const existing = await prisma.mealLog.findFirst({
    where: { userId: user.id, date: dateObj, mealType },
  });

  const log = existing
    ? await prisma.mealLog.update({
        where: { id: existing.id },
        data: { mealName, completed, notes: notes ?? null },
      })
    : await prisma.mealLog.create({
        data: { userId: user.id, date: dateObj, mealType, mealName, completed, notes: notes ?? null },
      });

  let pointsAwarded = 0;
  if (completed && (!existing || !existing.completed)) {
    await awardPoints(
      user.id,
      POINTS.MEAL_COMPLETED,
      `Comida completada: ${mealName}`,
      "meal",
      log.id
    );
    pointsAwarded = POINTS.MEAL_COMPLETED;

    // Bonus si completó todas las comidas del día.
    const dayLogs = await prisma.mealLog.findMany({
      where: { userId: user.id, date: dateObj },
    });
    const allCompleted =
      dayLogs.filter((l) => l.id !== log.id || completed).every((l) => l.completed) &&
      dayLogs.length >= 5;
    if (allCompleted) {
      await awardPoints(
        user.id,
        POINTS.ALL_MEALS_COMPLETED,
        "Día alimenticio completo",
        "mealDay",
        date
      );
      pointsAwarded += POINTS.ALL_MEALS_COMPLETED;
    }
  }

  return Response.json({ ok: true, pointsAwarded });
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return Response.json({ logs: [] });

  const logs = await prisma.mealLog.findMany({
    where: { userId: user.id, date: keyToDate(date) },
  });

  return Response.json({
    logs: logs.map((l) => ({ ...l, date: dateToKey(l.date) })),
  });
}