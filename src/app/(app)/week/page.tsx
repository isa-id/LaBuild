import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRoutine } from "@/lib/routine";
import { DAY_LABEL_ES, DAY_SHORT_ES, dateToKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  COMPLETED: { label: "✓ Cumplido", bg: "#12241a", color: "#86efac" },
  PARTIAL: { label: "◐ Parcial", bg: "#2a2212", color: "#fcd34d" },
  SKIPPED: { label: "✗ Omitido", bg: "#241416", color: "#fca5a5" },
  REST: { label: "😴 Descanso", bg: "var(--surface-2)", color: "var(--muted)" },
  RECOVERY: { label: "🧘 Recuperación", bg: "#12222e", color: "#7dd3fc" },
  PENDING: { label: "Pendiente", bg: "var(--surface-2)", color: "var(--muted)" },
};

export default async function WeekPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const routine = await getActiveRoutine(user.id);
  if (!routine) {
    return (
      <div className="card p-6">
        <p style={{ color: "var(--muted)" }}>No hay rutina configurada.</p>
      </div>
    );
  }

  // Últimas 4 semanas + próxima.
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 27);

  const logs = await prisma.workoutLog.findMany({
    where: {
      userId: user.id,
      date: { gte: start },
    },
    select: { date: true, dayKey: true, status: true, completedExercises: true, totalExercises: true },
    orderBy: { date: "asc" },
  });

  const logByKey = new Map(logs.map((l) => [dateToKey(l.date), l]));
  const kindByDay = new Map(routine.routineDays.map((d) => [d.dayKey, d.kind]));

  const weeks: { label: string; days: { dateKey: string; dayKey: string; focus: string; kind: string; log: (typeof logs)[number] | undefined }[] }[] = [];

  for (let w = 0; w < 5; w++) {
    const weekStart = new Date(start);
    weekStart.setUTCDate(start.getUTCDate() + w * 7);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + d);
      const dateKey = dateToKey(date);
      const dayKey = DAY_SHORT_ES ? (["SUN","MON","TUE","WED","THU","FRI","SAT"] as const)[date.getUTCDay()] : "MON";
      const routineDay = routine.routineDays.find((rd) => rd.dayKey === dayKey);
      days.push({
        dateKey,
        dayKey,
        focus: routineDay?.focus ?? "—",
        kind: kindByDay.get(dayKey) ?? "TRAIN",
        log: logByKey.get(dateKey),
      });
    }
    const isCurrent =
      today >= weekStart && today < new Date(weekStart.getTime() + 7 * 86400000);
    weeks.push({
      label: isCurrent
        ? "Esta semana"
        : `Semana del ${weekStart.getUTCDate()}/${weekStart.getUTCMonth() + 1}`,
      days,
    });
  }

  const streak = await prisma.streak.findUnique({ where: { userId: user.id } });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Tu semana</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Racha actual <strong style={{ color: "var(--accent)" }}>{streak?.currentCount ?? 0}</strong> ·
          mejor racha <strong>{streak?.longestCount ?? 0}</strong>
        </p>
      </header>

      <div className="card p-4">
        <h2 className="font-bold mb-2">División semanal</h2>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          Cada día tiene un enfoque. El descanso del domingo no cuenta para la racha.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {routine.routineDays.map((d) => {
            const meta = STATUS_STYLE[d.kind] ?? STATUS_STYLE.PENDING;
            return (
              <div key={d.id} className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{DAY_LABEL_ES[d.dayKey]}</span>
                  <span className="chip" style={{ background: "transparent", color: meta.color, border: `1px solid ${meta.color}44` }}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {d.focus}
                </p>
                {d.durationMin > 0 && (
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {d.durationMin} min · {d.exercises.length} ejercicios
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-3">Historial (4 semanas + actual)</h2>
        <div className="space-y-5">
          {weeks.map((week) => (
            <div key={week.label}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{week.label}</h3>
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {
                    week.days.filter((d) => d.log?.status === "COMPLETED").length
                  }
                  /5 cumplidos
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {week.days.map((d) => {
                  const status = d.kind === "REST" ? "REST" : d.kind === "RECOVERY" ? "RECOVERY" : d.log?.status ?? "PENDING";
                  const meta = STATUS_STYLE[status];
                  const isToday = dateToKey(today) === d.dateKey;
                  const isFuture = new Date(`${d.dateKey}T00:00:00Z`) > today;
                  return (
                    <div
                      key={d.dateKey}
                      className="rounded-lg p-2 text-center"
                      style={{
                        background: isFuture ? "var(--surface-2)" : meta.bg,
                        border: `1px solid ${isToday ? "var(--accent)" : "transparent"}`,
                        opacity: isFuture ? 0.4 : 1,
                      }}
                    >
                      <div className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                        {d.dayKey}
                      </div>
                      <div className="text-sm my-0.5">{isFuture ? "·" : meta.label.split(" ")[0]}</div>
                      <div className="text-[9px] leading-tight" style={{ color: meta.color }}>
                        {isFuture ? "" : meta.label.slice(2).trim() || d.focus.slice(0, 10)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-3">📈 Progresión (4 semanas)</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Semana 1: aprende la técnica. Semana 2: +1–2 reps por serie. Semana 3: añade una serie.
          Semana 4: baja más lento o usa una variante más difícil.
        </p>
      </div>
    </div>
  );
}