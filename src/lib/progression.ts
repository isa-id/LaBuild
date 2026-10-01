import { prisma } from "./prisma";

export type ProgressionStep = string;

/**
 * Evalúa el progreso de una cadena y desbloquea el siguiente paso si se cumplen
 * los criterios: al menos N sesiones completadas del ejercicio base.
 */
const UNLOCK_AFTER_SESSIONS: Record<string, number> = {
  // Ejemplo: tras 3 sesiones de flexiones se sugiere subir a "lenta".
  pushups: 3,
  squats: 3,
  plank: 4,
  superman: 3,
  bridge: 2,
  calves: 2,
};

export async function evaluateProgressionUnlock(userId: string) {
  const chains = await prisma.progressionChain.findMany({
    include: {
      exercises: { select: { id: true, name: true } },
    },
  });

  const userProgress = await prisma.userProgress.findMany({ where: { userId } });
  const progressByChain = new Map(userProgress.map((p) => [p.chainId, p]));

  const unlocks: { chain: string; from: string; to: string }[] = [];

  for (const chain of chains) {
    const steps = chain.steps as ProgressionStep[];
    if (steps.length < 2) continue;

    const required = UNLOCK_AFTER_SESSIONS[chain.slug] ?? 3;

    // Cuenta sesiones completadas donde aparece algún ejercicio de esta cadena.
    const matchedRoutineExerciseIds: string[] = [];
    for (const day of await prisma.routineDay.findMany({
      where: { template: { isOfficial: true } },
      select: { id: true },
    })) {
      const ex = await prisma.routineExercise.findMany({
        where: { dayId: day.id, progressionChainId: chain.id },
        select: { id: true },
      });
      matchedRoutineExerciseIds.push(...ex.map((e) => e.id));
    }

    if (matchedRoutineExerciseIds.length === 0) continue;

    const sessionsDone = await prisma.exerciseLog.count({
      where: {
        completed: true,
        routineExerciseId: { in: matchedRoutineExerciseIds },
        workoutLog: { userId },
      },
    });

    const existing = progressByChain.get(chain.id);
    const currentStep = existing?.currentStep ?? 0;
    const unlockedStep = existing?.unlockedStep ?? 0;

    // Cada `required` sesiones completadas desbloquea un paso más.
    const shouldUnlock = Math.min(
      steps.length - 1,
      Math.floor(sessionsDone / required)
    );

    if (shouldUnlock > unlockedStep) {
      await prisma.userProgress.upsert({
        where: { userId_chainId: { userId, chainId: chain.id } },
        update: { currentStep: shouldUnlock, unlockedStep: shouldUnlock },
        create: {
          userId,
          chainId: chain.id,
          currentStep: shouldUnlock,
          unlockedStep: shouldUnlock,
        },
      });
      unlocks.push({
        chain: chain.name,
        from: steps[Math.max(unlockedStep - 1, 0)] ?? steps[0],
        to: steps[shouldUnlock],
      });
    }
  }

  return unlocks;
}

export async function getUserProgress(userId: string) {
  const progress = await prisma.userProgress.findMany({
    where: { userId },
    include: { chain: true },
  });

  return progress.map((p) => {
    const steps = p.chain.steps as ProgressionStep[];
    return {
      chainId: p.chainId,
      name: p.chain.name,
      slug: p.chain.slug,
      steps,
      currentStep: p.currentStep,
      unlockedStep: p.unlockedStep,
      nextStep: p.unlockedStep < steps.length - 1 ? steps[p.unlockedStep + 1] : null,
    };
  });
}