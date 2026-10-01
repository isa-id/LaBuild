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

export function formatDateES(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}