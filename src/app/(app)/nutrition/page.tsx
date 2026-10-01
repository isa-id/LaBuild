import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMealPlan } from "@/lib/routine";
import { dayKeyFromDate, todayKey } from "@/lib/dates";
import { Icon, type IconName } from "@/components/icons";
import MealPlanClient from "./MealPlanClient";

export const dynamic = "force-dynamic";

/** Metas diarias del plan. */
const DAILY_GOALS: { label: string; value: string; icon: IconName; color: string }[] = [
  { label: "Proteína", value: "80–100 g", icon: "beef", color: "var(--danger)" },
  { label: "Comidas", value: "4–5", icon: "meal", color: "var(--accent)" },
  { label: "Agua", value: "2–2.5 L", icon: "water", color: "var(--accent-2)" },
  { label: "Frutas", value: "2–3", icon: "apple", color: "var(--orange)" },
];

type Group = { title: string; icon: IconName; color: string; items: string[] };

/** Compra semanal: grupos de alimentos básicos y económicos. */
const GROUPS: Group[] = [
  {
    title: "Proteínas",
    icon: "beef",
    color: "var(--danger)",
    items: ["Huevos", "Pollo", "Atún", "Carne molida", "Leche", "Yogur", "Queso", "Lentejas", "Fríjoles"],
  },
  {
    title: "Carbohidratos",
    icon: "cookie",
    color: "var(--yellow)",
    items: ["Arroz", "Avena", "Papa", "Plátano", "Arepas", "Pan"],
  },
  {
    title: "Grasas",
    icon: "apple",
    color: "var(--orange)",
    items: ["Maní", "Aguacate", "Aceite"],
  },
  {
    title: "Frutas",
    icon: "apple",
    color: "var(--pink)",
    items: ["Banano", "Papaya", "Mango", "Mandarina", "Manzana"],
  },
];

export default async function NutritionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await getActiveMealPlan();
  if (!plan) {
    return (
      <div className="card p-6">
        <p style={{ color: "var(--muted)" }}>No hay plan alimentario configurado.</p>
      </div>
    );
  }

  const todayDate = todayKey();
  const todayDayKey = dayKeyFromDate(new Date(`${todayDate}T00:00:00Z`));

  // IMC del usuario actual, no los valores fijos de la nota de abajo.
  const heightM = user.heightCm / 100;
  const bmi = heightM > 0 ? Number(user.startingWeightKg) / (heightM * heightM) : 0;
  const bmiLow = bmi > 0 && bmi < 18.5;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="salad" size={24} style={{ color: "var(--accent)" }} />
          {plan.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {plan.description}
        </p>
      </header>

      {/* Objetivo diario */}
      <section className="card p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Icon name="target" size={17} style={{ color: "var(--accent)" }} />
          Objetivo diario
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DAILY_GOALS.map((g) => (
            <div
              key={g.label}
              className="p-3 rounded-lg text-center"
              style={{ background: "var(--surface-2)" }}
            >
              <Icon
                name={g.icon}
                size={22}
                className="mx-auto mb-1"
                style={{ color: g.color }}
              />
              <div className="font-bold text-sm">{g.value}</div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                {g.label}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-3 p-3 rounded-lg text-sm flex gap-2"
          style={{ background: "#12222e", color: "#7dd3fc" }}
        >
          <Icon name="shake" size={17} className="shrink-0 mt-0.5" />
          <span>
            <strong>Batido casero:</strong> 300 ml leche + 1 banano + 40–60 g avena + 20–30 g maní.
            Útil si te cuesta comer suficiente.
          </span>
        </div>
      </section>

      {/* Plan por días, ahora interactivo */}
      <section className="space-y-3">
        <h2 className="font-bold flex items-center gap-2">
          <Icon name="calendar" size={17} style={{ color: "var(--accent)" }} />
          Plan de 7 días
        </h2>

        <MealPlanClient
          mealDays={plan.mealDays.map((md) => ({
            id: md.id,
            dayKey: md.dayKey,
            dayIndex: md.dayIndex,
            notes: md.notes,
            meals: md.meals.map((m) => ({
              id: m.id,
              order: m.order,
              type: m.type,
              name: m.name,
              items: m.items,
              notes: m.notes,
            })),
          }))}
          todayDayKey={todayDayKey}
          todayDate={todayDate}
        />
      </section>

      {/* Compra semanal */}
      <section className="card p-4">
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <Icon name="list" size={17} style={{ color: "var(--accent)" }} />
          Compra semanal económica
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          No necesitas productos "fitness" caros.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">
                <Icon name={g.icon} size={14} style={{ color: g.color }} />
                {g.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((item) => (
                  <span
                    key={item}
                    className="chip"
                    style={{
                      background: "var(--surface)",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo saber si comes suficiente */}
      <section className="card p-4">
        <h2 className="font-bold mb-2 flex items-center gap-2">
          <Icon name="bulb" size={17} style={{ color: "var(--yellow)" }} />
          ¿Cómo saber si comes suficiente?
        </h2>

        <ol className="text-sm space-y-1.5 list-decimal list-inside" style={{ color: "var(--muted)" }}>
          <li>Pésate 3–4 mañanas por semana, después del baño y antes de desayunar.</li>
          <li>Mira el promedio semanal, no un solo día.</li>
          <li>
            Si en 2–3 semanas el peso no sube, añade 1 banano + 1 vaso de leche + 30–40 g de avena.
          </li>
          <li>Si subes demasiado rápido, reduce un poco las cantidades.</li>
          <li>Duerme 7–9 horas y mantén la progresión del entrenamiento.</li>
        </ol>

        <div
          className="mt-3 p-3 rounded-lg text-sm flex gap-2"
          style={{
            background: bmiLow ? "#2a2212" : "#12241a",
            color: bmiLow ? "#fcd34d" : "#86efac",
          }}
        >
          <Icon name="warning" size={17} className="shrink-0 mt-0.5" />
          <span>
            {bmiLow ? (
              <>
                <strong>Nota:</strong> tu IMC es ~{bmi.toFixed(1)}. Está por debajo del rango de
                referencia para adultos. Si ese peso no es intencional o perdiste peso
                recientemente, consulta con un médico o nutricionista antes de aumentar mucho las
                calorías. Esta app no sustituye opinión profesional.
              </>
            ) : (
              <>
                <strong>Nota:</strong> tu IMC es ~{bmi.toFixed(1)}. Mantén la progresión del
                entrenamiento y ajusta las calorías según cómo responda el peso semanal. Esta app no
                sustituye opinión profesional.
              </>
            )}
          </span>
        </div>
      </section>
    </div>
  );
}
