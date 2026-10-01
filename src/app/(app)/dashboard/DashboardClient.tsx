"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Toaster, useToasts } from "@/components/Toast";

type Exercise = {
  id: string;
  order: number;
  name: string;
  section: string;
  warmup: boolean;
  sets: number | null;
  reps: string | null;
  tempoSeconds: string | null;
  restSeconds: number | null;
  perSide: boolean;
  notes: string | null;
  progressionChainId: string | null;
};

type Props = {
  todayKeyStr: string;
  dateLabel: string;
  dayLabel: string;
  user: { name: string; points: number; level: number };
  nextLevelPoints: number;
  streak: { current: number; longest: number };
  routineDay: {
    id: string;
    focus: string;
    durationMin: number;
    kind: string;
    notes: string | null;
    exercises: Exercise[];
  } | null;
  mealDay: { meals: { id: string; order: number; type: string; name: string; items: string; notes: string | null }[] } | null;
  todayWorkout: {
    status: string;
    notes: string | null;
    durationMin: number | null;
    exerciseLogs: {
      id: string;
      routineExerciseId: string | null;
      exerciseName: string;
      completed: boolean;
      repsDoneTotal: number | null;
      variantUsed: string | null;
    }[];
  } | null;
  todayMeals: { id: string; mealType: string; mealName: string; completed: boolean }[];
  pendingPenalties: number;
  weightLogsCount: number;
  hasProfile: boolean;
  dateKeyForPrev: string;
};

const SECTION_LABEL: Record<string, string> = {
  WARMUP: "Calentamiento",
  MAIN: "Fuerza",
  CORE: "Core",
  MOBILITY: "Movilidad",
  FINISHER: "Final",
  CARDIO: "Cardio",
  OTHER: "Otros",
};

const SECTION_ORDER = ["WARMUP", "MAIN", "CORE", "MOBILITY", "CARDIO", "FINISHER", "OTHER"];

const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: "Desayuno",
  MIDMORNING: "Media mañana",
  LUNCH: "Almuerzo",
  SNACK: "Merienda",
  DINNER: "Cena",
  SHAKE: "Batido",
};

const KIND_META: Record<string, { label: string; color: string; emoji: string }> = {
  TRAIN: { label: "Entrenamiento", color: "var(--accent)", emoji: "💪" },
  RECOVERY: { label: "Recuperación", color: "var(--accent2)", emoji: "🧘" },
  REST: { label: "Descanso", color: "var(--muted)", emoji: "😴" },
};

export default function DashboardClient(props: Props) {
  const router = useRouter();
  const { toasts, push, setToasts } = useToasts();

  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const el of props.todayWorkout?.exerciseLogs ?? []) {
      if (el.routineExerciseId) map[el.routineExerciseId] = el.completed;
    }
    return map;
  });
  const [reps, setReps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(
    props.todayWorkout?.durationMin?.toString() ?? ""
  );

  const isRest = props.routineDay?.kind === "REST";
  const isRecovery = props.routineDay?.kind === "RECOVERY";
  const status = props.todayWorkout?.status ?? "PENDING";

  const grouped = useMemo(() => {
    if (!props.routineDay) return [];
    const map = new Map<string, Exercise[]>();
    for (const ex of props.routineDay.exercises) {
      if (!map.has(ex.section)) map.set(ex.section, []);
      map.get(ex.section)!.push(ex);
    }
    return SECTION_ORDER.filter((s) => map.has(s)).map((s) => ({
      section: s,
      label: SECTION_LABEL[s] ?? s,
      exercises: map.get(s)!,
    }));
  }, [props.routineDay]);

  const mainCount =
    props.routineDay?.exercises.filter((e) => !e.warmup).length ?? 0;
  const mainDone =
    props.routineDay?.exercises.filter((e) => !e.warmup && done[e.id]).length ?? 0;
  const progressPct = mainCount ? Math.round((mainDone / mainCount) * 100) : 0;

  async function saveWorkout(nextStatus: "COMPLETED" | "PARTIAL" | "SKIPPED") {
    if (!props.routineDay) return;
    setSaving(true);

    const exercises = props.routineDay.exercises.map((ex) => ({
      routineExerciseId: ex.id,
      exerciseName: ex.name,
      completed: Boolean(done[ex.id]),
      repsDoneTotal: reps[ex.id] ? Number(reps[ex.id]) : undefined,
      perSide: ex.perSide,
    }));

    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: props.todayKeyStr,
        status: nextStatus,
        durationMin: duration ? Number(duration) : undefined,
        exercises,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      push(d.error ?? "No se pudo guardar", "danger");
      return;
    }

    const data = await res.json();

    if (data.pointsAwarded) {
      push(`+${data.pointsAwarded} puntos`, "success");
    }

    if (data.streak?.currentCount > 0) {
      push(`🔥 Racha: ${data.streak.currentCount} días`, "info");
    }

    if (data.penalty) {
      push(`⚖️ Penitencia: ${data.penalty.title} (+${data.penalty.repDebt} reps)`, "danger");
    }

    for (const a of data.unlockedAchievements ?? []) {
      push(`🏆 Logro: ${a.name}`, "success");
    }

    for (const u of data.unlocks ?? []) {
      push(`⬆️ Progresión: ${u.to}`, "success");
    }

    router.refresh();
  }

  async function toggleMeal(mealType: string, mealName: string, completed: boolean) {
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: props.todayKeyStr,
        mealType,
        mealName,
        completed,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.pointsAwarded) push(`+${d.pointsAwarded} puntos`, "success");
      router.refresh();
    } else {
      push("No se pudo guardar la comida", "danger");
    }
  }

  const mealStatus = (type: string) =>
    props.todayMeals.find((m) => m.mealType === type)?.completed ?? false;

  return (
    <div className="space-y-5">
      {/* Saludo + racha */}
      <section className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {props.dateLabel}
            </p>
            <h1 className="text-2xl font-bold mt-0.5">Hola, {props.user.name.split(" ")[0]}</h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl">🔥</div>
            <div className="font-bold text-xl" style={{ color: "var(--accent)" }}>
              {props.streak.current}
            </div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              mejor: {props.streak.longest}
            </div>
          </div>
        </div>

        {/* Barra de nivel */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
            <span>Nivel {props.user.level}</span>
            <span>{props.user.points} / {props.nextLevelPoints} pts</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (props.user.points / props.nextLevelPoints) * 100)}%`,
                background: "linear-gradient(90deg, #22c55e, #38bdf8)",
              }}
            />
          </div>
        </div>

        {(props.pendingPenalties > 0 || !props.hasProfile || props.weightLogsCount === 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {props.pendingPenalties > 0 && (
              <Link href="/penalties" className="chip" style={{ background: "#2a1417", color: "#fca5a5" }}>
                ⚖️ {props.pendingPenalties} penitencia{props.pendingPenalties > 1 ? "s" : ""} pendiente{props.pendingPenalties > 1 ? "s" : ""}
              </Link>
            )}
            {!props.hasProfile && (
              <span className="chip" style={{ background: "#1d2a1f", color: "#86efac" }}>
                📋 Completa tu perfil
              </span>
            )}
            {props.weightLogsCount === 0 && (
              <Link href="/progress" className="chip" style={{ background: "#1a2333", color: "#7dd3fc" }}>
                ⚖️ Registra tu peso
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Rutina del día */}
      <section className="card p-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{props.routineDay ? KIND_META[props.routineDay.kind].emoji : "📋"}</span>
          <div>
            <h2 className="font-bold text-lg leading-tight">
              {props.dayLabel}
              {props.routineDay && (
                <span style={{ color: KIND_META[props.routineDay.kind].color }}>
                  {" "}· {props.routineDay.focus}
                </span>
              )}
            </h2>
            {props.routineDay && props.routineDay.durationMin > 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {props.routineDay.durationMin} min
              </p>
            )}
          </div>
        </div>

        {!props.routineDay && (
          <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
            No hay rutina asignada para hoy.
          </p>
        )}

        {props.routineDay?.notes && (
          <p
            className="text-sm mt-3 p-3 rounded-lg"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            💡 {props.routineDay.notes}
          </p>
        )}

        {isRest && (
          <div
            className="mt-4 p-4 rounded-lg text-center"
            style={{ background: "var(--surface-2)" }}
          >
            <div className="text-3xl mb-1">😴</div>
            <p className="font-semibold">Día de descanso completo</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              El músculo crece mientras descansas. No cuenta para la racha ni genera penitencia.
            </p>
          </div>
        )}

        {isRecovery && !isRest && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ background: "#12222e", color: "#7dd3fc" }}
          >
            🧘 Día de recuperación activa. Muévete sin esfuerzo. La racha no se rompe.
          </div>
        )}

        {/* Progreso del día */}
        {!isRest && mainCount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
              <span>{mainDone} de {mainCount} ejercicios de fuerza</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
        )}

        {/* Ejercicios */}
        {grouped.map((g) => (
          <div key={g.section} className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              {g.label}
            </h3>
            <div className="space-y-1.5">
              {g.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg"
                  style={{
                    background: done[ex.id] ? "#12241a" : "var(--surface-2)",
                    border: `1px solid ${done[ex.id] ? "#2f6b3f" : "transparent"}`,
                  }}
                >
                  <button
                    onClick={() => setDone((d) => ({ ...d, [ex.id]: !d[ex.id] }))}
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      background: done[ex.id] ? "var(--accent)" : "transparent",
                      border: `2px solid ${done[ex.id] ? "var(--accent)" : "var(--border)"}`,
                      color: done[ex.id] ? "#06210f" : "transparent",
                    }}
                    aria-label={`Marcar ${ex.name}`}
                  >
                    ✓
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium"
                      style={{
                        textDecoration: done[ex.id] ? "line-through" : "none",
                        opacity: done[ex.id] ? 0.6 : 1,
                      }}
                    >
                      {ex.name}
                    </div>
                    <div className="text-[11px] flex flex-wrap gap-x-2" style={{ color: "var(--muted)" }}>
                      {ex.sets && <span>{ex.sets} × {ex.reps}</span>}
                      {ex.tempoSeconds && <span>⏱ {ex.tempoSeconds}</span>}
                      {ex.restSeconds && <span>descanso {ex.restSeconds}s</span>}
                    </div>
                    {ex.notes && (
                      <div className="text-[11px] mt-0.5" style={{ color: "#7dd3fc" }}>
                        {ex.notes}
                      </div>
                    )}
                  </div>
                  {!ex.warmup && (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={reps[ex.id] ?? ""}
                      onChange={(e) => setReps((r) => ({ ...r, [ex.id]: e.target.value }))}
                      className="input text-xs text-center shrink-0"
                      style={{ width: "58px", padding: "0.3rem" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Guardar */}
        {!isRest && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex gap-3 items-center mb-3">
              <label className="text-xs font-semibold shrink-0" style={{ color: "var(--muted)" }}>
                Duración (min)
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                style={{ width: "90px", padding: "0.4rem 0.5rem" }}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
              {status !== "PENDING" && (
                <span
                  className="chip"
                  style={{
                    background: status === "COMPLETED" ? "#12241a" : status === "SKIPPED" ? "#241416" : "#2a2212",
                    color: status === "COMPLETED" ? "#86efac" : status === "SKIPPED" ? "#fca5a5" : "#fcd34d",
                  }}
                >
                  Guardado: {status === "COMPLETED" ? "✓ Completo" : status === "SKIPPED" ? "✗ Omitido" : "◐ Parcial"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => saveWorkout("COMPLETED")}
                disabled={saving || mainDone === 0}
                className="btn btn-primary"
              >
                ✓ Cumplí
              </button>
              <button
                onClick={() => saveWorkout("PARTIAL")}
                disabled={saving || mainDone === 0}
                className="btn btn-ghost"
              >
                ◐ Parcial
              </button>
              <button
                onClick={() => saveWorkout("SKIPPED")}
                disabled={saving}
                className="btn btn-ghost"
                style={{ color: "#fca5a5" }}
              >
                ✗ No pude
              </button>
            </div>
            {mainDone === 0 && (
              <p className="text-[11px] mt-2 text-center" style={{ color: "var(--muted)" }}>
                Marca al menos un ejercicio para registrar cumplimiento.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Nutrición del día */}
      {props.mealDay && (
        <section className="card p-5">
          <h2 className="font-bold text-lg mb-1">🥗 Alimentación de hoy</h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Objetivo base: 80–100 g de proteína · 4–5 comidas · 2–2.5 L de agua
          </p>

          <div className="space-y-2">
            {props.mealDay.meals.map((m) => {
              const done = mealStatus(m.type);
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-lg"
                  style={{
                    background: done ? "#12241a" : "var(--surface-2)",
                    border: `1px solid ${done ? "#2f6b3f" : "transparent"}`,
                  }}
                >
                  <button
                    onClick={() => toggleMeal(m.type, m.name, !done)}
                    className="w-full text-left flex items-start gap-3"
                  >
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{
                        background: done ? "var(--accent)" : "transparent",
                        border: `2px solid ${done ? "var(--accent)" : "var(--border)"}`,
                        color: done ? "#06210f" : "transparent",
                      }}
                    >
                      ✓
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="text-xs font-bold uppercase" style={{ color: "var(--accent2)" }}>
                          {MEAL_LABEL[m.type] ?? m.type}
                        </span>
                        {done && <span className="text-[10px]" style={{ color: "#86efac" }}>✓ hecho</span>}
                      </span>
                      <span
                        className="block text-sm whitespace-pre-line mt-0.5"
                        style={{ opacity: done ? 0.65 : 1 }}
                      >
                        {m.items}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ background: "#12222e", color: "#7dd3fc" }}
          >
            🥤 <strong>Batido para subir calorías:</strong> 300 ml de leche + 1 banano + 40–60 g de
            avena + 20–30 g de maní o crema de maní.
          </div>

          <Link href="/nutrition" className="btn btn-ghost w-full mt-3 text-sm">
            Ver plan semanal completo →
          </Link>
        </section>
      )}

      <Toaster toasts={toasts} setToasts={setToasts} />
    </div>
  );
}