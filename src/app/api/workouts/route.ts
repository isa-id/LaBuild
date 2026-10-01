import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { upsertWorkoutSchema, firstError } from "@/lib/validation";
import { getRoutineDayByKey } from "@/lib/routine";
import { dateToKey, dayKeyFromDate, keyToDate } from "@/lib/dates";
import { applyPenaltyForSkippedWorkout } from "@/lib/penalties";
import { recomputeStreak } from "@/lib/streak";
import { evaluateProgressionUnlock } from "@/lib/progression";
import {
  POINTS,
  awardPoints,
  buildAchievementContext,
  evaluateAchievements,
} from "@/lib/gamification";

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

  const parsed = upsertWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { date, status, durationMin, notes, exercises } = parsed.data;
  const dateObj = keyToDate(date);
  const dayKey = dayKeyFromDate(dateObj);

  const routineDay = await getRoutineDayByKey(user.id, dayKey);
  const isRestDay = routineDay?.kind === "REST";

  // Estado previo ANTES del upsert: los puntos sólo se otorgan al cambiar.
  const previousStatus = (
    await prisma.workoutLog.findUnique({
      where: { userId_date: { userId: user.id, date: dateObj } },
      select: { status: true },
    })
  )?.status;

  const log = await prisma.workoutLog.upsert({
    where: { userId_date: { userId: user.id, date: dateObj } },
    update: {
      status,
      durationMin: durationMin ?? null,
      notes: notes ?? null,
      dayKey,
    },
    create: {
      userId: user.id,
      date: dateObj,
      dayKey,
      status,
      durationMin: durationMin ?? null,
      notes: notes ?? null,
    },
  });

  // Reemplaza los logs de ejercicios del día.
  await prisma.exerciseLog.deleteMany({ where: { workoutLogId: log.id } });
  if (exercises.length > 0) {
    // Sólo aceptamos routineExerciseId que existan realmente: si el cliente
    // envía uno desconocido (o ninguno), guardamos el ejercicio sin vincular.
    const sentIds = [
      ...new Set(
        exercises.map((e) => e.routineExerciseId).filter((id): id is string => Boolean(id))
      ),
    ];
    const validIds = new Set<string>();
    if (sentIds.length > 0) {
      const found = await prisma.routineExercise.findMany({
        where: { id: { in: sentIds } },
        select: { id: true },
      });
      for (const f of found) validIds.add(f.id);
    }

    await prisma.exerciseLog.createMany({
      data: exercises.map((ex) => ({
        workoutLogId: log.id,
        routineExerciseId:
          ex.routineExerciseId && validIds.has(ex.routineExerciseId)
            ? ex.routineExerciseId
            : null,
        exerciseName: ex.exerciseName,
        completed: ex.completed,
        setsDone: ex.setsDone ?? undefined,
        repsDoneTotal: ex.repsDoneTotal ?? undefined,
        variantUsed: ex.variantUsed ?? null,
        perSide: ex.perSide,
        notes: ex.notes ?? null,
      })),
    });
  }

  const completedCount = exercises.filter((e) => e.completed).length;

  await prisma.workoutLog.update({
    where: { id: log.id },
    data: {
      completedExercises: completedCount,
      totalExercises: exercises.length,
    },
  });

  // --- Rachas ---
  const streak = await recomputeStreak(user.id);

  // --- Penitencias ---
  const penalty = await applyPenaltyForSkippedWorkout(
    { id: log.id, userId: user.id, date: dateObj, dayKey, status },
    isRestDay
  );

  // --- Puntos (sólo cuando el estado del día cambia) ---
  let pointsAwarded = 0;
  if (previousStatus !== status) {
    if (status === "COMPLETED") {
      const res = await awardPoints(
        user.id,
        POINTS.WORKOUT_COMPLETED,
        "Entrenamiento completado",
        "workout",
        log.id
      );
      pointsAwarded = POINTS.WORKOUT_COMPLETED;

      // Bonus por racha: 2 puntos por cada día de racha actual.
      if (streak.currentCount > 1) {
        const bonus = POINTS.STREAK_MILESTONE_PER_DAY * streak.currentCount;
        await awardPoints(
          user.id,
          bonus,
          `Bonus racha de ${streak.currentCount} días`,
          "streak",
          log.id
        );
        pointsAwarded += bonus;
      }
    } else if (status === "PARTIAL") {
      await awardPoints(
        user.id,
        POINTS.WORKOUT_PARTIAL,
        "Entrenamiento parcial",
        "workout",
        log.id
      );
      pointsAwarded = POINTS.WORKOUT_PARTIAL;
    }
  }

  // --- Progresión y logros ---
  const unlocks =
    status === "COMPLETED" ? await evaluateProgressionUnlock(user.id) : [];

  const context = await buildAchievementContext(user.id);
  const unlockedAchievements = await evaluateAchievements(context);

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true, level: true },
  });

  return Response.json({
    ok: true,
    workout: { id: log.id, date, status, completedCount },
    streak,
    penalty,
    pointsAwarded,
    unlocks,
    unlockedAchievements,
    user: updatedUser,
  });
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const logs = await prisma.workoutLog.findMany({
    where: {
      userId: user.id,
      ...(date ? { date: keyToDate(date) } : {}),
    },
    include: { exerciseLogs: true },
    orderBy: { date: "desc" },
  });

  return Response.json({
    logs: logs.map((l) => ({ ...l, date: dateToKey(l.date) })),
  });
}