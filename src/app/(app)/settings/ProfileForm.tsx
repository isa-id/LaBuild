"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";

type Field = "name" | "email" | "age" | "heightCm" | "startingWeightKg";

const NUMERIC: Field[] = ["age", "heightCm", "startingWeightKg"];

export default function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    email: string;
    age: number;
    heightCm: number;
    startingWeightKg: number;
    goal: string;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    age: String(initial.age),
    heightCm: String(initial.heightCm),
    startingWeightKg: String(initial.startingWeightKg),
    goal: initial.goal,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    // Limpia el error del campo al editarlo.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Validación en el cliente: los mensajes coinciden con los del servidor.
    const local: Partial<Record<string, string>> = {};
    if (form.name.trim().length < 2) local.name = "Mínimo 2 caracteres";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = "Email inválido";

    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 13 || age > 100) local.age = "Entre 13 y 100";

    const height = Number(form.heightCm);
    if (!Number.isInteger(height) || height < 120 || height > 230) {
      local.heightCm = "Entre 120 y 230";
    }

    const weight = Number(form.startingWeightKg);
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      local.startingWeightKg = "Entre 30 y 300";
    }

    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setSaving(true);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        age: Number(form.age),
        heightCm: Number(form.heightCm),
        startingWeightKg: Number(form.startingWeightKg),
        goal: form.goal,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      toast({ kind: "success", message: "Perfil actualizado" });
      router.refresh();
    } else {
      setErrors(data.fields ?? {});
      toast({ kind: "error", message: data.error ?? "No se pudo guardar" });
    }

    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="p-name">
          Nombre
        </label>
        <input
          id="p-name"
          className="input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          autoComplete="name"
        />
        {errors.name && <FieldError message={errors.name} />}
      </div>

      <div>
        <label className="label" htmlFor="p-email">
          Email de acceso
        </label>
        <input
          id="p-email"
          type="email"
          className="input"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          autoComplete="email"
        />
        {errors.email && <FieldError message={errors.email} />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="p-age">
            Edad
          </label>
          <input
            id="p-age"
            type="number"
            inputMode="numeric"
            className="input"
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
          />
          {errors.age && <FieldError message={errors.age} />}
        </div>

        <div>
          <label className="label" htmlFor="p-height">
            Altura cm
          </label>
          <input
            id="p-height"
            type="number"
            inputMode="numeric"
            className="input"
            value={form.heightCm}
            onChange={(e) => set("heightCm", e.target.value)}
          />
          {errors.heightCm && <FieldError message={errors.heightCm} />}
        </div>

        <div>
          <label className="label" htmlFor="p-weight">
            Peso kg
          </label>
          <input
            id="p-weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            className="input"
            value={form.startingWeightKg}
            onChange={(e) => set("startingWeightKg", e.target.value)}
          />
          {errors.startingWeightKg && <FieldError message={errors.startingWeightKg} />}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="p-goal">
          Objetivo
        </label>
        <select
          id="p-goal"
          className="input"
          value={form.goal}
          onChange={(e) => set("goal", e.target.value)}
        >
          <option value="gain_muscle">Ganar masa muscular</option>
          <option value="recomp">Recomposición corporal</option>
          <option value="lose_fat">Perder grasa</option>
          <option value="health">Salud general</option>
        </select>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        <Icon name="save" size={16} />
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

/** Mensaje de error bajo un campo, con icono para no depender sólo del color. */
function FieldError({ message }: { message: string }) {
  return (
    <p
      className="flex items-center gap-1 text-xs mt-1"
      style={{ color: "#fca5a5" }}
      role="alert"
    >
      <Icon name="alertCircle" size={13} />
      {message}
    </p>
  );
}
