import { prisma } from "./prisma";
import { addDays, dateToKey, dayKeyFromDate, keyToDate } from "./dates";
import type { DayKey, DayKind, WorkoutStatus, UserSettings } from "@prisma/client";

export type StreakResult = {
  currentCount: number;
  longestCount: number;
  lastCompletedDate: Date | null;
  changed: boolean;
};

/**
 * Recalcula la racha desde cero en base al historial de WorkoutLog.
 *
 * Reglas (definidas por el usuario):
 * - Los días TRAIN cuentan para la racha: completarlos la incrementa.
 * - Los días RECOVERY y REST (domingo) son NEUTRALES: no la incrementan
 *   ni la rompen. Opcionalmente, con `streakCountRecoveryDays`, los días
 *   RECOVERY también pueden contarse como cumplidos.
 * - Un día TRAIN omitido (SKIPPED) o no registrado (y ya pasado) rompe la racha.
 * - Un día TRAIN marcado como PARTIAL no rompe la racha pero tampoco la incrementa.
 */
export async function recomputeStreak(
  userId: string,
  settings?: Pick<UserSettings, "streakCountRecoveryDays" | "restDayIsNeutral"> | null
): Promise<StreakResult> {
  const [logs, dayKinds, resolvedSettings] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId },
      select: { date: true, dayKey: true, status: true },
      orderBy: { date: "asc" },
    }),
    // La rutina del usuario si tiene plantilla asignada; si no, la oficial.
    prisma.routineDay.findMany({
      where: {
        template: {
          OR: [
            { isOfficial: true },
            { userPrograms: { some: { userId, isActive: true } } },
          ],
        },
      },
      select: { dayKey: true, kind: true, template: { select: { isOfficial: true, userPrograms: { where: { userId, isActive: true }, select: { id: true } } } } },
    }),
    settings
      ? Promise.resolve(settings)
      : prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  // Si el usuario tiene plantilla propia, sus días tienen prioridad.
  const kindByDay = new Map<string, DayKind>();
  for (const d of dayKinds) {
    if (!kindByDay.has(d.dayKey) && d.template.userPrograms.length > 0) {
      kindByDay.set(d.dayKey, d.kind);
    }
  }
  for (const d of dayKinds) {
    if (!kindByDay.has(d.dayKey)) kindByDay.set(d.dayKey, d.kind);
  }

  const countRecovery = resolvedSettings?.streakCountRecoveryDays ?? false;
  const logByKey = new Map(logs.map((l) => [dateToKey(l.date), l]));

  // Rango: desde el primer log hasta hoy (inclusive).
  const today = new Date();
  const todayK = dateToKey(today);
  const firstKey = logs.length ? dateToKey(logs[0].date) : todayK;
  const start = keyToDate(firstKey);

  let current = 0;
  let longest = 0;
  let lastCompleted: Date | null = null;

  for (let date = start; dateToKey(date) <= todayK; date = addDays(date, 1)) {
    const key = dateToKey(date);
    const dayKey = dayKeyFromDate(date);
    const kind = kindByDay.get(dayKey) ?? "TRAIN";
    const log = logByKey.get(key);
    const isToday = key === todayK;

    const isNeutral = kind === "REST" || (kind === "RECOVERY" && !countRecovery);

    // Días neutros (domingo, recuperación): la racha ni avanza ni se rompe.
    if (isNeutral) {
      longest = Math.max(longest, current);
      continue;
    }

    if (log?.status === "COMPLETED") {
      current += 1;
      longest = Math.max(longest, current);
      lastCompleted = date;
      continue;
    }

    if (log?.status === "PARTIAL") {
      // Un día parcial cuenta como fulfillment de la racha pero no la incrementa:
      // seguimos dentro de la misma racha.
      // No rompe ni incrementa: la racha queda "congelada".
      longest = Math.max(longest, current);
      continue;
    }

    if (log?.status === "SKIPPED" || (!log && !isToday)) {
      // Día de entrenamiento fallado (o pasado sin registro): la racha se
      // reinicia a cero, pero puede volver a crecer con los días siguientes.
      current = 0;
      lastCompleted = null;
      continue;
    }

    // Hoy (o futuro) aún sin registrar: no affecta la racha.
  }

  // La racha "actual" sólo es válida si no se rompió en el último día de
  // entrenamiento evaluado. Si el usuario se saltó ayer, current ya es 0.
  const result: StreakResult = {
    currentCount: current,
    longestCount: Math.max(longest, current),
    lastCompletedDate: lastCompleted,
    changed: true,
  };

  await prisma.streak.upsert({
    where: { userId },
    update: {
      currentCount: result.currentCount,
      longestCount: result.longestCount,
      lastCompletedDate: result.lastCompletedDate,
    },
    create: {
      userId,
      currentCount: result.currentCount,
      longestCount: result.longestCount,
      lastCompletedDate: result.lastCompletedDate,
    },
  });

  return result;
}

export function isCountableDay(kind: DayKind, countRecovery: boolean): boolean {
  if (kind === "TRAIN") return true;
  if (kind === "RECOVERY") return countRecovery;
  return false; // REST
}

export function isNeutralDay(kind: DayKind, countRecovery: boolean): boolean {
  return !isCountableDay(kind, countRecovery);
}