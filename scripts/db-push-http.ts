/**
 * Aplica el esquema de Prisma a Neon usando el endpoint HTTP en vez de 5432.
 *
 * Uso: npm run db:push:http
 *
 * Genera el DDL con `prisma migrate diff` (que no necesita conexión) y lo
 * ejecuta sentencia por sentencia contra https://<host>/sql.
 *
 * Úsalo cuando tu red bloquee el puerto 5432 saliente (firewall del SO o del
 * ISP). Es equivalente a `prisma db push`.
 */
import { execFileSync } from "child_process";
import path from "path";
import { createNeonClient, splitStatements, readEnvFile } from "./neon-http";

const SCHEMA = path.join(process.cwd(), "prisma", "schema.prisma");

function resolveConnectionString(): string {
  // 1) Variables ya exportadas en la terminal.
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // 2) Archivo .env del proyecto.
  const fromFile = readEnvFile(path.join(process.cwd(), ".env"));
  if (fromFile.DATABASE_URL) return fromFile.DATABASE_URL;

  console.error(
    "\nNo se encontro DATABASE_URL.\n" +
      "Definela en la terminal o en el archivo .env del proyecto.\n"
  );
  process.exit(1);
}

function generateDdl(): string {
  console.log("Generando DDL desde prisma/schema.prisma (sin conectar a la BD)...");

  // stderr se descarta: Prisma imprime ahí avisos de `package.json#prisma`.
  const ddl = execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      SCHEMA,
      "--script",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], shell: true }
  );

  return ddl;
}

async function main() {
  const connectionString = resolveConnectionString();
  const neon = createNeonClient(connectionString);

  console.log(`Destino: https://${neon.host}/sql\n`);

  // Si el esquema ya existe, avisamos antes de tocar nada.
  const { rows: existing } = await neon.run(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'User'`
  );

  if (existing.length > 0) {
    console.log("El esquema ya existe. No se ejecuta nada.");
    console.log("Para regenerarlo desde cero, borra la base en Neon y vuelve a correrlo.");
    return;
  }

  const statements = splitStatements(generateDdl());
  console.log(`Aplicando ${statements.length} sentencias...\n`);

  let applied = 0;

  for (const [index, statement] of statements.entries()) {
    const label = statement.split("\n")[0].slice(0, 68);

    try {
      await neon.run(statement);
    } catch (error) {
      console.error(`\nFallo en la sentencia ${index + 1}/${statements.length}:`);
      console.error(`  ${label}`);
      console.error(`\n${(error as Error).message}`);
      console.error(
        `\nAplicadas ${applied} de ${statements.length}. El esquema quedó parcial.`
      );
      console.error(
        "Borra la base en Neon y vuelve a correr el comando para empezar limpio."
      );
      process.exit(1);
    }

    applied += 1;
    console.log(`  [${applied}/${statements.length}] ${label}`);
  }

  console.log(`\nEsquema aplicado: ${applied} sentencias.`);
  console.log("Ahora corre `npm run db:seed:http` para cargar la rutina.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
