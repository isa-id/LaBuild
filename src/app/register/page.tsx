"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      password: form.password,
    };
    if (form.age) payload.age = form.age;
    if (form.heightCm) payload.heightCm = form.heightCm;
    if (form.startingWeightKg) payload.startingWeightKg = form.startingWeightKg;

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
          <div className="text-4xl mb-2">🔥</div>
          <h1 className="text-2xl font-bold tracking-tight">Crea tu cuenta</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Empieza tu racha hoy
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="age">
                Edad
              </label>
              <input
                id="age"
                type="number"
                className="input"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="19"
              />
            </div>
            <div>
              <label className="label" htmlFor="heightCm">
                Altura cm
              </label>
              <input
                id="heightCm"
                type="number"
                className="input"
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                placeholder="175"
              />
            </div>
            <div>
              <label className="label" htmlFor="startingWeightKg">
                Peso kg
              </label>
              <input
                id="startingWeightKg"
                type="number"
                step="0.1"
                className="input"
                value={form.startingWeightKg}
                onChange={(e) => set("startingWeightKg", e.target.value)}
                placeholder="50"
              />
            </div>
          </div>

          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{ background: "#2a1417", color: "#fca5a5" }}
            >
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