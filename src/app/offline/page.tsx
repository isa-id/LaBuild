"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(1000px 500px at 50% -10%, #16202c 0%, #0b0f14 60%)",
      }}
    >
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">📡</div>
        <h1 className="text-2xl font-bold">Sin conexión</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          No pudimos conectarnos al servidor. Revisa tu internet e inténtalo de nuevo.
        </p>
        <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
          Tus datos se guardan en el servidor, así que no se pierde nada mientras tanto.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <Link href="/dashboard" className="btn btn-primary">
            Reintentar
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-ghost"
          >
            Recargar
          </button>
        </div>
      </div>
    </main>
  );
}