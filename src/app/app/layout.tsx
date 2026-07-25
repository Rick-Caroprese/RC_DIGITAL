import { requireMember } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";

const NAV = [
  { href: "/app", label: "Hoy" },
  { href: "/app/tareas", label: "Mis tareas" },
  { href: "/app/cumplimiento", label: "Mi cumplimiento" },
  { href: "/app/notificaciones", label: "Avisos" },
];

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireMember();
  return (
    <div className="min-h-dvh">
      <AppHeader profile={profile} nav={NAV} />
      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>
    </div>
  );
}
