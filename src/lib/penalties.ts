import { prisma } from "./prisma";
import { subtractPoints, POINTS } from "./gamification";
import type { DayKey, PenaltyKind, WorkoutLog } from "@prisma/client";
import { DAY_LABEL_ES } from "./dates";

/**
 * Tabla de penitencias por día de la semana.
 * `repDebt` = deuda en repeticiones del ejercicio principal del día.
 * `points`  = puntos que se descuentan al aplicar la penitencia.
 */
type PenaltyRule = {
  title: string;
  detail: string;
  repDebt: number;
  points: number;
};

const PENALTY_RULES: Record<DayKey, PenaltyRule> = {
  MON: {
    title: "Flexiones de reparación",
    detail:
      "Hoy te saltaste Pecho + Tríceps. Añade 20 flexiones extra (4 × 5) a tu próximo día de pecho.",
    repDebt: 20,
    points: 10,
  },
  TUE: {
    title: "Sentadillas de reparación",
    detail:
      "Saltaste Piernas + Glúteos. Añade 30 sentadillas extra (3 × 10) a tu próximo día de piernas.",
    repDebt: 30,
    points: 10,
  },
  WED: {
    title: "Superman de reparación",
    detail:
      "Saltaste Espalda + Bíceps. Añade 25 superman extra (5 × 5) a tu próximo día de espalda.",
    repDebt: 25,
    points: 10,
  },
  THU: {
    title: "Movilidad pendiente",
    detail:
      "Saltaste la recuperación activa. Haz 10 min de movilidad torácica y de cadera hoy.",
    repDebt: 10,
    points: 5,
  },
  FRI: {
    title: "Pike push-ups de reparación",
    detail:
      "Saltaste Hombros + Pecho + Tríceps. Añade 15 pike push-ups extra (3 × 5) en tu próximo día de hombros.",
    repDebt: 15,
    points: 10,
  },
  SAT: {
    title: "Sentadilla lenta de reparación",
    detail:
      "Saltaste el segundo estímulo de piernas. Añade 20 sentadillas lentas (4 × 5) este fin de semana.",
    repDebt: 20,
    points: 10,
  },
  SUN: {
    title: "Descanso no perturbed",
    detail: "El domingo es descanso completo. No hay penitencia por este día.",
    repDebt: 0,
    points: 0,
  },
};

/**
 * Crea (o no) la penitencia correspondiente a un WorkoutLog omitido/incompleto.
 * Los días REST (domingo) nunca generan penitencia.
 */
export async function applyPenaltyForSkippedWorkout(
  log: Pick<WorkoutLog, "id" | "userId" | "date" | "dayKey" | "status">,
  isRestDay: boolean
) {
  if (isRestDay) return null;
  if (log.status !== "SKIPPED" && log.status !== "PARTIAL") return null;

  const rule = PENALTY_RULES[log.dayKey];
  if (rule.repDebt === 0 && rule.points === 0) return null;

  const kind: PenaltyKind =
    log.status === "SKIPPED" ? "SKIPPED" : "PARTIAL";

  const existing = await prisma.penalty.findFirst({
    where: { workoutLogId: log.id, status: "PENDING" },
  });
  if (existing) return existing;

  const penalty = await prisma.penalty.create({
    data: {
      userId: log.userId,
      workoutLogId: log.id,
      date: log.date,
      kind,
      title: rule.title,
      detail: rule.detail,
      repDebt: rule.repDebt,
      pointsPenalty: rule.points,
      status: "PENDING",
    },
  });

  await subtractPoints(
    log.userId,
    rule.points,
    `Penitencia: ${rule.title}`,
    "penalty",
    penalty.id
  );

  return penalty;
}

/**
 * Marca la penitencia como cumplida y devuelve los puntos ganados.
 */
export async function redeemPenalty(penaltyId: string, userId: string) {
  const penalty = await prisma.penalty.findFirst({
    where: { id: penaltyId, userId },
  });
  if (!penalty) return null;
  if (penalty.status !== "PENDING") return penalty;

  const updated = await prisma.penalty.update({
    where: { id: penaltyId },
    data: { status: "REDEEMED", redeemedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: POINTS.PENALTY_REDEEMED } },
  });
  await prisma.pointEvent.create({
    data: {
      userId,
      points: POINTS.PENALTY_REDEEMED,
      reason: "Cumpliste penitencia",
      refType: "penalty",
      refId: penaltyId,
    },
  });

  return updated;
}

export function penaltyRuleFor(dayKey: DayKey): PenaltyRule {
  return PENALTY_RULES[dayKey];
}

export function describePenaltyDay(dayKey: DayKey): string {
  return DAY_LABEL_ES[dayKey];
}