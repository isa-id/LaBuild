"use client";

import { useEffect, useState } from "react";

export type ToastMessage = {
  id: number;
  text: string;
  tone: "success" | "info" | "danger";
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function push(text: string, tone: ToastMessage["tone"] = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
  }

  return { toasts, push, setToasts };
}

export function Toaster({
  toasts,
  setToasts,
}: {
  toasts: ToastMessage[];
  setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>>;
}) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((all) => all.filter((x) => x.id !== t.id));
      }, 4200)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, setToasts]);

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)", left: "1rem", right: "1rem" }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card px-4 py-3 text-sm font-medium pointer-events-auto"
          style={{
            borderColor:
              t.tone === "success"
                ? "#2f6b3f"
                : t.tone === "danger"
                ? "#7f2b2b"
                : "var(--border)",
            background:
              t.tone === "success"
                ? "#12241a"
                : t.tone === "danger"
                ? "#241416"
                : "var(--surface)",
            animation: "slidein 0.25s ease",
          }}
        >
          {t.text}
        </div>
      ))}
      <style>{`@keyframes slidein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}