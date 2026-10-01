"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Hoy", icon: "🏠" },
  { href: "/week", label: "Semana", icon: "📅" },
  { href: "/nutrition", label: "Nutrición", icon: "🥗" },
  { href: "/progress", label: "Progreso", icon: "📈" },
  { href: "/penalties", label: "Penitencias", icon: "⚖️" },
];

export default function NavBar({ points, level }: { points: number; level: number }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Barra superior (móvil) */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden"
        style={{
          background: "rgba(11,15,20,0.9)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/dashboard" className="font-bold tracking-tight">
          💪 LaBuild
        </Link>
        <div className="flex items-center gap-2">
          <span className="chip" style={{ background: "#1d2a1f", color: "#4ade80" }}>
            Nv. {level} · {points}
          </span>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col p-5"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <Link href="/dashboard" className="text-lg font-bold tracking-tight mb-8">
          💪 LaBuild
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className="tap flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--text)" : "var(--muted)",
                }}
              >
                <span>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="card p-3 mb-3">
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Nivel {level}
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
            {points} pts
          </div>
        </div>

        <button onClick={logout} className="btn btn-ghost w-full text-sm">
          Cerrar sesión
        </button>
      </aside>

      {/* Nav inferior (móvil) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex"
        style={{
          background: "rgba(19,26,35,0.97)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold"
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              <span className="text-lg leading-none">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}