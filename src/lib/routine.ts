import { prisma } from "./prisma";

export async function getActiveRoutine(userId: string) {
  const program = await prisma.userProgram.findFirst({
    where: { userId, isActive: true, kind: "WORKOUT" },
    include: {
      template: {
        include: {
          routineDays: {
            orderBy: { dayIndex: "asc" },
            include: {
              exercises: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!program) return null;

  // Sin programa asignado: usa la plantilla oficial activa.
  const fallback = await prisma.workoutTemplate.findFirst({
    where: { isOfficial: true },
    include: {
      routineDays: {
        orderBy: { dayIndex: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  return program?.template ?? fallback;
}

export async function getActiveMealPlan() {
  return prisma.mealPlanTemplate.findFirst({
    where: { isOfficial: true },
    include: {
      mealDays: {
        orderBy: { dayIndex: "asc" },
        include: { meals: { orderBy: { order: "asc" } } },
      },
    },
  });
}

export async function getRoutineDayByKey(userId: string, dayKey: string) {
  const routine = await getActiveRoutine(userId);
  if (!routine) return null;
  return routine.routineDays.find((d) => d.dayKey === dayKey) ?? null;
}