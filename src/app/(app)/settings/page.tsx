import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Icon, type IconName } from "@/components/icons";
import ProfileForm from "./ProfileForm";
import AvatarUpload from "./AvatarUpload";
import PasswordForm from "./PasswordForm";
import DangerZone from "./DangerZone";

export const dynamic = "force-dynamic";

/** Secciones de configuración. El id se usa como ancla en la navegación. */
const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "perfil", label: "Perfil", icon: "user" },
  { id: "foto", label: "Foto", icon: "camera" },
  { id: "contrasena", label: "Contraseña", icon: "key" },
  { id: "zona-peligrosa", label: "Zona peligrosa", icon: "warning" },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="settings" size={24} style={{ color: "var(--accent)" }} />
          Configuración
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Gestiona tu cuenta y tus datos.
        </p>
      </header>

      {/* Navegación entre secciones (anclas) */}
      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="chip"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            <Icon name={s.icon} size={13} />
            {s.label}
          </a>
        ))}
      </nav>

      <Section id="perfil" title="Información de la cuenta" icon="user">
        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            age: user.age,
            heightCm: user.heightCm,
            startingWeightKg: Number(user.startingWeightKg),
            goal: user.goal,
          }}
        />
      </Section>

      <Section id="foto" title="Foto de perfil" icon="camera">
        <AvatarUpload initial={user.avatarDataUrl} />
      </Section>

      <Section id="contrasena" title="Cambiar contraseña" icon="key">
        <PasswordForm />
      </Section>

      <section id="zona-peligrosa" className="card p-5 scroll-mt-20" style={{ borderColor: "#5b2020" }}>
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <Icon name="warning" size={18} style={{ color: "var(--danger)" }} />
          Zona peligrosa
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          Estas acciones son definitivas.
        </p>
        <DangerZone userName={user.name} />
      </section>
    </div>
  );
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card p-5 scroll-mt-20">
      <h2 className="font-bold mb-4 flex items-center gap-2">
        <Icon name={icon} size={18} style={{ color: "var(--accent)" }} />
        {title}
      </h2>
      {children}
    </section>
  );
}
