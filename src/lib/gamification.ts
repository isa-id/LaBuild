import { prisma } from "./prisma";

/** Puntos por acción. Ajustables. */
export const POINTS = {
  WORKOUT_COMPLETED: 50,
  WORKOUT_PARTIAL: 20,
  MEAL_COMPLETED: 5,
  ALL_MEALS_COMPLETED: 15,
  WEIGHT_LOGGED: 5,
  STREAK_MILESTONE_PER_DAY: 2, // bonus multiplicado por días de racha
  PENALTY_REDEEMED: 15, // puntos por cumplir la penitencia
} as const;

/** Nivel = f(total de puntos). Curva suave: nivel n requiere 100 * n^1.5 aprox. */
export function levelFromPoints(points: number): number {
  let level = 1;
  while (pointsForLevel(level + 1) <= points) level++;
  return level;
}

export function pointsForLevel(level: number): number {
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

export type AchievementContext = {
  userId: string;
  streakCount: number;
  streakLongest: number;
  workoutsCompleted: number;
  fullWeeksCompleted: number;
  progressionUnlocks: number;
  penaltyRedeemed: number;
};

/**
 * Otorga puntos y actualiza el nivel del usuario.
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  refType?: string,
  refId?: string
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
    select: { points: true },
  });

  await prisma.pointEvent.create({
    data: { userId, points, reason, refType, refId },
  });

  const level = levelFromPoints(user.points);
  await prisma.user.update({ where: { id: userId }, data: { level } });

  return { totalPoints: user.points, level };
}

export async function subtractPoints(
  userId: string,
  points: number,
  reason: string,
  refType?: string,
  refId?: string
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { points: { decrement: points } },
    select: { points: true },
  });

  await prisma.pointEvent.create({
    data: { userId, points: -points, reason, refType, refId },
  });

  const level = levelFromPoints(Math.max(user.points, 0));
  await prisma.user.update({ where: { id: userId }, data: { level } });

  return { totalPoints: user.points, level };
}

type Criteria =
  | { type: "streak"; count: number }
  | { type: "workouts_completed"; count: number }
  | { type: "week_complete"; count: number }
  | { type: "progression_unlock"; count: number }
  | { type: "penalty_redeemed"; count: number };

function meetsCriteria(criteria: Criteria, ctx: AchievementContext): boolean {
  switch (criteria.type) {
    case "streak":
      return ctx.streakLongest >= criteria.count;
    case "workouts_completed":
      return ctx.workoutsCompleted >= criteria.count;
    case "week_complete":
      return ctx.fullWeeksCompleted >= criteria.count;
    case "progression_unlock":
      return ctx.progressionUnlocks >= criteria.count;
    case "penalty_redeemed":
      return ctx.penaltyRedeemed >= criteria.count;
  }
}

/**
 * Evalúa todos los logros y otorga los que aún no tenga el usuario.
 * Devuelve los logros nuevos desbloqueados.
 */
export async function evaluateAchievements(ctx: AchievementContext) {
  const [achievements, owned] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({
      where: { userId: ctx.userId },
      select: { achievementId: true },
    }),
  ]);

  const ownedIds = new Set(owned.map((o) => o.achievementId));
  const unlocked: { slug: string; name: string; description: string; pointsReward: number }[] = [];

  for (const achievement of achievements) {
    if (ownedIds.has(achievement.id)) continue;
    const criteria = achievement.criteria as Criteria;
    if (!meetsCriteria(criteria, ctx)) continue;

    await prisma.userAchievement.create({
      data: { userId: ctx.userId, achievementId: achievement.id },
    });

    if (achievement.pointsReward > 0) {
      await awardPoints(
        ctx.userId,
        achievement.pointsReward,
        `Logro: ${achievement.name}`,
        "achievement",
        achievement.id
      );
    }

    unlocked.push({
      slug: achievement.slug,
      name: achievement.name,
      description: achievement.description,
      pointsReward: achievement.pointsReward,
    });
  }

  return unlocked;
}

/** Reúne el contexto completo necesario para evaluar logros. */
export async function buildAchievementContext(
  userId: string
): Promise<AchievementContext> {
  const [streak, workoutsCompleted, penaltiesRedeemed, progress] =
    await Promise.all([
      prisma.streak.findUnique({ where: { userId } }),
      prisma.workoutLog.count({
        where: { userId, status: "COMPLETED" },
      }),
      prisma.penalty.count({
        where: { userId, status: "REDEEMED" },
      }),
      prisma.userProgress.findMany({ where: { userId } }),
    ]);

  // Semanas completas: días TRAIN con estado COMPLETED, agrupados por semana ISO.
  const completed = await prisma.workoutLog.findMany({
    where: { userId, status: "COMPLETED" },
    select: { date: true, dayKey: true },
  });

  const weeks = new Set<string>();
  for (const log of completed) {
    const d = new Date(log.date);
    const day = (d.getUTCDay() + 6) % 7; // lunes = 0
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day);
    weeks.add(dateToKeyStr(monday));
  }

  const progressionUnlocks = progress.filter(
    (p) => p.unlockedStep > p.currentStep
  ).length;

  return {
    userId,
    streakCount: streak?.currentCount ?? 0,
    streakLongest: streak?.longestCount ?? 0,
    workoutsCompleted,
    fullWeeksCompleted: weeks.size,
    progressionUnlocks,
    penaltyRedeemed: penaltiesRedeemed,
  };
}

function dateToKeyStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}