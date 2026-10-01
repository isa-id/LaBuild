import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMealPlan } from "@/lib/routine";
import { DAY_LABEL_ES, DAY_SHORT_ES, dayKeyFromDate, todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: "Desayuno",
  MIDMORNING: "Media mañana",
  LUNCH: "Almuerzo",
  SNACK: "Merienda",
  DINNER: "Cena",
  SHAKE: "Batido",
};

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

  const today = todayKey();
  const todayDayKey = dayKeyFromDate(new Date(`${today}T00:00:00Z`));

  const groups: { title: string; items: { name: string; detail?: string }[] }[] = [
    {
      title: "🥩 Proteínas",
      items: [
        { name: "Huevos" },
        { name: "Pollo" },
        { name: "Atún" },
        { name: "Carne molida" },
        { name: "Leche" },
        { name: "Yogur" },
        { name: "Queso" },
        { name: "Lentejas" },
        { name: "Fríjoles" },
      ],
    },
    {
      title: "🍚 Carbohidratos",
      items: [{ name: "Arroz" }, { name: "Avena" }, { name: "Papa" }, { name: "Plátano" }, { name: "Arepas" }, { name: "Pan" }],
    },
    {
      title: "🥑 Grasas",
      items: [{ name: "Maní" }, { name: "Aguacate" }, { name: "Aceite" }],
    },
    {
      title: "🍎 Frutas",
      items: [{ name: "Banano" }, { name: "Papaya" }, { name: "Mango" }, { name: "Mandarina" }, { name: "Manzana" }],
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {plan.description}
        </p>
      </header>

      <section className="card p-4">
        <h2 className="font-bold mb-3">Objetivo diario</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Proteína", value: "80–100 g", emoji: "🥩" },
            { label: "Comidas", value: "4–5", emoji: "🍽️" },
            { label: "Agua", value: "2–2.5 L", emoji: "💧" },
            { label: "Frutas", value: "2–3", emoji: "🍎" },
          ].map((m) => (
            <div key={m.label} className="p-3 rounded-lg text-center" style={{ background: "var(--surface-2)" }}>
              <div className="text-xl mb-1">{m.emoji}</div>
              <div className="font-bold text-sm">{m.value}</div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: "#12222e", color: "#7dd3fc" }}>
          🥤 <strong>Batido casero:</strong> 300 ml leche + 1 banano + 40–60 g avena + 20–30 g maní.
          Útil si te cuesta comer suficiente.
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-bold">Plan de 7 días</h2>
        {plan.mealDays.map((md) => {
          const isToday = md.dayKey === todayDayKey;
          return (
            <div
              key={md.id}
              className="card p-4"
              style={{ borderColor: isToday ? "var(--accent)" : "var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold">{DAY_LABEL_ES[md.dayKey]}</h3>
                {isToday && (
                  <span className="chip" style={{ background: "#12241a", color: "#86efac" }}>
                    Hoy
                  </span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {md.meals.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                    <div className="text-[11px] font-bold uppercase" style={{ color: "var(--accent2)" }}>
                      {MEAL_LABEL[m.type] ?? m.type}
                    </div>
                    <div className="text-sm mt-1 whitespace-pre-line">{m.items}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="card p-4">
        <h2 className="font-bold mb-1">🛒 Compra semanal económica</h2>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          No necesitas productos "fitness" caros.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title} className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <h3 className="font-bold text-sm mb-2">{g.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((i) => (
                  <span key={i.name} className="chip" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                    {i.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-bold mb-2">📈 ¿Cómo saber si comes suficiente?</h2>
        <ol className="text-sm space-y-1.5 list-decimal list-inside" style={{ color: "var(--muted)" }}>
          <li>Pésate 3–4 mañanas por semana, después del baño y antes de desayunar.</li>
          <li>Mira el promedio semanal, no un solo día.</li>
          <li>Si en 2–3 semanas el peso no sube, añade 1 banano + 1 vaso de leche + 30–40 g de avena.</li>
          <li>Si subes demasiado rápido, reduce un poco las cantidades.</li>
          <li>Duerme 7–9 horas y mantén la progresión del entrenamiento.</li>
        </ol>
        <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: "#2a2212", color: "#fcd34d" }}>
          ⚠️ <strong>Nota:</strong> con 50 kg y 1,75 m tu IMC es ~16.3. Si ese peso no es
          intencional o perdiste peso recientemente, consulta con un médico o nutricionista antes de
          aumentar mucho las calorías. Esta app no sustituye opinión profesional.
        </div>
      </section>
    </div>
  );
}