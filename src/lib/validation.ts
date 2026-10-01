import { z } from "zod";

// Todos los datos del registro son obligatorios: la app calcula IMC,-balance
// energético yonus objetivos a partir de edad, altura y peso de inicio.
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "El nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(200, "La contraseña es demasiado larga"),
  age: z.coerce
    .number({ invalid_type_error: "Ingresa tu edad" })
    .int("La edad debe ser un número entero")
    .min(13, "Debes tener al menos 13 años")
    .max(100, "Ingresa una edad válida"),
  heightCm: z.coerce
    .number({ invalid_type_error: "Ingresa tu altura" })
    .int("La altura debe ser un número entero")
    .min(120, "La altura mínima es 120 cm")
    .max(230, "La altura máxima es 230 cm"),
  startingWeightKg: z.coerce
    .number({ invalid_type_error: "Ingresa tu peso" })
    .min(30, "El peso mínimo es 30 kg")
    .max(300, "El peso máximo es 300 kg"),
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

// --- Módulo de configuración ---

export const MAX_AVATAR_BYTES = 300 * 1024;

/** Avatar: data URL en base64, sólo imágenes y por debajo del límite. */
export const avatarSchema = z
  .string()
  .trim()
  .regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/, "Formato de imagen no válido")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= MAX_AVATAR_BYTES,
    "La imagen supera los 300 KB"
  );

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  age: z.coerce.number().int().min(13, "Debes tener al menos 13 años").max(100),
  heightCm: z.coerce.number().int().min(120).max(230),
  startingWeightKg: z.coerce.number().min(30).max(300),
  goal: z.enum(["gain_muscle", "recomp", "lose_fat", "health"]).default("gain_muscle"),
});

export const updateAvatarSchema = z.object({
  // `null` borra la foto.
  avatarDataUrl: avatarSchema.nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
  newPassword: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .max(200, "La contraseña es demasiado larga"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Enlace inválido"),
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(200, "La contraseña es demasiado larga"),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Ingresa tu contraseña para confirmar"),
  // El usuario debe escribir la palabra exacta para confirmar.
  confirm: z.literal("BORRAR", {
    errorMap: () => ({ message: 'Escribe BORRAR para confirmar' }),
  }),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}

/** Mapa campo -> mensaje, para pintar errores junto a cada input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }

  return out;
}
