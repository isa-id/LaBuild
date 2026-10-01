import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Cliente Prisma de la app.
 *
 * Por defecto usa TCP (puerto 5432), que es lo que funciona en Vercel.
 *
 * Si tu red local bloquea el 5432 (firewall del SO o del ISP), activa el
 * adaptador HTTP de Neon con `LABUILD_HTTP_DB=1` y la app se conecta por el 443,
 * que suele estar abierto. Es el mismo SQL sobre otro transporte, así que no
 * cambia nada más.
 *
 * Vercel no necesita (ni debe tener) esa variable: allí el 5432 funciona.
 */
function createClient(): PrismaClient {
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  if (process.env.LABUILD_HTTP_DB === "1") {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "LABUILD_HTTP_DB=1 requiere DATABASE_URL. Revisa tu archivo .env."
      );
    }

    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
      log,
    });
  }

  return new PrismaClient({ log });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// En desarrollo, Next.js recarga los módulos en cada cambio: sin esto se
// abriría un pool de conexiones nuevo en cada recarga.
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;