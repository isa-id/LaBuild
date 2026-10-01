"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";

type Field = keyof typeof VALUES;

const VALUES = {
  name: "El nombre debe tener al menos 2 caracteres",
  email: "Email inválido",
  password: "La contraseña debe tener al menos 8 caracteres",
  age: "Ingresa tu edad (entre 13 y 100)",
  heightCm: "Ingresa tu altura en cm (entre 120 y 230)",
  startingWeightKg: "Ingresa tu peso en kg (entre 30 y 300)",
} as const;

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    heightCm: "",
    startingWeightKg: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  function set(key: Field, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (touched[key]) setErrors((e) => validate({ ...form, [key]: value }));
  }

  function blur(key: Field) {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validate(form));
  }

  /**
   * Valida en el cliente con los mismos rangos que el servidor.
   *
   * `noValidate` desactiva la validación nativa del navegador para que los
   * mensajes sean los nuestros y no aparezcan de golpe sólo al enviar.
   */
  function validate(values: typeof form): Partial<Record<Field, string>> {
    const out: Partial<Record<Field, string>> = {};

    if (!values.name.trim()) out.name = "Ingresa tu nombre";
    else if (values.name.trim().length < 2) out.name = VALUES.name;

    if (!values.email.trim()) out.email = "Ingresa tu email";
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) out.email = VALUES.email;

    if (!values.password) out.password = "Ingresa una contraseña";
    else if (values.password.length < 8) out.password = VALUES.password;

    const age = Number(values.age);
    if (!values.age) out.age = "Ingresa tu edad";
    else if (!Number.isInteger(age) || age < 13 || age > 100) out.age = VALUES.age;

    const height = Number(values.heightCm);
    if (!values.heightCm) out.heightCm = "Ingresa tu altura";
    else if (!Number.isInteger(height) || height < 120 || height > 230) {
      out.heightCm = VALUES.heightCm;
    }

    const weight = Number(values.startingWeightKg);
    if (!values.startingWeightKg) out.startingWeightKg = "Ingresa tu peso";
    else if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      out.startingWeightKg = VALUES.startingWeightKg;
    }

    return out;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const found = validate(form);
    setErrors(found);

    // No llames a la API si falta algo.
    if (Object.keys(found).length > 0) {
      setTouched({
        name: true,
        email: true,
        password: true,
        age: true,
        heightCm: true,
        startingWeightKg: true,
      });
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        age: Number(form.age),
        heightCm: Number(form.heightCm),
        startingWeightKg: Number(form.startingWeightKg),
      }),
    });

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la cuenta");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(1000px 500px at 50% -10%, #16202c 0%, #0b0f14 60%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Icon
            name="flame"
            size={38}
            strokeWidth={2}
            className="mb-2 inline-block"
            style={{ color: "var(--accent)" }}
          />
          <h1 className="text-2xl font-bold tracking-tight">Crea tu cuenta</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Empieza tu racha hoy
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4" noValidate>
          <Field
            id="name"
            label="Nombre"
            value={form.name}
            onChange={(v) => set("name", v)}
            onBlur={() => blur("name")}
            error={errors.name}
            autoComplete="name"
            placeholder="Tu nombre"
          />

          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            onBlur={() => blur("email")}
            error={errors.email}
            autoComplete="email"
            placeholder="tu@email.com"
          />

          <Field
            id="password"
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(v) => set("password", v)}
            onBlur={() => blur("password")}
            error={errors.password}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />

          <div className="grid grid-cols-3 gap-3">
            <Field
              id="age"
              label="Edad"
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(v) => set("age", v)}
              onBlur={() => blur("age")}
              error={errors.age}
              placeholder="19"
            />
            <Field
              id="heightCm"
              label="Altura cm"
              type="number"
              inputMode="numeric"
              value={form.heightCm}
              onChange={(v) => set("heightCm", v)}
              onBlur={() => blur("heightCm")}
              error={errors.heightCm}
              placeholder="175"
            />
            <Field
              id="startingWeightKg"
              label="Peso kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.startingWeightKg}
              onChange={(v) => set("startingWeightKg", v)}
              onBlur={() => blur("startingWeightKg")}
              error={errors.startingWeightKg}
              placeholder="50"
            />
          </div>

          {error && (
            <p
              className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-2"
              style={{ background: "#2a1417", color: "#fca5a5" }}
              role="alert"
            >
              <Icon name="alertCircle" size={15} />
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Creando…" : "Crear cuenta"}
          </button>

          <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

/** Campo con etiqueta, error y borde rojo cuando hay problema. */
function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  inputMode?: "numeric" | "decimal" | "text";
  autoComplete?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={rest.placeholder}
        autoComplete={rest.autoComplete}
        inputMode={rest.inputMode}
        step={rest.step}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        style={error ? { borderColor: "#7f2b2b" } : undefined}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="text-[11px] mt-1 leading-tight"
          style={{ color: "#fca5a5" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
