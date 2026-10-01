/**
 * Prueba de humo end-to-end contra el servidor en ejecución.
 * Uso: npx tsx scripts/smoke-test.ts [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3111";

let cookie = "";

function log(ok: boolean, msg: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) process.exitCode = 1;
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init?.headers ?? {}),
    },
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const pair = setCookie.split(";")[0];
    if (pair.startsWith("labuild_session=")) cookie = pair;
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function main() {
  console.log(`\n=== Smoke test contra ${BASE} ===\n`);

  // 1. Registro
  const email = `test${Date.now()}@labuild.dev`;
  let r = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test User",
      email,
      password: "supersecret123",
      age: 19,
      heightCm: 175,
      startingWeightKg: 50,
    }),
  });
  log(r.status === 200 && !!cookie, `Registro (${r.status})`);
  if (!cookie) {
    console.log("  respuesta:", r.text.slice(0, 300));
    return;
  }

  // 2. Registro duplicado rechazado
  r = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Dup", email, password: "supersecret123" }),
  });
  log(r.status === 409, `Registro duplicado rechazado (${r.status})`);

  // 3. Login incorrecto
  r = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "wrongpassword" }),
  });
  log(r.status === 401, `Login con contraseña incorrecta rechazado (${r.status})`);

  // 4. Login correcto
  cookie = "";
  r = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "supersecret123" }),
  });
  log(r.status === 200 && !!cookie, `Login correcto (${r.status})`);

  // 5. Validación: contraseña corta
  r = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "X", email: `x${Date.now()}@t.dev`, password: "123" }),
  });
  log(r.status === 400, `Contraseña corta rechazada (${r.status})`);

  // 6. Páginas renderizan
  for (const path of ["/dashboard", "/week", "/nutrition", "/progress", "/penalties"]) {
    r = await call(path);
    log(r.status === 200, `GET ${path} (${r.status})`);
  }

  // 7. Páginas de auth
  for (const path of ["/login", "/register"]) {
    r = await call(path);
    log(r.status === 200, `GET ${path} (${r.status})`);
  }

  // 8. Marcar un día TRAIN como completado
  //    Monday = 2026-01-05, Tuesday = 2026-01-06
  r = await call("/api/workouts", {
    method: "POST",
    body: JSON.stringify({
      date: "2026-01-05", // lunes
      status: "COMPLETED",
      durationMin: 62,
      exercises: [
        { routineExerciseId: "x", exerciseName: "Flexiones normales", completed: true, repsDoneTotal: 40 },
        { routineExerciseId: "y", exerciseName: "Plancha", completed: true },
      ],
    }),
  });
  const completedPoints = r.json?.pointsAwarded ?? 0;
  log(r.status === 200 && r.json?.workout?.status === "COMPLETED", `Entrenamiento lunes completado (${r.status})`);
  log(completedPoints > 0, `Puntos otorgados por completar: +${completedPoints}`);
  log(r.json?.unlockedAchievements?.some((a: any) => a.slug === "first-step"), "Logro 'first-step' desbloqueado");

  // 9. Marcar martes como saltado -> debe generar penitencia
  r = await call("/api/workouts", {
    method: "POST",
    body: JSON.stringify({ date: "2026-01-06", status: "SKIPPED", exercises: [] }),
  });
  log(r.status === 200, `Registro de día omitido (${r.status})`);
  log(!!r.json?.penalty, `Penitencia generada: ${r.json?.penalty?.title ?? "ninguna"}`);
  log(r.json?.penalty?.repDebt > 0, `Deuda de repeticiones: ${r.json?.penalty?.repDebt}`);

  // 10. Rachas
  r = await call("/api/progress");
  const streak = r.json?.streak;
  log(typeof streak?.current === "number", `Racha actual: ${streak?.current}, mejor: ${streak?.longest}`);
  log(streak?.longest >= 1, "Racha más larga >= 1 tras un día cumplido");

  // 11. Cumplir penitencia
  const penaltiesRes = await call("/api/penalties");
  const pending = penaltiesRes.json?.penalties?.find((p: any) => p.status === "PENDING");
  log(!!pending, `Penitencias pendientes: ${penaltiesRes.json?.summary?.pending}`);
  if (pending) {
    r = await call("/api/penalties", {
      method: "POST",
      body: JSON.stringify({ penaltyId: pending.id, action: "redeem" }),
    });
    log(r.status === 200 && r.json?.penalty?.status === "REDEEMED", `Penitencia cumplida (${r.status})`);
  }

  // 12. Peso
  r = await call("/api/weight", {
    method: "POST",
    body: JSON.stringify({ date: "2026-01-05", weightKg: 50.2 }),
  });
  log(r.status === 200, `Peso registrado (${r.status})`);
  r = await call("/api/weight", {
    method: "POST",
    body: JSON.stringify({ date: "2026-01-05", weightKg: 999 }),
  });
  log(r.status === 400, `Peso fuera de rango rechazado (${r.status})`);

  // 13. Comidas
  r = await call("/api/meals", {
    method: "POST",
    body: JSON.stringify({ date: "2026-01-05", mealType: "BREAKFAST", mealName: "Desayuno", completed: true }),
  });
  log(r.status === 200 && r.json?.pointsAwarded > 0, `Comida registrada (+${r.json?.pointsAwarded} pts)`);

  // 14. Domingo (descanso) no genera penitencia
  r = await call("/api/workouts", {
    method: "POST",
    body: JSON.stringify({ date: "2026-01-11", status: "SKIPPED", exercises: [] }),
  });
  log(r.status === 200 && !r.json?.penalty, "Domingo omitido NO genera penitencia");

  // 15. Sin sesión no se puede acceder
  const saved = cookie;
  cookie = "";
  r = await call("/api/progress");
  log(r.status === 401, `API protegida sin sesión (${r.status})`);
  cookie = saved;

  // 16. Logout
  r = await call("/api/auth/logout", { method: "POST" });
  log(r.status === 200, `Logout (${r.status})`);

  console.log("\n=== Fin ===\n");
}

main().catch((e) => {
  console.error("Error en smoke test:", e);
  process.exit(1);
});