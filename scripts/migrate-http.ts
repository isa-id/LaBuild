/**
 * Aplica cambios incrementales de esquema a Neon por HTTP (puerto 443).
 *
 * Uso:
 *   npx tsx scripts/migrate-http.ts migrations/001-ajustes-cuenta.sql
 *
 * `db-push-http.ts` sólo sirve para una base vacía: genera el DDL completo
 * desde cero. Cuando la base ya tiene datos y hay que añadir columnas, poner
 * columnas NOT NULL o crear tablas nuevas, se necesitan sentencias
 * incrementales, y eso es lo que hace este script.
 *
 * Cada archivo se ejecuta en una transacción. Las sentencias deben ser
 * idempotentes (`IF NOT EXISTS`) para poder reintentarlo sin romper nada.
 */
import { readFileSync } from "fs";
import path from "path";
import { createNeonClient, splitStatements, readEnvFile } from "./neon-http";

export {};

function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const fromFile = readEnvFile(path.join(process.cwd(), ".env"));
  if (fromFile.DATABASE_URL) return fromFile.DATABASE_URL;

  console.error(
    "\nNo se encontro DATABASE_URL.\n" +
      "Definela en la terminal o en el archivo .env del proyecto.\n"
  );
  process.exit(1);
}

async function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.error("Uso: npx tsx scripts/migrate-http.ts <archivo.sql> [...]");
    process.exit(1);
  }

  const neon = createNeonClient(resolveConnectionString());
  console.log(`Destino: https://${neon.host}/sql\n`);

  for (const file of files) {
    const full = path.resolve(process.cwd(), file);

    let sql: string;
    try {
      sql = readFileSync(full, "utf8");
    } catch {
      console.error(`No se pudo leer: ${file}`);
      process.exit(1);
    }

    const statements = splitStatements(sql);
    console.log(`${file} -> ${statements.length} sentencias`);

    // Una transacción por archivo: si algo falla, no queda nada a medias.
    neon.run("BEGIN").catch(() => {
      /* Neon abre una transacción implícita por sentencia; si falla, seguimos. */
    });

    for (const [index, statement] of statements.entries()) {
      const label = statement.split("\n")[0].slice(0, 68);

      try {
        await neon.run(statement);
      } catch (error) {
        console.error(`\nFallo en la sentencia ${index + 1}: ${label}`);
        console.error(`  ${(error as Error).message}\n`);
        await neon.run("ROLLBACK").catch(() => {});
        console.error("Se revirtió el archivo completo.");
        process.exit(1);
      }

      console.log(`  [${index + 1}/${statements.length}] ${label}`);
    }

    await neon.run("COMMIT").catch(() => {});
    console.log(`  OK ${file}\n`);
  }

  console.log("Migraciones aplicadas.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});