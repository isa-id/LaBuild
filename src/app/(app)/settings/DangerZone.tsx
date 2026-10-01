"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";

export default function DangerZone({ userName }: { userName: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password) {
      setErrors({ password: "Ingresa tu contraseña" });
      return;
    }

    setErrors({});
    setBusy(true);

    const res = await fetch("/api/settings/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirm }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      toast({ kind: "success", message: "Cuenta eliminada" });
      router.push("/register");
      router.refresh();
      return;
    }

    setErrors(data.fields ?? { form: data.error ?? "No se pudo eliminar la cuenta" });
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <button type="button" className="btn btn-danger text-sm" onClick={() => setOpen(true)}>
          <Icon name="trash" size={16} />
          Borrar mi cuenta
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <div
            className="p-3 rounded-lg text-sm flex gap-2"
            style={{ background: "#241416", color: "#fca5a5" }}
          >
            <Icon name="warning" size={18} className="shrink-0 mt-0.5" />
            <span>
              Se borrará la cuenta de <strong>{userName}</strong> y todo su historial:
              entrenamientos, comidas, peso, rachas, penitencias y logros. No se puede
              deshacer.
            </span>
          </div>

          <div>
            <label className="label" htmlFor="del-pw">
              Tu contraseña
            </label>
            <input
              id="del-pw"
              type="password"
              className="input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((x) => ({ ...x, password: undefined }));
              }}
              autoComplete="current-password"
            />
            {errors.password && <Error message={errors.password} />}
          </div>

          <div>
            <label className="label" htmlFor="del-confirm">
              Escribe BORRAR para confirmar
            </label>
            <input
              id="del-confirm"
              className="input"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setErrors((x) => ({ ...x, confirm: undefined }));
              }}
              placeholder="BORRAR"
            />
            {errors.confirm && <Error message={errors.confirm} />}
          </div>

          {errors.form && <Error message={errors.form} />}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-danger text-sm" disabled={busy}>
              <Icon name="trash" size={16} />
              {busy ? "Borrando…" : "Sí, borrar definitivamente"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setConfirm("");
                setErrors({});
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
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
