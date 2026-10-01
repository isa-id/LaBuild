import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRoutine, getActiveMealPlan } from "@/lib/routine";
import { DAY_LABEL_ES, dateToKey, dayKeyFromDate, todayKey, formatDateES } from "@/lib/dates";
import { pointsForLevel } from "@/lib/gamification";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = todayKey();
  const dayKey = dayKeyFromDate(new Date(`${today}T00:00:00.000Z`));

  const [routine, mealPlan, streak, todayWorkout, todayMeals, penalties, weightCount] =
    await Promise.all([
      getActiveRoutine(user.id),
      getActiveMealPlan(),
      prisma.streak.findUnique({ where: { userId: user.id } }),
      prisma.workoutLog.findUnique({
        where: { userId_date: { userId: user.id, date: new Date(`${today}T00:00:00.000Z`) } },
        include: { exerciseLogs: true },
      }),
      prisma.mealLog.findMany({
        where: { userId: user.id, date: new Date(`${today}T00:00:00.000Z`) },
      }),
      prisma.penalty.count({ where: { userId: user.id, status: "PENDING" } }),
      prisma.weightLog.count({ where: { userId: user.id } }),
    ]);

  const routineDay = routine?.routineDays.find((d) => d.dayKey === dayKey) ?? null;
  const mealDay = mealPlan?.mealDays.find((d) => d.dayKey === dayKey) ?? null;

  return (
    <DashboardClient
      todayKeyStr={today}
      dateLabel={formatDateES(new Date(`${today}T00:00:00.000Z`))}
      dayLabel={DAY_LABEL_ES[dayKey]}
      user={{ name: user.name, points: user.points, level: user.level }}
      nextLevelPoints={pointsForLevel(user.level + 1)}
      streak={{
        current: streak?.currentCount ?? 0,
        longest: streak?.longestCount ?? 0,
      }}
      routineDay={
        routineDay
          ? {
              id: routineDay.id,
              focus: routineDay.focus,
              durationMin: routineDay.durationMin,
              kind: routineDay.kind,
              notes: routineDay.notes,
              exercises: routineDay.exercises.map((e) => ({
                id: e.id,
                order: e.order,
                name: e.name,
                section: e.section,
                warmup: e.warmup,
                sets: e.sets,
                reps: e.reps,
                tempoSeconds: e.tempoSeconds,
                restSeconds: e.restSeconds,
                perSide: e.perSide,
                notes: e.notes,
                progressionChainId: e.progressionChainId,
              })),
            }
          : null
      }
      mealDay={
        mealDay
          ? {
              meals: mealDay.meals.map((m) => ({
                id: m.id,
                order: m.order,
                type: m.type,
                name: m.name,
                items: m.items,
                notes: m.notes,
              })),
            }
          : null
      }
      todayWorkout={
        todayWorkout
          ? {
              status: todayWorkout.status,
              notes: todayWorkout.notes,
              durationMin: todayWorkout.durationMin,
              exerciseLogs: todayWorkout.exerciseLogs.map((el) => ({
                id: el.id,
                routineExerciseId: el.routineExerciseId,
                exerciseName: el.exerciseName,
                completed: el.completed,
                repsDoneTotal: el.repsDoneTotal,
                variantUsed: el.variantUsed,
              })),
            }
          : null
      }
      todayMeals={todayMeals.map((m) => ({
        id: m.id,
        mealType: m.mealType,
        mealName: m.mealName,
        completed: m.completed,
      }))}
      pendingPenalties={penalties}
      weightLogsCount={weightCount}
      hasProfile={Boolean(user.age && user.heightCm && user.startingWeightKg)}
      dateKeyForPrev={dateToKey(new Date(Date.now() - 86400000))}
    />
  );
}