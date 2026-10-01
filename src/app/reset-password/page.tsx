"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const local: Record<string, string> = {};
    if (form.password.length < 8) local.password = "Mínimo 8 caracteres";
    if (form.password !== form.confirm) local.confirm = "Las contraseñas no coinciden";

    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: form.password }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setDone(true);
      return;
    }

    setError(data.error ?? "No se pudo restablecer la contraseña");
    setLoading(false);
  }

  if (!token) {
    return (
      <Shell>
        <Icon name="warning" size={40} className="mx-auto mb-3" style={{ color: "var(--warning)" }} />
        <h1 className="text-2xl font-bold">Enlace incompleto</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Este enlace no incluye el código de seguridad. Solicita uno nuevo desde el inicio de
          sesión.
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Icon name="checkCircle" size={40} className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
        <h1 className="text-2xl font-bold">Contraseña actualizada</h1>
        <p className="text-sm mt-2 mb-5" style={{ color: "var(--muted)" }}>
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Link href="/login" className="btn btn-primary w-full">
          Ir a iniciar sesión
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        El enlace es de un solo uso y expira en 1 hora.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="rp-pass">
            Nueva contraseña
          </label>
          <input
            id="rp-pass"
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => {
              setForm((f) => ({ ...f, password: e.target.value }));
              setErrors((x) => ({ ...x, password: undefined }));
            }}
            autoComplete="new-password"
            style={errors.password ? { borderColor: "#7f2b2b" } : undefined}
          />
          {errors.password && <FieldError message={errors.password} />}
        </div>

        <div>
          <label className="label" htmlFor="rp-confirm">
            Repite la contraseña
          </label>
          <input
            id="rp-confirm"
            type="password"
            className="input"
            value={form.confirm}
            onChange={(e) => {
              setForm((f) => ({ ...f, confirm: e.target.value }));
              setErrors((x) => ({ ...x, confirm: undefined }));
            }}
            autoComplete="new-password"
            style={errors.confirm ? { borderColor: "#7f2b2b" } : undefined}
          />
          {errors.confirm && <FieldError message={errors.confirm} />}
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
          <Icon name="key" size={16} />
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(1000px 500px at 50% -10%, #16202c 0%, #0b0f14 60%)",
      }}
    >
      <div className="w-full max-w-sm text-center">
        <Icon
          name="dumbbell"
          size={30}
          strokeWidth={2.2}
          className="mx-auto mb-4"
          style={{ color: "var(--accent)" }}
        />
        {children}
      </div>
    </main>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-[11px] mt-1" style={{ color: "#fca5a5" }} role="alert">
      {message}
    </p>
  );
}