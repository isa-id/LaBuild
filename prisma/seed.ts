import { PrismaClient, DayKey, DayKind, ExerciseSection, MealType } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import path from 'path';
import { readEnvFile } from '../scripts/neon-http';

// Por defecto Prisma se conecta por TCP al puerto 5432. Con `--http` usamos el
// endpoint de Neon en el 443, necesario en redes que bloquean el 5432 saliente.
const useHttp = process.argv.includes('--http');

function createClient() {
  if (!useHttp) return new PrismaClient();

  const env = readEnvFile(path.join(process.cwd(), '.env'));
  const connectionString = process.env.DATABASE_URL ?? env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Falta DATABASE_URL (en la terminal o en .env) para usar --http');
  }

  console.log('Conectando por HTTP (puerto 443) en vez de 5432.');
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

const prisma = createClient();

const dayKeyByIndex = [DayKey.MON, DayKey.TUE, DayKey.WED, DayKey.THU, DayKey.FRI, DayKey.SAT, DayKey.SUN];

async function main() {
  // Progression chains
  const pushupChain = await prisma.progressionChain.upsert({
    where: { slug: 'pushups' },
    update: {},
    create: {
      slug: 'pushups',
      name: 'Progresión de Flexiones',
      baseExerciseName: 'Flexiones',
      steps: [
        'Flexión inclinada',
        'Flexión normal',
        'Flexión lenta',
        'Flexión diamante',
        'Flexión pseudo-planche',
      ],
      description: 'Progresión para ganar fuerza en push-ups sin equipo',
    },
  });

  const squatChain = await prisma.progressionChain.upsert({
    where: { slug: 'squats' },
    update: {},
    create: {
      slug: 'squats',
      name: 'Progresión de Sentadillas',
      baseExerciseName: 'Sentadilla',
      steps: [
        'Sentadilla normal',
        'Sentadilla lenta',
        'Sentadilla con pausa',
        'Sentadilla búlgara',
        'Sentadilla búlgara lenta',
      ],
      description: 'Progresión de sentadillas para piernas/glúteos',
    },
  });

  const plankChain = await prisma.progressionChain.upsert({
    where: { slug: 'plank' },
    update: {},
    create: {
      slug: 'plank',
      name: 'Progresión de Plancha',
      baseExerciseName: 'Plancha',
      steps: [
        'Plancha normal',
        'Plancha con toque de hombros',
        'Plancha lateral',
        'Plancha dinámica',
      ],
      description: 'Progresión de estabilidad core',
    },
  });

  const supermanChain = await prisma.progressionChain.upsert({
    where: { slug: 'superman' },
    update: {},
    create: {
      slug: 'superman',
      name: 'Progresión de Superman',
      baseExerciseName: 'Superman',
      steps: ['Superman normal', 'Superman con pausa', 'Prone Y-T-W'],
      description: 'Progresión para espalda baja/postura',
    },
  });

  const bridgeChain = await prisma.progressionChain.upsert({
    where: { slug: 'bridge' },
    update: {},
    create: {
      slug: 'bridge',
      name: 'Progresión de Puente Glúteo',
      baseExerciseName: 'Puente de glúteos',
      steps: ['Puente de glúteos', 'Puente de glúteo a una pierna'],
      description: 'Progresión para glúteos',
    },
  });

  const calfChain = await prisma.progressionChain.upsert({
    where: { slug: 'calves' },
    update: {},
    create: {
      slug: 'calves',
      name: 'Progresión Pantorrillas',
      baseExerciseName: 'Elevación de pantorrillas',
      steps: ['Elevación de pantorrillas (ambas)', 'Elevación de pantorrillas a una pierna'],
      description: 'Progresión pantorrillas',
    },
  });

  // Workout template
  const template = await prisma.workoutTemplate.upsert({
    where: { slug: 'rutina-ganancia-masa' },
    update: {},
    create: {
      slug: 'rutina-ganancia-masa',
      name: 'Rutina para Ganar Masa (Sin Equipo)',
      description: 'Rutina semanal dividida por grupos musculares para hipertrofia sin equipamiento',
      isOfficial: true,
    },
  });

  // MON - Lunes: Pecho + tríceps
  let mon = await prisma.routineDay.findUnique({
    where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.MON } },
  });
  if (!mon) {
    mon = await prisma.routineDay.create({
      data: {
        templateId: template.id,
        dayIndex: 1,
        dayKey: DayKey.MON,
        focus: 'Pecho + Tríceps',
        durationMin: 60,
        kind: DayKind.TRAIN,
        notes: 'Enfoque en hipertrofia. Priorizar técnica y progresión de flexiones.',
      },
    });
  }
  // Clear exercises if any
  await prisma.routineExercise.deleteMany({ where: { dayId: mon.id } });
  await prisma.routineExercise.createMany({
    data: [
      // WARMUP
      { dayId: mon.id, order: 1, name: 'Marcha rápida', section: ExerciseSection.WARMUP, sets: 1, reps: '2 min', warmup: true },
      { dayId: mon.id, order: 2, name: 'Círculos de brazos', section: ExerciseSection.WARMUP, sets: 1, reps: '1 min', warmup: true },
      { dayId: mon.id, order: 3, name: 'Rotaciones de hombros', section: ExerciseSection.WARMUP, sets: 1, reps: '1 min', warmup: true },
      { dayId: mon.id, order: 4, name: 'Flexiones muy suaves', section: ExerciseSection.WARMUP, sets: 2, reps: '5', warmup: true },
      { dayId: mon.id, order: 5, name: 'Movilidad de muñecas', section: ExerciseSection.WARMUP, sets: 1, reps: '2 min', warmup: true },
      // MAIN
      { dayId: mon.id, order: 10, name: 'Flexiones normales', section: ExerciseSection.MAIN, sets: 4, reps: '8–15', restSeconds: 90, progressionChainId: pushupChain.id },
      { dayId: mon.id, order: 11, name: 'Flexiones con tempo lento', section: ExerciseSection.MAIN, sets: 3, reps: '8–12', tempoSeconds: '3-0-0', restSeconds: 90, notes: 'Baja durante 3 segundos, sube normalmente', progressionChainId: pushupChain.id },
      { dayId: mon.id, order: 12, name: 'Flexiones diamante', section: ExerciseSection.MAIN, sets: 3, reps: '6–12', restSeconds: 75, progressionChainId: pushupChain.id },
      { dayId: mon.id, order: 13, name: 'Flexiones con manos más abiertas', section: ExerciseSection.MAIN, sets: 3, reps: '8–15', restSeconds: 75, progressionChainId: pushupChain.id },
      { dayId: mon.id, order: 14, name: 'Flexiones cerradas', section: ExerciseSection.MAIN, sets: 2, reps: '8–12', restSeconds: 75, progressionChainId: pushupChain.id },
      { dayId: mon.id, order: 15, name: 'Plancha', section: ExerciseSection.MAIN, sets: 3, reps: '30–60 s', restSeconds: 60, progressionChainId: plankChain.id },
      // FINISHER
      { dayId: mon.id, order: 20, name: 'Marcha rápida', section: ExerciseSection.FINISHER, sets: 1, reps: '3–4 min' },
      { dayId: mon.id, order: 21, name: 'Jumping jacks', section: ExerciseSection.FINISHER, sets: 1, reps: '30–45 s' },
      { dayId: mon.id, order: 22, name: 'Mountain climbers', section: ExerciseSection.FINISHER, sets: 1, reps: '30–45 s' },
    ],
  });

  // TUE
  let tue = await prisma.routineDay.findUnique({ where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.TUE } } });
  if (!tue) {
    tue = await prisma.routineDay.create({
      data: { templateId: template.id, dayIndex: 2, dayKey: DayKey.TUE, focus: 'Piernas + Glúteos', durationMin: 60, kind: DayKind.TRAIN },
    });
  }
  await prisma.routineExercise.deleteMany({ where: { dayId: tue.id } });
  await prisma.routineExercise.createMany({
    data: [
      { dayId: tue.id, order: 1, name: 'Sentadillas suaves', section: ExerciseSection.WARMUP, sets: 1, reps: 'x15', warmup: true },
      { dayId: tue.id, order: 2, name: 'Rotaciones de cadera', section: ExerciseSection.WARMUP, sets: 1, reps: '1 min', warmup: true },
      { dayId: tue.id, order: 3, name: 'Zancadas suaves', section: ExerciseSection.WARMUP, sets: 1, reps: 'x10 c/u', warmup: true },
      { dayId: tue.id, order: 4, name: 'Elevaciones de talones', section: ExerciseSection.WARMUP, sets: 1, reps: 'x20', warmup: true },
      { dayId: tue.id, order: 5, name: 'Marcha rápida', section: ExerciseSection.WARMUP, sets: 1, reps: '2 min', warmup: true },
      { dayId: tue.id, order: 10, name: 'Sentadilla', section: ExerciseSection.MAIN, sets: 4, reps: '12–20', restSeconds: 90, progressionChainId: squatChain.id },
      { dayId: tue.id, order: 11, name: 'Sentadilla búlgara', section: ExerciseSection.MAIN, sets: 3, reps: '8–12 c/u', restSeconds: 90, perSide: true, progressionChainId: squatChain.id },
      { dayId: tue.id, order: 12, name: 'Zancadas hacia atrás', section: ExerciseSection.MAIN, sets: 3, reps: '10–15 c/u', restSeconds: 75, perSide: true },
      { dayId: tue.id, order: 13, name: 'Puente de glúteos', section: ExerciseSection.MAIN, sets: 4, reps: '15–25', restSeconds: 60, progressionChainId: bridgeChain.id },
      { dayId: tue.id, order: 14, name: 'Puente de glúteo a una pierna', section: ExerciseSection.MAIN, sets: 3, reps: '8–15 c/u', restSeconds: 60, perSide: true, progressionChainId: bridgeChain.id },
      { dayId: tue.id, order: 15, name: 'Elevación de pantorrillas', section: ExerciseSection.MAIN, sets: 4, reps: '15–25', restSeconds: 45, progressionChainId: calfChain.id },
      { dayId: tue.id, order: 20, name: 'Marcha rápida/caminata', section: ExerciseSection.FINISHER, sets: 1, reps: '10 min' },
    ],
  });

  // WED - Espalda + bíceps + postura
  let wed = await prisma.routineDay.findUnique({ where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.WED } } });
  if (!wed) {
    wed = await prisma.routineDay.create({
      data: { templateId: template.id, dayIndex: 3, dayKey: DayKey.WED, focus: 'Espalda + Bíceps + Postura', durationMin: 60, kind: DayKind.TRAIN },
    });
  }
  await prisma.routineExercise.deleteMany({ where: { dayId: wed.id } });
  await prisma.routineExercise.createMany({
    data: [
      { dayId: wed.id, order: 10, name: 'Superman', section: ExerciseSection.MAIN, sets: 4, reps: '12–20', restSeconds: 60, progressionChainId: supermanChain.id },
      { dayId: wed.id, order: 11, name: 'Reverse snow angels', section: ExerciseSection.MAIN, sets: 3, reps: '10–15', restSeconds: 60 },
      { dayId: wed.id, order: 12, name: 'Superman con pausa', section: ExerciseSection.MAIN, sets: 3, reps: '8–12', tempoSeconds: '0-2-0', restSeconds: 60, notes: 'Mantén 2–3 segundos arriba', progressionChainId: supermanChain.id },
      { dayId: wed.id, order: 13, name: 'Bird dog', section: ExerciseSection.MAIN, sets: 3, reps: '10 c/u', restSeconds: 60, perSide: true },
      { dayId: wed.id, order: 14, name: 'Prone Y-T-W', section: ExerciseSection.MAIN, sets: 3, reps: '8 c/u', restSeconds: 60, notes: '8 de Y, 8 de T, 8 de W', progressionChainId: supermanChain.id },
      { dayId: wed.id, order: 15, name: 'Curl de bíceps isométrico', section: ExerciseSection.MAIN, sets: 3, reps: '20–30 s', restSeconds: 45, notes: 'Flexiona brazo ofreciendo resistencia con otra mano' },
      { dayId: wed.id, order: 20, name: 'Dead bug', section: ExerciseSection.CORE, sets: 3, reps: '10 c/u', restSeconds: 40, perSide: true },
      { dayId: wed.id, order: 21, name: 'Plancha lateral', section: ExerciseSection.CORE, sets: 3, reps: '30 s c/u', restSeconds: 40, perSide: true, progressionChainId: plankChain.id },
      { dayId: wed.id, order: 30, name: 'Movilidad hombros/pecho/columna torácica', section: ExerciseSection.MOBILITY, sets: 1, reps: '5–10 min' },
    ],
  });

  // THU - Recuperación
  let thu = await prisma.routineDay.findUnique({ where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.THU } } });
  if (!thu) {
    thu = await prisma.routineDay.create({
      data: { templateId: template.id, dayIndex: 4, dayKey: DayKey.THU, focus: 'Recuperación + Movilidad', durationMin: 25, kind: DayKind.RECOVERY, notes: 'Día de recuperación activa. No fuerza intensa.' },
    });
  }
  await prisma.routineExercise.deleteMany({ where: { dayId: thu.id } });
  await prisma.routineExercise.createMany({
    data: [
      { dayId: thu.id, order: 1, name: 'Caminata', section: ExerciseSection.MOBILITY, sets: 1, reps: '10–20 min' },
      { dayId: thu.id, order: 2, name: 'Movilidad de cadera', section: ExerciseSection.MOBILITY, sets: 1, reps: '3–5 min' },
      { dayId: thu.id, order: 3, name: 'Movilidad torácica', section: ExerciseSection.MOBILITY, sets: 1, reps: '2–3 min' },
      { dayId: thu.id, order: 4, name: 'Rotaciones de hombros', section: ExerciseSection.MOBILITY, sets: 1, reps: '2 min' },
      { dayId: thu.id, order: 5, name: 'Estiramiento suave de piernas', section: ExerciseSection.MOBILITY, sets: 1, reps: '3–5 min' },
      { dayId: thu.id, order: 6, name: 'Movilidad de tobillos', section: ExerciseSection.MOBILITY, sets: 1, reps: '1–2 min' },
    ],
  });

  // FRI - Hombros + pecho + tríceps
  let fri = await prisma.routineDay.findUnique({ where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.FRI } } });
  if (!fri) {
    fri = await prisma.routineDay.create({
      data: { templateId: template.id, dayIndex: 5, dayKey: DayKey.FRI, focus: 'Hombros + Pecho + Tríceps', durationMin: 60, kind: DayKind.TRAIN },
    });
  }
  await prisma.routineExercise.deleteMany({ where: { dayId: fri.id } });
  await prisma.routineExercise.createMany({
    data: [
      { dayId: fri.id, order: 1, name: 'Calentamiento hombros y muñecas', section: ExerciseSection.WARMUP, sets: 1, reps: '8 min', warmup: true },
      { dayId: fri.id, order: 10, name: 'Pike push-ups', section: ExerciseSection.MAIN, sets: 4, reps: '6–12', restSeconds: 90 },
      { dayId: fri.id, order: 11, name: 'Flexiones normales', section: ExerciseSection.MAIN, sets: 3, reps: '8–15', restSeconds: 90, progressionChainId: pushupChain.id },
      { dayId: fri.id, order: 12, name: 'Flexiones diamante', section: ExerciseSection.MAIN, sets: 3, reps: '6–12', restSeconds: 75, progressionChainId: pushupChain.id },
      { dayId: fri.id, order: 13, name: 'Flexiones tipo pseudo-planche', section: ExerciseSection.MAIN, sets: 3, reps: '5–10', restSeconds: 75, progressionChainId: pushupChain.id },
      { dayId: fri.id, order: 14, name: 'Elevaciones laterales sin peso', section: ExerciseSection.MAIN, sets: 3, reps: '15–25', restSeconds: 45 },
      { dayId: fri.id, order: 15, name: 'Plancha con toque de hombros', section: ExerciseSection.MAIN, sets: 3, reps: '10–16', restSeconds: 60, progressionChainId: plankChain.id },
      { dayId: fri.id, order: 20, name: 'Cardio ligero', section: ExerciseSection.CARDIO, sets: 1, reps: '10 min' },
    ],
  });

  // SAT - Piernas + glúteos + abdomen
  let sat = await prisma.routineDay.findUnique({ where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.SAT } } });
  if (!sat) {
    sat = await prisma.routineDay.create({
      data: { templateId: template.id, dayIndex: 6, dayKey: DayKey.SAT, focus: 'Piernas + Glúteos + Abdomen', durationMin: 60, kind: DayKind.TRAIN },
    });
  }
  await prisma.routineExercise.deleteMany({ where: { dayId: sat.id } });
  await prisma.routineExercise.createMany({
    data: [
      { dayId: sat.id, order: 10, name: 'Sentadilla lenta', section: ExerciseSection.MAIN, sets: 4, reps: '12–20', tempoSeconds: '3-0-0', restSeconds: 90, progressionChainId: squatChain.id },
      { dayId: sat.id, order: 11, name: 'Sentadilla búlgara', section: ExerciseSection.MAIN, sets: 4, reps: '8–12 c/u', restSeconds: 90, perSide: true, progressionChainId: squatChain.id },
      { dayId: sat.id, order: 12, name: 'Zancadas caminando o estáticas', section: ExerciseSection.MAIN, sets: 3, reps: '10–15 c/u', restSeconds: 75, perSide: true },
      { dayId: sat.id, order: 13, name: 'Puente de glúteos', section: ExerciseSection.MAIN, sets: 3, reps: '20', restSeconds: 60, progressionChainId: bridgeChain.id },
      { dayId: sat.id, order: 14, name: 'Elevación de pantorrillas a una pierna', section: ExerciseSection.MAIN, sets: 4, reps: '12–20 c/u', restSeconds: 45, perSide: true, progressionChainId: calfChain.id },
      { dayId: sat.id, order: 20, name: 'Reverse crunch', section: ExerciseSection.CORE, sets: 3, reps: '10–15', restSeconds: 40 },
      { dayId: sat.id, order: 21, name: 'Dead bug', section: ExerciseSection.CORE, sets: 3, reps: '10 c/u', restSeconds: 40, perSide: true },
      { dayId: sat.id, order: 22, name: 'Plancha', section: ExerciseSection.CORE, sets: 3, reps: '30–60 s', restSeconds: 40, progressionChainId: plankChain.id },
      { dayId: sat.id, order: 30, name: 'Finisher HIIT', section: ExerciseSection.FINISHER, sets: 5, reps: '20s/40s', notes: '20s jumping jacks / 40s descanso x5' },
    ],
  });

  // SUN - Descanso completo
  let sun = await prisma.routineDay.findUnique({ where: { templateId_dayKey: { templateId: template.id, dayKey: DayKey.SUN } } });
  if (!sun) {
    sun = await prisma.routineDay.create({
      data: { templateId: template.id, dayIndex: 7, dayKey: DayKey.SUN, focus: 'Descanso Completo', durationMin: 0, kind: DayKind.REST, notes: 'Descanso completo. El músculo necesita recuperación para crecer.' },
    });
  }
  await prisma.routineExercise.deleteMany({ where: { dayId: sun.id } });

  console.log('Workout template seeded:', template.slug);

  // Meal plan
  const mealPlan = await prisma.mealPlanTemplate.upsert({
    where: { slug: 'plan-alimentario-ganancia-masa' },
    update: {},
    create: {
      slug: 'plan-alimentario-ganancia-masa',
      name: 'Plan de Alimentación para Ganar Masa',
      description: 'Plan semanal económico basado en alimentos colombianos. Objetivo: 80–100 g proteína/día',
      isOfficial: true,
    },
  });

  const mealDaysData = [
    {
      dayIndex: 1, dayKey: DayKey.MON,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: '3 huevos\nArepa mediana\n1 banano\n1 vaso de leche' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Yogur\nAvena\nFruta' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: '150 g de pollo\nArroz\nFríjoles\nAguacate\nEnsalada' },
        { order: 4, type: MealType.SNACK, name: 'Merienda / Pre-entreno', items: 'Banano\n1 vaso de leche\nAvena' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: '2–3 huevos + atún o pollo\nArroz o papa\nVerduras\nAguacate' },
      ],
    },
    {
      dayIndex: 2, dayKey: DayKey.TUE,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: '3 huevos revueltos\nArepa con queso\nPapaya\nLeche' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Sándwich de pollo o huevo\nFruta' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: 'Carne de res\nArroz\nLentejas\nEnsalada\nAguacate' },
        { order: 4, type: MealType.SNACK, name: 'Merienda', items: 'Yogur + avena + banano' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: 'Pollo\nPapa\nEnsalada\n1 fruta' },
      ],
    },
    {
      dayIndex: 3, dayKey: DayKey.WED,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: 'Avena preparada con leche\nBanano\n2–3 huevos\nArepa' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Yogur\nManí\nFruta' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: 'Pollo\nArroz\nFríjoles\nPlátano\nEnsalada' },
        { order: 4, type: MealType.SNACK, name: 'Merienda', items: 'Arepa con queso\nLeche' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: 'Tortilla de 3 huevos con verduras\nArroz o papa\nAguacate' },
      ],
    },
    {
      dayIndex: 4, dayKey: DayKey.THU,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: 'Huevos\nArepa\nQueso\nFruta\nLeche' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Yogur + avena + fruta' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: 'Carne o pollo\nArroz\nLentejas/fríjoles\nAguacate\nVerduras' },
        { order: 4, type: MealType.SNACK, name: 'Merienda', items: 'Banano + maní' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: 'Atún con arroz\nHuevo\nVerduras' },
      ],
    },
    {
      dayIndex: 5, dayKey: DayKey.FRI,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: '3 huevos\nArepa con queso\nBanano\nLeche' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Yogur + avena + fruta' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: '150–200 g de pollo\nArroz\nFríjoles\nAguacate\nEnsalada' },
        { order: 4, type: MealType.SNACK, name: 'Pre-entreno', items: 'Banano\nAvena con leche' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: 'Carne molida\nPapa o arroz\nVerduras\nAguacate' },
      ],
    },
    {
      dayIndex: 6, dayKey: DayKey.SAT,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: 'Avena con leche + banano\n3 huevos\nArepa' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Sándwich de atún\nFruta' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: 'Pollo o carne\nArroz\nLentejas\nPlátano\nAguacate' },
        { order: 4, type: MealType.SNACK, name: 'Merienda', items: 'Yogur\nAvena\nManí\nBanano' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: '3 huevos\nArroz\nQueso\nVerduras' },
      ],
    },
    {
      dayIndex: 7, dayKey: DayKey.SUN,
      meals: [
        { order: 1, type: MealType.BREAKFAST, name: 'Desayuno', items: '3 huevos\nArepa\nQueso\nFruta\nLeche' },
        { order: 2, type: MealType.MIDMORNING, name: 'Media mañana', items: 'Yogur + fruta + maní' },
        { order: 3, type: MealType.LUNCH, name: 'Almuerzo', items: 'Pollo/carne/pescado\nArroz\nFríjoles o lentejas\nAguacate\nEnsalada' },
        { order: 4, type: MealType.SNACK, name: 'Merienda', items: 'Batido casero: 300ml leche + banano + 40–60g avena + 20–30g maní' },
        { order: 5, type: MealType.DINNER, name: 'Cena', items: 'Atún/huevo/pollo\nPapa o arroz\nVerduras' },
      ],
    },
  ];

  for (const md of mealDaysData) {
    let mday = await prisma.mealDay.findUnique({ where: { mealPlanId_dayKey: { mealPlanId: mealPlan.id, dayKey: md.dayKey } } });
    if (!mday) {
      mday = await prisma.mealDay.create({ data: { mealPlanId: mealPlan.id, dayIndex: md.dayIndex, dayKey: md.dayKey } });
    }
    await prisma.meal.deleteMany({ where: { mealDayId: mday.id } });
    await prisma.meal.createMany({ data: md.meals.map(m => ({ ...m, mealDayId: mday!.id })) });
  }
  console.log('Meal plan seeded:', mealPlan.slug);

  // Achievements
  const achievements = [
    { slug: 'first-step', name: 'Primer Paso', description: 'Completa tu primer entrenamiento.', icon: 'trophy', tier: 'BRONZE' as any, criteria: { type: 'workouts_completed', count: 1 }, pointsReward: 10 },
    { slug: 'streak-3', name: 'Constancia', description: 'Alcanza racha de 3 días.', icon: 'fire', tier: 'BRONZE' as any, criteria: { type: 'streak', count: 3 }, pointsReward: 25 },
    { slug: 'streak-7', name: 'Una Semana', description: 'Racha de 7 días consecutivos.', icon: 'fire', tier: 'SILVER' as any, criteria: { type: 'streak', count: 7 }, pointsReward: 50 },
    { slug: 'streak-14', name: 'Fortaleza', description: 'Racha de 14 días.', icon: 'fire', tier: 'GOLD' as any, criteria: { type: 'streak', count: 14 }, pointsReward: 100 },
    { slug: 'streak-30', name: 'Habitual', description: 'Racha de 30 días.', icon: 'fire', tier: 'PLATINUM' as any, criteria: { type: 'streak', count: 30 }, pointsReward: 250 },
    { slug: 'completionist-week', name: 'Semana Completa', description: 'Completa todos los entrenos de una semana.', icon: 'medal', tier: 'SILVER' as any, criteria: { type: 'week_complete', count: 1 }, pointsReward: 60 },
    { slug: 'progression-unlock', name: 'Progreso', description: 'Desbloquea una variante más difícil.', icon: 'arrow-up', tier: 'BRONZE' as any, criteria: { type: 'progression_unlock', count: 1 }, pointsReward: 20 },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { slug: a.slug }, update: {}, create: a });
  }
  console.log('Achievements seeded');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
