import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import PwaRegistrar from "@/components/PwaRegistrar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <NavBar points={user.points} level={user.level} />
      <main className="lg:pl-60 pb-28 lg:pb-10">
        <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      </main>
      <PwaRegistrar />
    </div>
  );
}