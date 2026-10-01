/**
 * Genera los iconos PWA desde un SVG base.
 * Uso: npx tsx scripts/generate-icons.ts
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = path.join(process.cwd(), "public");

/** Icono principal: fondo oscuro + mancuerna estilizada. */
function iconSvg(size: number, maskable = false): string {
  // En modo maskable el contenido se reduce y centra dentro del "safe zone".
  const inset = maskable ? size * 0.18 : 0;
  const inner = size - inset * 2;
  const barW = inner * 0.11;
  const barH = inner * 0.46;
  const cx = size / 2;
  const cy = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16202c"/>
      <stop offset="100%" stop-color="#0b0f14"/>
    </linearGradient>
    <linearGradient id="arm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="url(#bg)"/>
  <g transform="translate(${inset},${inset})">
    <!-- barra de la mancuerna -->
    <rect x="${cx - inner * 0.5}" y="${cy - barH * 0.14}" width="${inner}" height="${barH * 0.28}" rx="${barH * 0.14}" fill="url(#arm)"/>
    <!-- discos exteriores -->
    <rect x="${cx - inner * 0.47}" y="${cy - barH / 2}" width="${barW}" height="${barH}" rx="${barW * 0.35}" fill="#e6edf5"/>
    <rect x="${cx + inner * 0.47 - barW}" y="${cy - barH / 2}" width="${barW}" height="${barH}" rx="${barW * 0.35}" fill="#e6edf5"/>
    <!-- discos interiores -->
    <rect x="${cx - inner * 0.33}" y="${cy - barH * 0.72}" width="${barW * 0.82}" height="${barH * 1.44}" rx="${barW * 0.3}" fill="#8fa3ba"/>
    <rect x="${cx + inner * 0.33 - barW * 0.82}" y="${cy - barH * 0.72}" width="${barW * 0.82}" height="${barH * 1.44}" rx="${barW * 0.3}" fill="#8fa3ba"/>
  </g>
</svg>`;
}

/** Icono para el favicon (32px, simple). */
function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0b0f14"/>
  <rect x="4" y="14.5" width="24" height="3" rx="1.5" fill="#22c55e"/>
  <rect x="5" y="9" width="3.5" height="14" rx="1.2" fill="#e6edf5"/>
  <rect x="23.5" y="9" width="3.5" height="14" rx="1.2" fill="#e6edf5"/>
  <rect x="9.5" y="6.5" width="3" height="19" rx="1" fill="#8fa3ba"/>
  <rect x="19.5" y="6.5" width="3" height="19" rx="1" fill="#8fa3ba"/>
</svg>`;
}

const targets: { file: string; size: number; maskable?: boolean }[] = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-192.png", size: 192, maskable: true },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-96.png", size: 96 },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const t of targets) {
    const svg = iconSvg(t.size, t.maskable);
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, t.file));
    console.log("generado:", t.file, `${t.size}x${t.size}`);
  }

  // Favicon: 32px PNG + ICO con 16/32/48
  const favSvg = faviconSvg();
  await sharp(Buffer.from(favSvg)).resize(32, 32).png().toFile(path.join(OUT, "favicon-32.png"));
  console.log("generado: favicon-32.png");

  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((s) => sharp(Buffer.from(favSvg)).resize(s, s).png().toBuffer())
  );

  // Contenedor ICO: cabecera + entradas de 16 bytes + datos PNG.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + sizes.length * 16;

  for (let i = 0; i < sizes.length; i++) {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0); // width
    e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1); // height
    e.writeUInt8(0, 2); // colores de paleta
    e.writeUInt8(0, 3); // reservado
    e.writeUInt16LE(1, 4); // planos de color
    e.writeUInt16LE(32, 6); // bits por píxel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += pngs[i].length;
  }

  const { writeFile } = await import("fs/promises");
  await writeFile(path.join(OUT, "favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));
  console.log("generado: favicon.ico");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});