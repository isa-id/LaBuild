/**
 * Consulta rápida a Neon por HTTP (diagnóstico).
 *   npx tsx scripts/inspect-http.ts consultas.sql
 */
import { readFileSync } from "fs";
import path from "path";
import { createNeonClient, readEnvFile } from "./neon-http";

export {};

const env = readEnvFile(path.join(process.cwd(), ".env"));
const connection = process.env.DATABASE_URL ?? env.DATABASE_URL!;
const neon = createNeonClient(connection);

const sql = readFileSync(path.resolve(process.cwd(), process.argv[2]), "utf8");

const { rows } = await neon.run(sql);
console.log(JSON.stringify(rows, null, 2));