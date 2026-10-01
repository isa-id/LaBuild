import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

/** Hash de contraseña con scrypt + salt aleatorio. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;

  const derived = scryptSync(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(key, "hex");
  if (storedKey.length !== derived.length) return false;

  return timingSafeEqual(storedKey, derived);
}

/**
 * Hash de un token aleatorio (restablecimiento de contraseña).
 *
 * Un token de un solo uso no necesita ser lento de fuerza bruta como una
 * contraseña: 48 bytes aleatorios no se pueden adivinar. Por eso usamos SHA-256,
 * que es lo bastante rápido para verificarlo en cada request.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(48).toString("hex");
}