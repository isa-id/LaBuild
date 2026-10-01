import type { DayKey } from "@prisma/client";

export const DAY_ORDER: DayKey[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

export const DAY_LABEL_ES: Record<DayKey, string> = {
  MON: "Lunes",
  TUE: "Martes",
  WED: "Miércoles",
  THU: "Jueves",
  FRI: "Viernes",
  SAT: "Sábado",
  SUN: "Domingo",
};

export const DAY_SHORT_ES: Record<DayKey, string> = {
  MON: "Lun",
  TUE: "Mar",
  WED: "Mié",
  THU: "Jue",
  FRI: "Vie",
  SAT: "Sáb",
  SUN: "Dom",
};

const DAY_INDEX: Record<DayKey, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

/** JS getDay(): 0=domingo ... 6=sábado */
export function dayKeyFromDate(date: Date): DayKey {
  const jsDay = date.getUTCDay();
  const keys: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return keys[jsDay];
}

export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function keyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dayIndexOf(key: DayKey): number {
  return DAY_INDEX[key];
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function todayKey(): string {
  return dateToKey(new Date());
}

/**
 * Lunes de la semana a la que pertenece `key`.
 *
 * La semana empieza en lunes, así que el domingo pertenece a la semana que
 * empezó el lunes anterior: de ahí el `6` en lugar de `-1`.
 */
export function startOfWeek(key: string): Date {
  const date = keyToDate(key);
  const jsDay = date.getUTCDay(); // 0 = domingo
  const offsetFromMonday = jsDay === 0 ? 6 : jsDay - 1;
  date.setUTCDate(date.getUTCDate() - offsetFromMonday);
  return date;
}

/**
 * Fecha real (`YYYY-MM-DD`) de un día de la semana dentro de la semana actual.
 *
 * El plan de comidas y la rutina son plantillas que se repiten cada semana. Al
 * mirar el lunes hay que operar sobre el lunes de *esta* semana, no sobre el
 * lunes de hace meses. Sin esto, marcar una comida guardaba siempre en la fecha
 * de hoy.
 */
export function dateOfDayInWeek(dayKey: DayKey, today: string): string {
  const monday = startOfWeek(today);
  return dateToKey(addDays(monday, DAY_ORDER.indexOf(dayKey)));
}

export function formatDateES(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}