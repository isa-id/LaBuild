import { readFileSync, existsSync } from "fs";

/**
 * Ejecuta SQL contra Neon por su endpoint HTTP (puerto 443).
 *
 * Existe porque hay redes que bloquean el puerto 5432 saliente (firewall del
 * SO o del ISP). Neon expone un endpoint HTTP que habla el mismo SQL, así que
 * podemos aplicar el esquema y los datos sin abrir un socket TCP.
 *
 * Solo se usa en la máquina que despliega: la app en Vercel conecta por 5432
 * con normalidad.
 */

/**
 * Quita los comentarios `--` y separa el script en sentencias individuales.
 *
 * No basta con partir por `;`: un bloque `DO $$ ... $$` (plpgsql) contiene
 * punto y comas internas y hay que dejarlo entero, así que se salta de
 * dollar-quote a dollar-quote sin mirar los `;` de dentro.
 */
export function splitStatements(sql: string): string[] {
  // 1. Elimina comentarios de línea completa, conservando el resto.
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const out: string[] = [];
  let current = "";
  let dollarTag: string | null = null;

  // 2. Recorre carácter a carácter respetando `$tag$ ... $tag$`.
  for (let i = 0; i < withoutComments.length; i++) {
    const char = withoutComments[i];

    if (dollarTag) {
      // Dentro del bloque: sólo importa encontrar el cierre.
      if (withoutComments.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += char;
      }
      continue;
    }

    // `$tag$` abre un dollar-quote. La etiqueta admite letras, dígitos y `_`.
    const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(withoutComments.slice(i));

    if (match) {
      dollarTag = match[0];
      current += dollarTag;
      i += dollarTag.length - 1;
      continue;
    }

    if (char === ";") {
      const trimmed = current.trim();
      if (trimmed) out.push(trimmed);
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) out.push(tail);

  return out;
}

export type NeonClient = {
  host: string;
  run: (sql: string) => Promise<{ rowCount: number; rows: unknown[] }>;
};

/** Construye un cliente HTTP a partir de un connection string de Neon. */
export function createNeonClient(connectionString: string): NeonClient {
  const url = new URL(connectionString);

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`Protocolo inesperado en la URL: ${url.protocol}`);
  }

  // El endpoint HTTP vive en el mismo host, sólo cambia el esquema.
  const endpoint = `https://${url.host}/sql`;

  return {
    host: url.host,

    async run(sql: string) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Neon-Connection-String": connectionString,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });

      const text = await res.text();

      if (!res.ok) {
        // Neon devuelve el error de Postgres dentro del cuerpo.
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          detail = parsed.message ?? parsed.detail ?? text;
        } catch {
          // el cuerpo no era JSON: se muestra tal cual
        }
        throw new Error(`HTTP ${res.status}: ${detail}`);
      }

      const data = JSON.parse(text);
      return { rowCount: data.rowCount ?? 0, rows: data.rows ?? [] };
    },
  };
}

/** Lee una variable de un archivo .env sin depender de dotenv. */
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  const out: Record<string, string> = {};

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    out[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return out;
}
