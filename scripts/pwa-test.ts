/**
 * Verifica los recursos PWA servido por la app.
 * Uso: npx tsx scripts/pwa-test.ts [baseUrl]
 */
export {}; // aísla el archivo como módulo (evita colisiones de globals en tsc)

const BASE_URL = process.argv[2] ?? "http://localhost:3113";

let failures = 0;

function expect(label: string, ok: boolean, detail = "") {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`\n=== Recursos PWA en ${BASE_URL} ===\n`);

  // 1. Archivos estaticos
  const files: [string, string[]][] = [
    ["/manifest.json", ["application/json"]],
    ["/sw.js", ["text/javascript", "application/javascript"]],
    ["/icon-192.png", ["image/png"]],
    ["/icon-512.png", ["image/png"]],
    ["/icon-maskable-192.png", ["image/png"]],
    ["/icon-maskable-512.png", ["image/png"]],
    ["/apple-touch-icon.png", ["image/png"]],
    ["/favicon.ico", ["image/x-icon", "application/octet-stream"]],
  ];

  for (const [path, types] of files) {
    const res = await fetch(`${BASE_URL}${path}`);
    const ct = res.headers.get("content-type") ?? "";
    expect(
      `GET ${path}`,
      res.status === 200 && types.some((t) => ct.includes(t)),
      `${res.status} ${ct.split(";")[0]}`
    );
  }

  // 2. Tamano de iconos: deben pesar >1KB para no ser ignorados
  for (const path of ["/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]) {
    const res = await fetch(`${BASE_URL}${path}`);
    const buf = await res.arrayBuffer();
    expect(
      `${path} pesa >1KB`,
      buf.byteLength > 1024,
      `${(buf.byteLength / 1024).toFixed(1)} KB`
    );
  }

  // 3. Manifest valido con los campos que exigen los instaladores
  const manifest = await (await fetch(`${BASE_URL}/manifest.json`)).json();

  expect("manifest: name", typeof manifest.name === "string" && manifest.name.length > 0);
  expect(
    "manifest: short_name (<=12)",
    !!manifest.short_name && manifest.short_name.length <= 12,
    manifest.short_name
  );
  expect("manifest: start_url", manifest.start_url === "/dashboard", manifest.start_url);
  expect("manifest: display standalone", manifest.display === "standalone");
  expect(
    "manifest: theme_color",
    typeof manifest.theme_color === "string",
    manifest.theme_color
  );
  expect("manifest: background_color", typeof manifest.background_color === "string");
  expect(
    "manifest: icono 512x512",
    manifest.icons.some((i: any) => i.sizes === "512x512" && i.type === "image/png")
  );
  expect(
    "manifest: icono maskable",
    manifest.icons.some((i: any) => i.purpose === "maskable")
  );
  expect(
    "manifest: shortcuts",
    Array.isArray(manifest.shortcuts) && manifest.shortcuts.length > 0
  );

  // 4. El service worker declara la estrategia de cache correcta
  const sw = await (await fetch(`${BASE_URL}/sw.js`)).text();

  expect('sw: registra evento "install"', sw.includes('addEventListener("install"'));
  expect('sw: registra evento "activate"', sw.includes('addEventListener("activate"'));
  expect('sw: registra evento "fetch"', sw.includes('addEventListener("fetch"'));
  expect("sw: excluye /api/", sw.includes("/api/"));
  expect("sw: sirve fallback /offline", sw.includes("/offline"));
  expect("sw: cachea assets estaticos", sw.includes("/_next/static/"));
  expect(
    "sw: navegaciones solo por red (no cachea HTML privado)",
    sw.includes('request.mode === "navigate"') && sw.includes("fetch(request).catch"),
    "network-first con fallback offline"
  );

  // 5. Metatags PWA en el HTML de una pagina publica
  const html = await (await fetch(`${BASE_URL}/login`)).text();

  expect("html: link manifest", html.includes('rel="manifest"'));
  expect("html: apple-touch-icon", html.includes("apple-touch-icon"));
  expect("html: apple-mobile-web-app-capable", html.includes("apple-mobile-web-app-capable"));
  expect("html: viewport-fit=cover", html.includes("viewport-fit=cover"));
  expect("html: theme-color", html.includes("theme-color"));
  expect(
    "html: permite zoom del usuario",
    !/maximum-scale=1(?![0-9])/.test(html) || html.includes("maximum-scale=5")
  );
  expect('html: lang="es"', html.includes('lang="es"'));

  // 6. Pagina offline accesible
  const offline = await fetch(`${BASE_URL}/offline`);
  expect("GET /offline", offline.status === 200, `${offline.status}`);

  console.log(
    failures === 0
      ? "\n=== Todos los checks PWA pasaron ===\n"
      : `\n=== ${failures} check(s) PWA fallaron ===\n`
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});