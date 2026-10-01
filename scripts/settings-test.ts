/**
 * Prueba end-to-end del módulo de configuración de cuenta.
 *
 *   npx tsx scripts/settings-test.ts http://localhost:3111
 *
 * Crea una cuenta temporal, recorre perfil, foto, contraseña y borrado, y
 * limpia al final. No toca cuentas reales.
 */

import { prisma } from "../src/lib/prisma";

// Cada script de `scripts/` declara sus propias variables globales. Sin esta
// línea, `tsc` los trata como un único archivo y reporta redeclaraciones.
export {};

/**
 * Cuenta las filas que pertenecen al usuario, en cada tabla enlazada.
 *
 * Todas las relaciones son `onDelete: Cascade`, así que tras borrar la cuenta
 * el total debe ser 0. Si alguna tabla se quedara con filas, su contador
 * aparecería aquí.
 */
async function contarDatos(userId: string) {
  const [
    usuarios,
    mealLogs,
    weightLogs,
    workoutLogs,
    exerciseLogs,
    penalties,
    achievements,
    pointEvents,
    programs,
    settings,
    tokens,
  ] = await Promise.all([
    prisma.user.count({ where: { id: userId } }),
    prisma.mealLog.count({ where: { userId } }),
    prisma.weightLog.count({ where: { userId } }),
    prisma.workoutLog.count({ where: { userId } }),
    prisma.exerciseLog.count({ where: { workoutLog: { userId } } }),
    prisma.penalty.count({ where: { userId } }),
    prisma.userAchievement.count({ where: { userId } }),
    prisma.pointEvent.count({ where: { userId } }),
    prisma.userProgram.count({ where: { userId } }),
    prisma.userSettings.count({ where: { userId } }),
    prisma.passwordResetToken.count({ where: { userId } }),
  ]);

  return {
    usuarios,
    mealLogs,
    weightLogs,
    workoutLogs,
    exerciseLogs,
    penalties,
    achievements,
    pointEvents,
    programs,
    settings,
    tokens,
    total:
      mealLogs +
      weightLogs +
      workoutLogs +
      exerciseLogs +
      penalties +
      achievements +
      pointEvents +
      programs +
      settings +
      tokens,
  };
}

const BASE = process.argv[2] ?? "http://localhost:3000";

let pass = 0;
let fail = 0;

/** Guarda las cookies entre peticiones para mantener la sesión. */
let cookie = "";

async function call(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }

  return { status: res.status, data };
}

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  OK    ${name}`);
  } else {
    fail++;
    console.log(`  FALLA ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

const email = `cfg.${Date.now()}@labuild.local`;
const PASSWORD = "original123";
const NEW_PASSWORD = "nuevaclave456";

async function main() {
  console.log(`\n=== Módulo de configuración contra ${BASE} ===\n`);

  // --- Registro: todos los campos son obligatorios -------------------
  console.log("Registro");

  const sinEdad = await call("POST", "/api/auth/register", {
    name: "Sin Edad",
    email: `a.${Date.now()}@labuild.local`,
    password: PASSWORD,
    heightCm: 175,
    startingWeightKg: 60,
  });
  check("rechaza registro sin edad", sinEdad.status === 400, `status ${sinEdad.status}`);

  const sinPeso = await call("POST", "/api/auth/register", {
    name: "Sin Peso",
    email: `b.${Date.now()}@labuild.local`,
    password: PASSWORD,
    age: 20,
    heightCm: 175,
  });
  check("rechaza registro sin peso", sinPeso.status === 400, `status ${sinPeso.status}`);

  const sinNombre = await call("POST", "/api/auth/register", {
    email: `c.${Date.now()}@labuild.local`,
    password: PASSWORD,
    age: 20,
    heightCm: 175,
    startingWeightKg: 60,
  });
  check("rechaza registro sin nombre", sinNombre.status === 400, `status ${sinNombre.status}`);

  const edadInvalida = await call("POST", "/api/auth/register", {
    name: "Muy Joven",
    email: `d.${Date.now()}@labuild.local`,
    password: PASSWORD,
    age: 5,
    heightCm: 175,
    startingWeightKg: 60,
  });
  check("rechaza edad menor de 13", edadInvalida.status === 400, `status ${edadInvalida.status}`);

  const passCorta = await call("POST", "/api/auth/register", {
    name: "Pass Corta",
    email: `e.${Date.now()}@labuild.local`,
    password: "123",
    age: 20,
    heightCm: 175,
    startingWeightKg: 60,
  });
  check("rechaza contraseña corta", passCorta.status === 400, `status ${passCorta.status}`);

  // --- Registro válido -----------------------------------------------
  const alta = await call("POST", "/api/auth/register", {
    name: "Cuenta Prueba",
    email,
    password: PASSWORD,
    age: 20,
    heightCm: 175,
    startingWeightKg: 62,
  });
  check("registro completo acepta", alta.status === 200, JSON.stringify(alta.data));

  // --- Perfil --------------------------------------------------------
  console.log("\nPerfil");

  const leer = await call("GET", "/api/settings");
  check("GET devuelve el perfil", leer.status === 200 && leer.data.user?.email === email);
  check("el perfil trae la edad", leer.data.user?.age === 20, `age=${leer.data.user?.age}`);
  check("el perfil trae el peso", Number(leer.data.user?.startingWeightKg) === 62);

  const actualizar = await call("PATCH", "/api/settings", {
    name: "Nombre Nuevo",
    email,
    age: 21,
    heightCm: 176,
    startingWeightKg: 63.5,
    goal: "recomp",
  });
  check("PATCH actualiza el perfil", actualizar.status === 200, JSON.stringify(actualizar.data));

  const releer = await call("GET", "/api/settings");
  check("el nombre se guardó", releer.data.user?.name === "Nombre Nuevo");
  check("el peso se guardó", Number(releer.data.user?.startingWeightKg) === 63.5);

  const emailMalo = await call("PATCH", "/api/settings", {
    name: "X",
    email: "no-es-un-email",
    age: 21,
    heightCm: 176,
    startingWeightKg: 63,
  });
  check("rechaza email inválido", emailMalo.status === 400, `status ${emailMalo.status}`);

  const emailDuplicado = await call("PATCH", "/api/settings", {
    name: "Impostor",
    email: "juanse.giraldo06@gmail.com",
    age: 21,
    heightCm: 176,
    startingWeightKg: 63,
  });
  check(
    "rechaza email ya en uso",
    emailDuplicado.status === 409,
    `status ${emailDuplicado.status}`
  );

  // --- Foto de perfil ------------------------------------------------
  console.log("\nFoto de perfil");

  // 1x1 px en PNG, suficiente como data URL válido.
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const avatar = await call("PUT", "/api/settings", { avatarDataUrl: png });
  check("PUT guarda la foto", avatar.status === 200, JSON.stringify(avatar.data));

  const conFoto = await call("GET", "/api/settings");
  check("la foto se lee de vuelta", conFoto.data.user?.avatarDataUrl === png);

  const avatarNoImagen = await call("PUT", "/api/settings", {
    avatarDataUrl: "data:text/html;base64,PHNjcmlwdD4=",
  });
  check(
    "rechaza data URL que no es imagen",
    avatarNoImagen.status === 400,
    `status ${avatarNoImagen.status}`
  );

  const avatarNoBase64 = await call("PUT", "/api/settings", {
    avatarDataUrl: "data:image/png;base64,!!!no-es-base64!!!",
  });
  check(
    "rechaza base64 inválido",
    avatarNoBase64.status === 400,
    `status ${avatarNoBase64.status}`
  );

  const borrarFoto = await call("PUT", "/api/settings", { avatarDataUrl: null });
  check("PUT con null borra la foto", borrarFoto.status === 200);

  const sinFoto = await call("GET", "/api/settings");
  check("la foto quedó borrada", sinFoto.data.user?.avatarDataUrl === null);

  // --- Contraseña ----------------------------------------------------
  console.log("\nContraseña");

  const malActual = await call("POST", "/api/settings/password", {
    currentPassword: "incorrecta",
    newPassword: NEW_PASSWORD,
  });
  check(
    "rechaza contraseña actual incorrecta",
    malActual.status === 401,
    `status ${malActual.status}`
  );

  const misma = await call("POST", "/api/settings/password", {
    currentPassword: PASSWORD,
    newPassword: PASSWORD,
  });
  check("rechaza repetir la misma contraseña", misma.status === 400, `status ${misma.status}`);

  const corta = await call("POST", "/api/settings/password", {
    currentPassword: PASSWORD,
    newPassword: "123",
  });
  check("rechaza contraseña nueva corta", corta.status === 400, `status ${corta.status}`);

  const cambio = await call("POST", "/api/settings/password", {
    currentPassword: PASSWORD,
    newPassword: NEW_PASSWORD,
  });
  check("cambia la contraseña", cambio.status === 200, JSON.stringify(cambio.data));

  // La contraseña nueva debe servir para iniciar sesión.
  cookie = "";
  const loginNuevo = await call("POST", "/api/auth/login", {
    email,
    password: NEW_PASSWORD,
  });
  check("login con la contraseña nueva", loginNuevo.status === 200, `status ${loginNuevo.status}`);

  const loginViejo = await call("POST", "/api/auth/login", {
    email,
    password: PASSWORD,
  });
  check("la contraseña vieja ya no sirve", loginViejo.status === 401);

  // --- Restablecimiento por token ------------------------------------
  console.log("\nRestablecimiento por token");

  const recuperar = await call("POST", "/api/auth/reset-password", { email });
  check("solicita enlace", recuperar.status === 200, JSON.stringify(recuperar.data));

  const token = recuperar.data.devResetUrl?.split("token=")[1];
  check("devuelve el enlace de desarrollo", typeof token === "string" && token.length > 20);

  const tokenMalo = await call("PUT", "/api/auth/reset-password", {
    token: "a".repeat(64),
    newPassword: "otra123456",
  });
  check("rechaza token inválido", tokenMalo.status === 400, `status ${tokenMalo.status}`);

  const usarToken = await call("PUT", "/api/auth/reset-password", {
    token,
    newPassword: "otra123456",
  });
  check("aplica la nueva contraseña", usarToken.status === 200, JSON.stringify(usarToken.data));

  // El token es de un solo uso.
  const reutilizar = await call("PUT", "/api/auth/reset-password", {
    token,
    newPassword: "tercera12345",
  });
  check("el token no se puede reutilizar", reutilizar.status === 400);

  cookie = "";
  const loginReset = await call("POST", "/api/auth/login", {
    email,
    password: "otra123456",
  });
  check("login tras restablecer", loginReset.status === 200);

  // Email inexistente: misma respuesta, no filtra información.
  const fantasma = await call("POST", "/api/auth/reset-password", {
    email: "nadie@labuild.local",
  });
  check("no filtra si el email existe", fantasma.status === 200 && !fantasma.data.devResetUrl);

  // --- Datos asociados y borrado en cascada ----------------------------
  // Antes de borrar, generamos historial: sin esto, `onDelete: Cascade` no
  // tiene nada que limpiar y la prueba no demostraría nada.
  console.log("\nBorrar cuenta");

  const sinConfirmar = await call("DELETE", "/api/settings/account", {
    password: "otra123456",
  });
  check("exige escribir BORRAR", sinConfirmar.status === 400, `status ${sinConfirmar.status}`);

  const passMal = await call("DELETE", "/api/settings/account", {
    password: "mala123456",
    confirm: "BORRAR",
  });
  check("exige la contraseña correcta", passMal.status === 401, `status ${passMal.status}`);

  console.log("\nHistorial y borrado en cascada");

  const hoy = new Date().toISOString().slice(0, 10);

  // IDs reales tomados de la base: la API de logs no expone las rutinas.
  const user = await prisma.user.findUnique({ where: { email } });
  const mealDay = await prisma.mealDay.findFirst({
    where: { meals: { some: {} } },
    include: { meals: { orderBy: { order: "asc" }, take: 1 } },
  });
  const ejercicio = await prisma.routineExercise.findFirst();

  if (mealDay?.meals[0]) {
    await call("POST", "/api/meals", {
      date: hoy,
      mealType: mealDay.meals[0].type,
      mealName: mealDay.meals[0].name,
      completed: true,
    });
  }

  await call("POST", "/api/weight", { date: hoy, weightKg: 63 });
  await call("POST", "/api/workouts", {
    date: hoy,
    status: "SKIPPED",
    notes: "prueba de cascada",
    exercises: ejercicio
      ? [{ routineExerciseId: ejercicio.id, exerciseName: ejercicio.name, completed: false }]
      : [],
  });

  const antes = await contarDatos(user!.id);
  check("hay historial antes de borrar", antes.total > 0, JSON.stringify(antes));

  const borrarConHistorial = await call("DELETE", "/api/settings/account", {
    password: "otra123456",
    confirm: "BORRAR",
  });
  check(
    "borra la cuenta con historial",
    borrarConHistorial.status === 200,
    JSON.stringify(borrarConHistorial.data)
  );

  const despues = await contarDatos(user!.id);
  check("no queda historial huérfano", despues.total === 0, JSON.stringify(despues));
  check("el usuario se borró", despues.usuarios === 0, JSON.stringify(despues));

  cookie = "";
  const loginTrasBorrar = await call("POST", "/api/auth/login", {
    email,
    password: "otra123456",
  });
  check("la cuenta ya no existe", loginTrasBorrar.status === 401);

  // --- Acceso sin sesión ------------------------------------------------
  console.log("\nAcceso sin sesión");

  for (const [method, path] of [
    ["GET", "/api/settings"],
    ["PATCH", "/api/settings"],
    ["PUT", "/api/settings"],
    ["POST", "/api/settings/password"],
    ["DELETE", "/api/settings/account"],
  ] as [string, string][]) {
    // GET/HEAD no admiten cuerpo: se manda sólo lo necesario.
    const res = await call(method, path, method === "GET" ? undefined : { password: "x", confirm: "BORRAR" });
    check(`${method} ${path} sin sesión da 401`, res.status === 401, `status ${res.status}`);
  }

  console.log(`\n${pass} OK, ${fail} fallos de ${pass + fail} comprobaciones.\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});