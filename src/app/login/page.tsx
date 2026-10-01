"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(1000px 500px at 50% -10%, #16202c 0%, #0b0f14 60%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💪</div>
          <h1 className="text-2xl font-bold tracking-tight">LaBuild</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Tu rutina, tu racha, tu masa.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
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
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}