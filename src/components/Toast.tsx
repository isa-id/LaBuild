"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";

/** `danger` es alias de `error`, usado por los clientes que ya existían. */
export type ToastTone = "success" | "info" | "error" | "danger";

export type ToastMessage = {
  id: number;
  text: string;
  tone: ToastTone;
};

const TONE_STYLE: Record<ToastTone, { border: string; background: string; icon: IconName }> = {
  success: { border: "#2f6b3f", background: "#12241a", icon: "checkCircle" },
  info: { border: "var(--border)", background: "var(--surface)", icon: "info" },
  error: { border: "#7f2b2b", background: "#241416", icon: "alertCircle" },
  danger: { border: "#7f2b2b", background: "#241416", icon: "alertCircle" },
};

let counter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function push(text: string, tone: ToastTone = "info") {
    const id = ++counter;
    setToasts((t) => [...t, { id, text, tone }]);
  }

  return { toasts, push, setToasts };
}

/** Igual que `push`, pero acepta el objeto `{ kind, message }`. */
export type ToastInput = string | { kind: ToastTone; message: string };

/** Atajo: `const { toast } = useToast()`. */
export function useToast() {
  const { push } = useToasts();

  return {
    toast(input: ToastInput, tone: ToastTone = "info") {
      if (typeof input === "string") {
        push(input, tone);
        return;
      }
      push(input.message, input.kind);
    },
  };
}

export function Toaster({
  toasts,
  setToasts,
}: {
  toasts: ToastMessage[];
  setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>>;
}) {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    for (const t of toasts) {
      const id = window.setTimeout(() => {
        setToasts((all) => all.filter((x) => x.id !== t.id));
      }, 4200);
      timers.current.push(id);
    }

    // Limpia sólo los temporizadores creados en este efecto.
    const created = timers.current;
    return () => created.forEach(clearTimeout);
  }, [toasts, setToasts]);

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)", left: "1rem", right: "1rem" }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const tone = TONE_STYLE[t.tone];
        return (
          <div
            key={t.id}
            className="card flex items-center gap-2.5 px-4 py-3 text-sm font-medium pointer-events-auto"
            style={{
              borderColor: tone.border,
              background: tone.background,
              animation: "slidein 0.25s ease",
            }}
          >
            <Icon name={tone.icon} size={17} style={{ color: "var(--accent)" }} />
            <span className="flex-1">{t.text}</span>
          </div>
        );
      })}
      <style>{`@keyframes slidein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
