import { requireAdmin } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";

const NAV = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/publicaciones", label: "Publicaciones" },
  { href: "/admin/integrantes", label: "Integrantes" },
  { href: "/admin/cumplimiento", label: "Cumplimiento" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <AppHeader profile={profile} nav={NAV} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
