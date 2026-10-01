/**
 * Pruebas de las funciones de fecha.
 *
 *   npx tsx scripts/dates-test.ts
 *
 * Sin conexión a la base: sólo lógica pura.
 */
import { dateOfDayInWeek, startOfWeek, dateToKey, dayKeyFromDate } from "../src/lib/dates";
import type { DayKey } from "@prisma/client";

export {};

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  check(name, ok, ok ? "" : `esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
}

// Una semana cualquiera: lunes 2026-10-05 ... domingo 2026-10-11.
const MONDAY = "2026-10-05";

const DAYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const EXPECTED = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
  "2026-10-11",
];

console.log("\n=== Fechas ===\n");

console.log("startOfWeek");

// Cualquier día de la semana debe devolver el lunes correspondiente.
for (const [index, date] of EXPECTED.entries()) {
  eq(`  ${DAYS[index]} -> lunes de su semana`, dateToKey(startOfWeek(date)), MONDAY);
}

// Un domingo pertenece a la semana que empezó el lunes ANTERIOR.
eq("  domingo -> lunes anterior", dateToKey(startOfWeek("2026-10-11")), MONDAY);

// Cruce de mes y de año.
eq("  2026-01-01 (jueves) -> 2025-12-29", dateToKey(startOfWeek("2026-01-01")), "2025-12-29");
eq("  2026-12-31 (jueves) -> 2026-12-28", dateToKey(startOfWeek("2026-12-31")), "2026-12-28");

console.log("\ndateOfDayInWeek");

// Desde cualquier día de la semana, los 7 días salen en orden y completos.
for (const today of EXPECTED) {
  const resolved = DAYS.map((day) => dateOfDayInWeek(day, today));

  eq(
    `  desde ${today} los 7 días`,
    resolved.join(","),
    EXPECTED.join(",")
  );
}

// El día de hoy debe resolverse a sí mismo.
for (const today of EXPECTED) {
  const key = dayKeyFromDate(new Date(`${today}T00:00:00Z`));
  eq(`  ${today} resuelve a sí mismo`, dateOfDayInWeek(key, today), today);
}

// Cruce de año: el 1 de enero de 2026 pertenece a la semana del 29/12/2025.
eq(
  "  2026-01-01 (jueves) -> jueves 2026-01-01",
  dateOfDayInWeek("THU", "2026-01-01"),
  "2026-01-01"
);
eq(
  "  2026-01-01 -> lunes 2025-12-29",
  dateOfDayInWeek("MON", "2026-01-01"),
  "2025-12-29"
);

console.log(`\n${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);