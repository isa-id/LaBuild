import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

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