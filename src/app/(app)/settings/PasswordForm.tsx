"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";

export default function PasswordForm() {
  const { toast } = useToast();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const local: Partial<Record<string, string>> = {};
    if (!form.currentPassword) local.currentPassword = "Ingresa tu contraseña actual";
    if (form.newPassword.length < 8) local.newPassword = "Mínimo 8 caracteres";
    if (form.newPassword !== form.confirmPassword) {
      local.confirmPassword = "Las contraseñas no coinciden";
    }

    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setBusy(true);

    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ kind: "success", message: "Contraseña actualizada" });
    } else {
      setErrors(data.fields ?? {});
      toast({ kind: "error", message: data.error ?? "No se pudo cambiar la contraseña" });
    }

    setBusy(false);
  }

  const inputType = show ? "text" : "password";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="pw-current">
          Contraseña actual
        </label>
        <input
          id="pw-current"
          type={inputType}
          className="input"
          value={form.currentPassword}
          onChange={(e) => set("currentPassword", e.target.value)}
          autoComplete="current-password"
        />
        {errors.currentPassword && <Error message={errors.currentPassword} />}
      </div>

      <div>
        <label className="label" htmlFor="pw-new">
          Nueva contraseña
        </label>
        <input
          id="pw-new"
          type={inputType}
          className="input"
          value={form.newPassword}
          onChange={(e) => set("newPassword", e.target.value)}
          autoComplete="new-password"
        />
        {errors.newPassword && <Error message={errors.newPassword} />}
      </div>

      <div>
        <label className="label" htmlFor="pw-confirm">
          Repite la nueva contraseña
        </label>
        <input
          id="pw-confirm"
          type={inputType}
          className="input"
          value={form.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
          autoComplete="new-password"
        />
        {errors.confirmPassword && <Error message={errors.confirmPassword} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Icon name="key" size={16} />
          {busy ? "Cambiando…" : "Cambiar contraseña"}
        </button>

        <button type="button" className="btn btn-ghost" onClick={() => setShow((s) => !s)}>
          <Icon name={show ? "eyeOff" : "eye"} size={16} />
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </form>
  );
}

function Error({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs mt-1" style={{ color: "#fca5a5" }} role="alert">
      <Icon name="alertCircle" size={13} />
      {message}
    </p>
  );
}
