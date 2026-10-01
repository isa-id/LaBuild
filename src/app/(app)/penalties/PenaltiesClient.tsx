"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster, useToasts } from "@/components/Toast";

type Penalty = {
  id: string;
  date: string;
  status: "PENDING" | "REDEEMED" | "WAIVED";
  title: string;
  detail: string | null;
  repDebt: number;
  pointsPenalty: number;
};

type Props = {
  penalties: Penalty[];
  summary: { pending: number; totalRepDebt: number; redeemed: number };
};

const STATUS_META: Record<Penalty["status"], { label: string; bg: string; color: string }> = {
  PENDING: { label: "Pendiente", bg: "#2a1417", color: "#fca5a5" },
  REDEEMED: { label: "Cumplida", bg: "#12241a", color: "#86efac" },
  WAIVED: { label: "Perdonada", bg: "var(--surface-2)", color: "var(--muted)" },
};

export default function PenaltiesClient({ penalties, summary }: Props) {
  const router = useRouter();
  const { toasts, push, setToasts } = useToasts();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(penaltyId: string, action: "redeem" | "waive") {
    setBusy(penaltyId);
    const res = await fetch("/api/penalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ penaltyId, action }),
    });
    setBusy(null);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      push(d.error ?? "No se pudo actualizar", "danger");
      return;
    }

    const d = await res.json();
    push(
      action === "redeem" ? "✅ Penitencia cumplida. +15 puntos" : "Penitencia perdonada",
      "success"
    );
    for (const a of d.unlockedAchievements ?? []) {
      push(`🏆 Logro: ${a.name}`, "success");
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">⚖️ Penitencias</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Si no cumples un día de entrenamiento, se genera una deuda de repeticiones.
          Cúmplela para recuperarte y ganar puntos extra.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl">📋</div>
          <div className="text-xl font-bold" style={{ color: summary.pending ? "#fca5a5" : "var(--text)" }}>
            {summary.pending}
          </div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>Pendientes</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl">🔁</div>
          <div className="text-xl font-bold" style={{ color: "var(--warning)" }}>
            {summary.totalRepDebt}
          </div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>Reps por hacer</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl">✅</div>
          <div className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            {summary.redeemed}
          </div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>Cumplidas</div>
        </div>
      </section>

      {summary.pending > 0 && (
        <section className="card p-4" style={{ borderColor: "#7f2b2b" }}>
          <h2 className="font-bold mb-1" style={{ color: "#fca5a5" }}>
            Trabaja pendiente
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Total: <strong style={{ color: "var(--warning)" }}>{summary.totalRepDebt} repeticiones</strong>{" "}
            repartidas entre los días que te saltaste.
          </p>
        </section>
      )}

      {penalties.length === 0 ? (
        <section className="card p-8 text-center">
          <div className="text-4xl mb-2">✨</div>
          <p className="font-semibold">Sin penitencias</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Mantén tu racha para que siga así.
          </p>
        </section>
      ) : (
        <section className="space-y-2">
          {penalties.map((p) => {
            const meta = STATUS_META[p.status];
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{p.title}</h3>
                      <span className="chip" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {p.date}
                    </p>
                    {p.detail && (
                      <p className="text-sm mt-2">{p.detail}</p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {p.repDebt > 0 && (
                        <span className="chip" style={{ background: "#2a2212", color: "#fcd34d" }}>
                          +{p.repDebt} reps
                        </span>
                      )}
                      {p.pointsPenalty > 0 && (
                        <span className="chip" style={{ background: "#2a1417", color: "#fca5a5" }}>
                          −{p.pointsPenalty} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.status === "PENDING" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => act(p.id, "redeem")}
                      disabled={busy === p.id}
                      className="btn btn-primary text-sm flex-1"
                    >
                      ✓ Ya la cumplí (+15 pts)
                    </button>
                    <button
                      onClick={() => act(p.id, "waive")}
                      disabled={busy === p.id}
                      className="btn btn-ghost text-sm"
                    >
                      Perdonar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <Toaster toasts={toasts} setToasts={setToasts} />
    </div>
  );
}