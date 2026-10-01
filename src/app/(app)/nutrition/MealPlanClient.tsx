"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { DAY_LABEL_ES, DAY_SHORT_ES, dateOfDayInWeek } from "@/lib/dates";
import type { DayKey } from "@prisma/client";

type Meal = {
  id: string;
  order: number;
  type: string;
  name: string;
  items: string;
  notes: string | null;
};

type MealDay = {
  id: string;
  dayKey: DayKey;
  dayIndex: number;
  notes: string | null;
  meals: Meal[];
};

export const MEAL_META: Record<string, { label: string; icon: IconName }> = {
  BREAKFAST: { label: "Desayuno", icon: "coffee" },
  MIDMORNING: { label: "Media mañana", icon: "croissant" },
  LUNCH: { label: "Almuerzo", icon: "meal" },
  SNACK: { label: "Merienda", icon: "cookie" },
  DINNER: { label: "Cena", icon: "soup" },
  SHAKE: { label: "Batido", icon: "shake" },
};

export default function MealPlanClient({
  mealDays,
  todayDayKey,
  todayDate,
}: {
  mealDays: MealDay[];
  todayDayKey: DayKey;
  todayDate: string;
}) {
  const { toast } = useToast();

  const todayIndex = mealDays.findIndex((d) => d.dayKey === todayDayKey);
  // Si hoy no está en el plan (plantilla incompleta), abre el primero.
  const [selected, setSelected] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  // { mealId: completado }
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const current = mealDays[selected];

  /**
   * Fecha real del día seleccionado dentro de la semana actual.
   *
   * El plan es una plantilla que se repite cada semana, así que al mirar el
   * lunes hay que guardar el lunes de esta semana, no el de hace meses.
   */
  const selectedDate = useMemo(
    () => (current ? dateOfDayInWeek(current.dayKey, todayDate) : todayDate),
    [current, todayDate]
  );

  // No se puede registrar lo que aún no ha pasado.
  const isFuture = selectedDate > todayDate;
  const isToday = selectedDate === todayDate;

  // Carga el estado del día seleccionado, no el de hoy.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/meals?date=${selectedDate}`);
      const data = await res.json().catch(() => ({ logs: [] }));

      if (cancelled) return;

      const map: Record<string, boolean> = {};
      for (const log of data.logs ?? []) map[log.mealName] = log.completed;

      setDone(map);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  async function toggle(meal: Meal) {
    if (isFuture) {
      toast({ kind: "error", message: "Ese día todavía no ha llegado" });
      return;
    }

    const next = !done[meal.name];

    // Optimista: la casilla responde al instante y se revierte si falla.
    setDone((d) => ({ ...d, [meal.name]: next }));
    setSavingId(meal.id);
    setOpenMeal(null);

    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        mealType: meal.type,
        mealName: meal.name,
        completed: next,
      }),
    });

    setSavingId(null);

    if (!res.ok) {
      setDone((d) => ({ ...d, [meal.name]: !next }));
      toast({ kind: "error", message: "No se pudo guardar la comida" });
      return;
    }

    if (next) {
      const data = await res.json().catch(() => ({}));
      const pts = data.pointsAwarded ?? 0;
      toast({
        kind: "success",
        message: pts > 5 ? `${meal.name}: +${pts} puntos` : `${meal.name} completada`,
      });
    }
  }

  const completedCount = current?.meals.filter((m) => done[m.name]).length ?? 0;
  const totalMeals = current?.meals.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Selector de día: tira horizontal desplazable */}
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {mealDays.map((day, index) => {
          const active = index === selected;
          const isToday = day.dayKey === todayDayKey;

          // Cada plantilla representa su día en la semana en curso.
          const dayDate = dateOfDayInWeek(day.dayKey, todayDate);
          const past = dayDate < todayDate;
          const future = dayDate > todayDate;

          return (
            <button
              key={day.id}
              type="button"
              onClick={() => {
                setSelected(index);
                setOpenMeal(null);
              }}
              className="shrink-0 rounded-xl px-3.5 py-2.5 text-center transition-colors"
              style={{
                background: active ? "var(--surface-2)" : "var(--surface)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                minWidth: 62,
                opacity: future && !active ? 0.55 : 1,
              }}
              aria-pressed={active}
              title={future ? "Todavía no ha llegado" : past ? "Día pasado" : "Hoy"}
            >
              <div
                className="text-xs font-bold"
                style={{ color: active ? "var(--accent)" : "var(--muted)" }}
              >
                {DAY_SHORT_ES[day.dayKey]}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                {day.meals.length} comidas
              </div>
              {isToday && (
                <div
                  className="w-1.5 h-1.5 rounded-full mx-auto mt-1"
                  style={{ background: "var(--accent-2)" }}
                  title="Hoy"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Cabecera del día seleccionado */}
      {current && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="min-w-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                {DAY_LABEL_ES[current.dayKey]}
                {isFuture && (
                  <span className="chip" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                    <Icon name="clock" size={11} />
                    Futuro
                  </span>
                )}
                {!isFuture && !isToday && (
                  <span className="chip" style={{ background: "#12241a", color: "#86efac" }}>
                    <Icon name="check" size={11} strokeWidth={3} />
                    Registrable
                  </span>
                )}
              </h2>
              {current.notes && (
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {current.notes}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                {completedCount}/{totalMeals}
              </div>
              <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                comidas
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div
            className="h-1.5 rounded-full overflow-hidden mt-3"
            style={{ background: "var(--surface-2)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalMeals ? (completedCount / totalMeals) * 100 : 0}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </div>
      )}

      {/* Lista de comidas del día */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
            Cargando…
          </p>
        ) : (
          current?.meals.map((meal) => {
            const meta = MEAL_META[meal.type] ?? { label: meal.type, icon: "meal" as IconName };
            const isDone = !!done[meal.name];
            const isOpen = openMeal === meal.id;
            const isSaving = savingId === meal.id;

            return (
              <div
                key={meal.id}
                className="card overflow-hidden"
                style={{ borderColor: isDone ? "#2f6b3f" : "var(--border)" }}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggle(meal)}
                    disabled={isSaving || isFuture}
                    className="shrink-0 rounded-md flex items-center justify-center transition-colors"
                    style={{
                      width: 26,
                      height: 26,
                      background: isDone ? "var(--accent)" : "transparent",
                      border: `2px solid ${isDone ? "var(--accent)" : "var(--border)"}`,
                      color: "#06210f",
                      opacity: isSaving ? 0.5 : isFuture ? 0.35 : 1,
                      cursor: isFuture ? "not-allowed" : "pointer",
                    }}
                    aria-label={
                      isFuture
                        ? `${meal.name} (día futuro)`
                        : isDone
                          ? `Desmarcar ${meal.name}`
                          : `Marcar ${meal.name}`
                    }
                    aria-pressed={isDone}
                  >
                    {isDone && <Icon name="check" size={16} strokeWidth={3} />}
                  </button>

                  {/* Contenido */}
                  <button
                    type="button"
                    onClick={() => setOpenMeal(isOpen ? null : meal.id)}
                    className="flex-1 min-w-0 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon
                        name={meta.icon}
                        size={14}
                        style={{ color: isDone ? "var(--accent)" : "var(--accent-2)" }}
                      />
                      <span
                        className="text-[11px] font-bold uppercase tracking-wide"
                        style={{ color: "var(--accent-2)" }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div
                      className="text-sm font-semibold mt-0.5 truncate"
                      style={{
                        color: isDone ? "var(--muted)" : "var(--text)",
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {meal.name}
                    </div>
                  </button>

                  <Icon
                    name="arrowRight"
                    size={16}
                    style={{
                      color: "var(--muted)",
                      transform: isOpen ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>

                {/* Detalle desplegable */}
                {isOpen && (
                  <div
                    className="px-3 pb-3 pt-0 text-sm whitespace-pre-line"
                    style={{ color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}
                  >
                    {meal.items}
                    {meal.notes && (
                      <p
                        className="mt-2 pt-2 text-xs flex gap-1.5"
                        style={{ borderTop: "1px dashed var(--border)" }}
                      >
                        <Icon name="info" size={13} className="shrink-0 mt-0.5" />
                        {meal.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {completedCount === totalMeals && totalMeals > 0 && (
        <div
          className="card p-4 flex items-center gap-2 text-sm font-semibold"
          style={{ background: "#12241a", borderColor: "#2f6b3f", color: "#86efac" }}
        >
          <Icon name="checkCircle" size={18} />
          Día alimenticio completo. Sumaste el bonus de puntos.
        </div>
      )}
    </div>
  );
}
