import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAchievementContext } from "@/lib/gamification";
import { dateToKey } from "@/lib/dates";
import ProgressClient from "./ProgressClient";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [
    streak,
    achievements,
    earned,
    pointEvents,
    progress,
    penalties,
    weightLogs,
    workoutsCompleted,
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
      take: 30,
    }),
    prisma.userProgress.findMany({ where: { userId: user.id }, include: { chain: true } }),
    prisma.penalty.findMany({ where: { userId: user.id, status: "PENDING" } }),
    prisma.weightLog.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    prisma.workoutLog.count({ where: { userId: user.id, status: "COMPLETED" } }),
  ]);

  const earnedIds = new Set(earned.map((e) => e.achievementId));

  // Promedio semanal de peso
  const weeks = new Map<string, number[]>();
  for (const w of weightLogs) {
    const d = new Date(w.date);
    const day = (d.getUTCDay() + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day);
    const key = dateToKey(monday);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(Number(w.weightKg));
  }
  const weeklyAverages = [...weeks.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, values]) => ({
      week,
      avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
      count: values.length,
    }));

  const first = weightLogs[0];
  const last = weightLogs[weightLogs.length - 1];

  return (
    <ProgressClient
      user={{
        name: user.name,
        points: user.points,
        level: user.level,
        age: user.age,
        heightCm: user.heightCm,
        startingWeightKg: user.startingWeightKg ? Number(user.startingWeightKg) : null,
      }}
      streak={{ current: streak?.currentCount ?? 0, longest: streak?.longestCount ?? 0 }}
      stats={{
        workoutsCompleted,
        pendingPenalties: penalties.length,
        totalRepDebt: penalties.reduce((s, p) => s + p.repDebt, 0),
        achievementsEarned: earned.length,
        achievementsTotal: achievements.length,
      }}
      achievements={achievements.map((a) => ({
        slug: a.slug,
        name: a.name,
        description: a.description,
        tier: a.tier,
        icon: a.icon,
        pointsReward: a.pointsReward,
        earned: earnedIds.has(a.id),
      }))}
      pointEvents={pointEvents.map((e) => ({
        id: e.id,
        points: e.points,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      }))}
      progression={progress.map((p) => ({
        name: p.chain.name,
        slug: p.chain.slug,
        steps: p.chain.steps as string[],
        currentStep: p.currentStep,
        unlockedStep: p.unlockedStep,
      }))}
      weightLogs={weightLogs.map((w) => ({
        date: dateToKey(w.date),
        weightKg: Number(w.weightKg),
      }))}
      weeklyAverages={weeklyAverages}
      weightDelta={
        first && last ? Math.round((Number(last.weightKg) - Number(first.weightKg)) * 100) / 100 : null
      }
    />
  );
}