/**
 * Verifica la lógica de rachas y penitencias por tipo de día.
 *
 * Los escenarios se construyen con fechas concretas alrededor de hoy, de modo
 * que los días que evalúa recomputeStreak (que camina del primer log hasta hoy)
 * queden cubiertos de forma determinista.
 */
import { prisma } from "../src/lib/prisma";
import { recomputeStreak } from "../src/lib/streak";
import { applyPenaltyForSkippedWorkout } from "../src/lib/penalties";
import type { DayKey, WorkoutStatus } from "@prisma/client";

const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

let failures = 0;

function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok
        ? ""
        : `\n         esperado ${JSON.stringify(expected)} · obtenido ${JSON.stringify(actual)}`)
  );
}

function dayKeyOf(date: Date): DayKey {
  return (["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const)[date.getUTCDay()];
}

/** Fecha a medianoche UTC con offset de días respecto a hoy (0 = hoy). */
function offsetDate(back: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}

type Entry = { date: Date; status: WorkoutStatus };

async function runScenario(
  label: string,
  entries: Entry[],
  opts: { expectStreak?: number; expectLongest?: number; expectPenalties?: number }
) {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });
  if (!user) throw new Error("Necesitas un usuario. Ejecuta antes el smoke test.");

  await prisma.penalty.deleteMany({ where: { userId: user.id } });
  await prisma.workoutLog.deleteMany({ where: { userId: user.id } });
  await prisma.streak.deleteMany({ where: { userId: user.id } });

  const ordered = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  let penalties = 0;

  for (const e of ordered) {
    const dayKey = dayKeyOf(e.date);
    const log = await prisma.workoutLog.create({
      data: { userId: user.id, date: e.date, dayKey, status: e.status },
    });
    const p = await applyPenaltyForSkippedWorkout(log, dayKey === "SUN");
    if (p) penalties += 1;
  }

  const s = await recomputeStreak(user.id);

  console.log(`\n${label}`);
  console.log(
    `         registros=[${ordered.map((e) => `${dayKeyOf(e.date)}:${e.status}`).join(", ")}]`
  );
  console.log(
    `         racha=${s.currentCount} mejor=${s.longestCount} penitencias=${penalties}`
  );

  if (opts.expectStreak !== undefined) expect("racha actual", s.currentCount, opts.expectStreak);
  if (opts.expectLongest !== undefined) expect("mejor racha", s.longestCount, opts.expectLongest);
  if (opts.expectPenalties !== undefined) expect("penitencias", penalties, opts.expectPenalties);
}

/**
 * Construye una ventana de N días consecutivos terminando hoy.
 * `pattern` describe el estado por día empezando en el más antiguo.
 * Los días sin entrada en el patrón quedan sin registro (omitidos si ya pasaron).
 */
function window(pattern: Partial<Record<number, WorkoutStatus>>, days: number): Entry[] {
  const out: Entry[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const status = pattern[back];
    if (status) out.push({ date: offsetDate(back), status });
  }
  return out;
}

/** Tipo de día de hoy según la rutina oficial (TRAIN / RECOVERY / REST). */
async function kindOfToday(): Promise<"TRAIN" | "RECOVERY" | "REST"> {
  const today = new Date();
  const routineDay = await prisma.routineDay.findFirst({
    where: {
      dayKey: dayKeyOf(today),
      template: { isOfficial: true },
    },
    select: { kind: true },
  });
  return routineDay?.kind ?? "TRAIN";
}

async function main() {
  console.log(`\n=== Rachas y penitencias ===`);
  console.log(`Hoy: ${new Date().toISOString().slice(0, 10)} (${dayKeyOf(new Date())})\n`);

  // 1. Sin registros.
  await runScenario("Sin registros: racha 0", [], {
    expectStreak: 0,
    expectLongest: 0,
    expectPenalties: 0,
  });

  // 2. Día de entrenamiento omitido rompe la racha y genera penitencia.
  //    Nota: si hoy es jueves/domingo (días neutrales), la racha queda en 0
  //    aunque el último día de entrenamiento sí se haya completado.
  const todayKind = await kindOfToday();
  await runScenario(
    "Entrenamiento omitido rompe la racha y penaliza",
    window({ 2: "COMPLETED", 1: "SKIPPED", 0: "COMPLETED" }, 3),
    {
      expectStreak: todayKind === "TRAIN" ? 1 : 0,
      expectLongest: 1,
      expectPenalties: 1,
    }
  );

  // 3. Parcial no rompe ni incrementa la racha.
  await runScenario(
    "Parcial no rompe la racha (congelada, sin incrementar)",
    window({ 2: "COMPLETED", 1: "PARTIAL", 0: "COMPLETED" }, 3),
    {
      expectStreak: todayKind === "TRAIN" ? 2 : 1,
      expectLongest: todayKind === "TRAIN" ? 2 : 1,
      expectPenalties: 1,
    }
  );

  // 4. Cadena de 5 días consecutivos cumplidos.
  //    Sólo los días TRAIN de la ventana incrementan la racha.
  const five = window(
    { 4: "COMPLETED", 3: "COMPLETED", 2: "COMPLETED", 1: "COMPLETED", 0: "COMPLETED" },
    5
  );
  const trainCount = five.filter((e) => dayKeyOf(e.date) !== "SUN" && dayKeyOf(e.date) !== "THU").length;
  await runScenario("Cinco días consecutivos cumplidos", five, {
    expectStreak: trainCount,
    expectLongest: trainCount,
    expectPenalties: 0,
  });
  console.log(
    `         (${trainCount} días TRAIN · el resto domingo/recuperación son neutrales)`
  );

  // 5. Siete días completos: el domingo no rompe la racha ni genera penitencia.
  const seven = window(
    {
      6: "COMPLETED",
      5: "COMPLETED",
      4: "COMPLETED",
      3: "COMPLETED",
      2: "COMPLETED",
      1: "COMPLETED",
      0: "COMPLETED",
    },
    7
  );
  const sevenTrain = seven.filter(
    (e) => dayKeyOf(e.date) !== "SUN" && dayKeyOf(e.date) !== "THU"
  ).length;
  await runScenario("Semana completa (incluye domingo)", seven, {
    expectStreak: sevenTrain,
    expectLongest: sevenTrain,
    expectPenalties: 0,
  });
  console.log(
    `         (${sevenTrain} días TRAIN · domingo(s) y recuperación no cuentan ni penalizan)`
  );

  console.log(
    failures === 0
      ? "\n=== Todas las verificaciones pasaron ===\n"
      : `\n=== ${failures} verificación(es) fallaron ===\n`
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });