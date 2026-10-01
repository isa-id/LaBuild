/**
 * Lista los emojis usados en el código, para planear el reemplazo por iconos SVG.
 * Uso: npx tsx scripts/find-emojis.ts
 */
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

// Rangos de emoji y dingbats que aparecen en la interfaz.
const RANGES: [number, number][] = [
  [0x1f300, 0x1faff],
  [0x1f000, 0x1f2ff],
  [0x2600, 0x27bf],
  [0x2b00, 0x2bff],
  [0x1f900, 0x1f9ff],
  [0xfe00, 0xfe0f],
  [0x2190, 0x21ff],
  [0x2300, 0x23ff],
  [0x25a0, 0x25ff],
];

function isEmoji(codePoint: number): boolean {
  return RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
}

/** Extrae los emojis de una línea, con su posición. */
function scan(line: string): string[] {
  const found: string[] = [];

  for (const char of line) {
    const cp = char.codePointAt(0)!;
    if (isEmoji(cp)) found.push(`${char} U+${cp.toString(16).toUpperCase()}`);
  }

  return found;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const roots = process.argv.slice(2);
const targets = (roots.length ? roots : ["src", "prisma"]).flatMap((r) =>
  statSync(r).isDirectory() ? walk(r) : [r]
);

const tally = new Map<string, Set<string>>();
let totalLines = 0;

for (const file of targets) {
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    for (const emoji of scan(line)) {
      const [char, code] = emoji.split(" ");
      const set = tally.get(char) ?? new Set<string>();
      set.add(`${path.relative(process.cwd(), file)}:${index + 1}`);
      tally.set(char, set);
    }
  });

  totalLines += lines.length;
}

const sorted = [...tally.entries()].sort((a, b) => b[1].size - a[1].size);

console.log(`\n=== Emojis en ${targets.length} archivos (${totalLines} lineas) ===\n`);

for (const [char, locations] of sorted) {
  const cp = char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
  console.log(`${char}  U+${cp}  x${locations.size}`);
  for (const loc of [...locations].slice(0, 6)) console.log(`     ${loc}`);
  if (locations.size > 6) console.log(`     ... +${locations.size - 6} mas`);
}

console.log(`\nTotal: ${sorted.length} emojis distintos en ${[...tally.values()].reduce((n, s) => n + s.size, 0)} lugares.\n`);
