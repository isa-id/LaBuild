import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { pointsForLevel } from "@/lib/gamification";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const [
    streak,
    achievements,
    userAchievements,
    pointEvents,
    progress,
    penalties,
    weightLogs,
  ] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.achievement.findMany({ orderBy: { pointsReward: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
    }),
    prisma.pointEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.userProgress.findMany({
      where: { userId: user.id },
      include: { chain: true },
    }),
    prisma.penalty.findMany({
      where: { userId: user.id, status: "PENDING" },
    }),
    prisma.weightLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 60,
    }),
  ]);

  const total = await prisma.workoutLog.count({
    where: { userId: user.id, status: "COMPLETED" },
  });

  const ownedIds = new Set(userAchievements.map((a) => a.achievementId));

  return Response.json({
    user: {
      name: user.name,
      points: user.points,
      level: user.level,
      nextLevelPoints: pointsForLevel(user.level + 1),
      currentLevelPoints: pointsForLevel(user.level),
      age: user.age,
      heightCm: user.heightCm,
    },
    streak: {
      current: streak?.currentCount ?? 0,
      longest: streak?.longestCount ?? 0,
    },
    stats: {
      workoutsCompleted: total,
      pendingPenalties: penalties.length,
      totalRepDebt: penalties.reduce((s, p) => s + p.repDebt, 0),
    },
    achievements: achievements.map((a) => ({
      ...a,
      earned: ownedIds.has(a.id),
    })),
    earnedAchievements: userAchievements.map((a) => ({
      slug: a.achievement.slug,
      name: a.achievement.name,
      description: a.achievement.description,
      tier: a.achievement.tier,
      icon: a.achievement.icon,
      earnedAt: a.earnedAt.toISOString(),
    })),
    pointEvents: pointEvents.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    progression: progress.map((p) => ({
      name: p.chain.name,
      slug: p.chain.slug,
      steps: p.chain.steps,
      currentStep: p.currentStep,
      unlockedStep: p.unlockedStep,
    })),
    weight: weightLogs.map((w) => ({
      date: w.date.toISOString().slice(0, 10),
      weightKg: Number(w.weightKg),
    })),
  });
}