import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  age: z.coerce.number().int().min(13).max(100).optional(),
  heightCm: z.coerce.number().int().min(120).max(230).optional(),
  startingWeightKg: z.coerce.number().min(30).max(300).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const workoutStatusSchema = z.enum([
  "COMPLETED",
  "PARTIAL",
  "SKIPPED",
]);

export const upsertWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  status: workoutStatusSchema,
  durationMin: z.coerce.number().int().min(0).max(300).optional(),
  notes: z.string().max(2000).optional(),
  exercises: z
    .array(
      z.object({
        routineExerciseId: z.string().optional(),
        exerciseName: z.string().min(1),
        completed: z.boolean().default(false),
        setsDone: z.array(z.coerce.number().int().min(0).max(50)).optional(),
        repsDoneTotal: z.coerce.number().int().min(0).max(10000).optional(),
        variantUsed: z.string().max(120).optional(),
        perSide: z.boolean().default(false),
        notes: z.string().max(1000).optional(),
      })
    )
    .default([]),
});

export const weightLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  weightKg: z.coerce.number().min(30).max(300),
});

export const mealLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  mealType: z.enum(["BREAKFAST", "MIDMORNING", "LUNCH", "SNACK", "DINNER", "SHAKE"]),
  mealName: z.string().min(1),
  completed: z.boolean(),
  notes: z.string().max(1000).optional(),
});

export const penaltyActionSchema = z.object({
  penaltyId: z.string().min(1),
  action: z.enum(["redeem", "waive"]),
});

export const settingsSchema = z.object({
  streakCountRecoveryDays: z.boolean().optional(),
  restDayIsNeutral: z.boolean().optional(),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}