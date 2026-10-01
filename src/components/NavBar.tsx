"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Hoy", icon: "home" },
  { href: "/week", label: "Semana", icon: "calendar" },
  { href: "/nutrition", label: "Nutrición", icon: "salad" },
  { href: "/progress", label: "Progreso", icon: "trend" },
  { href: "/penalties", label: "Penitencias", icon: "scale" },
  { href: "/settings", label: "Configuración", icon: "settings" },
];

export default function NavBar({
  points,
  level,
  name,
  avatarDataUrl,
}: {
  points: number;
  level: number;
  name: string;
  avatarDataUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Iniciales para el avatar cuando no hay foto.
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const brand = (
    <span className="flex items-center gap-2">
      <Icon name="dumbbell" size={20} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
      LaBuild
    </span>
  );

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
        <Link href="/dashboard" className="tap font-bold tracking-tight">
          {brand}
        </Link>

        <div className="flex items-center gap-2">
          <span className="chip" style={{ background: "#1d2a1f", color: "#4ade80" }}>
            Nv. {level} · {points}
          </span>
          <Link
            href="/settings"
            className="tap flex items-center justify-center rounded-full overflow-hidden"
            style={{ width: 36, height: 36, background: "var(--surface-2)" }}
            aria-label="Configuración"
          >
            <Avatar src={avatarDataUrl} initials={initials} size={36} />
          </Link>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col p-5"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <Link href="/dashboard" className="tap text-lg font-bold tracking-tight mb-8">
          {brand}
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
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  name={l.icon}
                  size={18}
                  style={{ color: active ? "var(--accent)" : "inherit" }}
                />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/settings"
          className="card tap flex items-center gap-3 p-3 mb-3"
          style={{ textDecoration: "none" }}
        >
          <Avatar src={avatarDataUrl} initials={initials} size={36} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
              Nivel {level} · {points} pts
            </div>
          </div>
        </Link>

        <button onClick={logout} className="btn btn-ghost w-full text-sm">
          <Icon name="logout" size={16} />
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
              aria-current={active ? "page" : undefined}
            >
              <Icon name={l.icon} size={20} strokeWidth={active ? 2.4 : 2} />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Avatar: foto si existe, iniciales si no. */
function Avatar({
  src,
  initials,
  size,
}: {
  src: string | null;
  initials: string;
  size: number;
}) {
  if (src) {
    // La foto es un data URL generado por el usuario (ver validación).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="object-cover w-full h-full" />;
  }

  return (
    <span
      className="flex items-center justify-center font-bold w-full h-full"
      style={{ background: "var(--surface-2)", color: "var(--accent)", fontSize: size * 0.4 }}
    >
      {initials || <Icon name="user" size={size * 0.5} />}
    </span>
  );
}
