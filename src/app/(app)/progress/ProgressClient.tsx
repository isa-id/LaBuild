"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster, useToasts } from "@/components/Toast";

type Props = {
  user: {
    name: string;
    points: number;
    level: number;
    age: number | null;
    heightCm: number | null;
    startingWeightKg: number | null;
  };
  streak: { current: number; longest: number };
  stats: {
    workoutsCompleted: number;
    pendingPenalties: number;
    totalRepDebt: number;
    achievementsEarned: number;
    achievementsTotal: number;
  };
  achievements: {
    slug: string;
    name: string;
    description: string;
    tier: string;
    icon: string | null;
    pointsReward: number;
    earned: boolean;
  }[];
  pointEvents: { id: string; points: number; reason: string; createdAt: string }[];
  progression: { name: string; slug: string; steps: string[]; currentStep: number; unlockedStep: number }[];
  weightLogs: { date: string; weightKg: number }[];
  weeklyAverages: { week: string; avg: number; count: number }[];
  weightDelta: number | null;
};

const TIER_META: Record<string, { label: string; color: string; bg: string }> = {
  BRONZE: { label: "Bronce", color: "#d9a066", bg: "#2a1f14" },
  SILVER: { label: "Plata", color: "#c0c8d4", bg: "#1e242e" },
  GOLD: { label: "Oro", color: "#f5c451", bg: "#2a2312" },
  PLATINUM: { label: "Platino", color: "#a5f3fc", bg: "#12222e" },
};

function WeightChart({ logs }: { logs: { date: string; weightKg: number }[] }) {
  if (logs.length < 2) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
        Registra tu peso al menos dos veces para ver la gráfica.
      </p>
    );
  }

  const width = 600;
  const height = 180;
  const pad = 30;
  const weights = logs.map((l) => l.weightKg);
  const min = Math.min(...weights) - 0.5;
  const max = Math.max(...weights) + 0.5;
  const range = max - min || 1;

  const points = logs
    .map((l, i) => {
      const x = pad + (i / (logs.length - 1)) * (width - pad * 2);
      const y = height - pad - ((l.weightKg - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = logs[logs.length - 1];
  const lastX = pad + (width - pad * 2);
  const lastY =
    height - pad - ((last.weightKg - min) / range) * (height - pad * 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={pad} y1={height - pad} x2={width - pad} y2={height - pad}
          stroke="var(--border)" strokeWidth="1"
        />
        <polygon
          points={`${pad},${height - pad} ${points} ${width - pad},${height - pad}`}
          fill="url(#wg)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r="4" fill="var(--accent)" />
        <text x={width - pad} y={lastY - 10} textAnchor="end" fill="#86efac" fontSize="12" fontWeight="700">
          {last.weightKg} kg
        </text>
        <text x={pad} y={height - 8} fill="var(--muted)" fontSize="10">
          {logs[0].date}
        </text>
      </svg>
    </div>
  );
}

export default function ProgressClient(props: Props) {
  const router = useRouter();
  const { toasts, push, setToasts } = useToasts();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  const bmi = useMemo(() => {
    if (!props.user.heightCm || !props.weightLogs.length) return null;
    const h = props.user.heightCm / 100;
    const w = props.weightLogs[props.weightLogs.length - 1].weightKg;
    return Math.round((w / (h * h)) * 10) / 10;
  }, [props.user.heightCm, props.weightLogs]);

  async function logWeight(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weightKg: Number(weight) }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      push(d.pointsAwarded ? `Peso registrado. +${d.pointsAwarded} puntos` : "Peso actualizado", "success");
      setWeight("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      push(d.error ?? "No se pudo guardar", "danger");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">📈 Progreso</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Nivel {props.user.level} · {props.user.points} puntos
        </p>
      </header>

      {/* Resumen */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Racha actual", value: `🔥 ${props.streak.current}`, sub: `mejor ${props.streak.longest}` },
          { label: "Entrenamientos", value: props.stats.workoutsCompleted, sub: "completados" },
          { label: "Logros", value: `${props.stats.achievementsEarned}/${props.stats.achievementsTotal}`, sub: "desbloqueados" },
          {
            label: "Δ Peso",
            value: props.weightDelta !== null ? `${props.weightDelta > 0 ? "+" : ""}${props.weightDelta} kg` : "—",
            sub: "desde el inicio",
          },
        ].map((m) => (
          <div key={m.label} className="card p-3">
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>{m.label}</div>
            <div className="text-xl font-bold mt-0.5">{m.value}</div>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>{m.sub}</div>
          </div>
        ))}
      </section>

      {/* Peso */}
      <section className="card p-4">
        <h2 className="font-bold mb-3">⚖️ Seguimiento de peso</h2>
        <form onSubmit={logWeight} className="flex gap-2 mb-4">
          <input
            type="date"
            className="input"
            style={{ maxWidth: "160px" }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className="input"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
            style={{ maxWidth: "110px" }}
          />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "…" : "Registrar"}
          </button>
        </form>

        <WeightChart logs={props.weightLogs} />

        {props.weeklyAverages.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase mb-2" style={{ color: "var(--muted)" }}>
              Promedio semanal
            </h3>
            <div className="space-y-1">
              {props.weeklyAverages.map((w) => (
                <div key={w.week} className="flex justify-between text-sm p-2 rounded" style={{ background: "var(--surface-2)" }}>
                  <span style={{ color: "var(--muted)" }}>Semana {w.week}</span>
                  <span className="font-semibold">{w.avg} kg <span className="text-[10px]" style={{ color: "var(--muted)" }}>({w.count} registros)</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {bmi !== null && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: bmi < 18.5 ? "#2a2212" : "#12241a", color: bmi < 18.5 ? "#fcd34d" : "#86efac" }}>
            IMC actual: <strong>{bmi}</strong>
            {bmi < 18.5 && " — por debajo del rango de referencia para adultos. Si no es intencional, consulta con un médico o nutricionista antes de aumentar mucho las calorías."}
          </div>
        )}

        <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
          💡 Pésate 3–4 mañanas por semana, después del baño y antes de desayunar. Mira el promedio
          semanal. Si en 2–3 semanas no sube, añade 1 banano + 1 vaso de leche + 30–40 g de avena.
        </p>
      </section>

      {/* Progresión */}
      <section className="card p-4">
        <h2 className="font-bold mb-1">⬆️ Progresión de ejercicios</h2>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          Sin pesas, subimos de variante. Cada bloque de sesiones completadas desbloquea el siguiente nivel.
        </p>
        {props.progression.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Completa ejercicios para desbloquear progresiones.
          </p>
        ) : (
          <div className="space-y-3">
            {props.progression.map((p) => (
              <div key={p.slug} className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <h3 className="font-bold text-sm mb-2">{p.name}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {p.steps.map((s, i) => {
                    const unlocked = i <= p.unlockedStep;
                    const current = i === p.currentStep;
                    return (
                      <span
                        key={s}
                        className="chip"
                        style={{
                          background: current ? "var(--accent)" : unlocked ? "#12241a" : "var(--surface)",
                          color: current ? "#06210f" : unlocked ? "#86efac" : "var(--muted)",
                          border: `1px solid ${unlocked ? "#2f6b3f" : "var(--border)"}`,
                        }}
                        title={s}
                      >
                        {current ? "▶ " : unlocked ? "✓ " : "🔒 "}
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Logros */}
      <section className="card p-4">
        <h2 className="font-bold mb-3">🏆 Logros</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {props.achievements.map((a) => {
            const meta = TIER_META[a.tier] ?? TIER_META.BRONZE;
            return (
              <div
                key={a.slug}
                className="p-3 rounded-lg"
                style={{
                  background: a.earned ? meta.bg : "var(--surface-2)",
                  border: `1px solid ${a.earned ? meta.color + "55" : "transparent"}`,
                  opacity: a.earned ? 1 : 0.55,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{a.earned ? "🏅" : "🔒"}</span>
                  <span className="font-bold text-sm">{a.name}</span>
                  <span className="chip" style={{ background: "transparent", color: meta.color, border: `1px solid ${meta.color}44` }}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {a.description}
                </p>
                {a.pointsReward > 0 && (
                  <p className="text-[11px] mt-1" style={{ color: meta.color }}>
                    +{a.pointsReward} puntos
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Historial de puntos */}
      <section className="card p-4">
        <h2 className="font-bold mb-3">🪙 Historial de puntos</h2>
        {props.pointEvents.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Sin movimientos todavía.</p>
        ) : (
          <div className="space-y-1">
            {props.pointEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded" style={{ background: "var(--surface-2)" }}>
                <span className="truncate" style={{ color: "var(--muted)" }}>{e.reason}</span>
                <span
                  className="font-bold shrink-0 ml-2"
                  style={{ color: e.points >= 0 ? "var(--accent)" : "var(--danger)" }}
                >
                  {e.points >= 0 ? "+" : ""}{e.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Toaster toasts={toasts} setToasts={setToasts} />
    </div>
  );
}