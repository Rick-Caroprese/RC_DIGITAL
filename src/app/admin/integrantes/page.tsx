import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import MemberForm from "./MemberForm";
import StatusToggle from "./StatusToggle";

export default async function IntegrantesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  const profiles = (data ?? []) as Profile[];

  // Conteo de cuentas activas por integrante.
  const { data: accs } = await supabase
    .from("member_accounts")
    .select("user_id, active");
  const accCount = new Map<string, number>();
  for (const a of accs ?? []) {
    if (a.active) accCount.set(a.user_id, (accCount.get(a.user_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Integrantes</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {profiles.filter((p) => p.status === "active").length} activos de {profiles.length}
        </p>
      </div>

      <MemberForm />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--surface-2)" }}>
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold">Correo</th>
                <th className="px-4 py-3 text-left font-semibold">Rol</th>
                <th className="px-4 py-3 text-left font-semibold">Cuentas</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{p.email}</td>
                  <td className="px-4 py-3">{p.role === "admin" ? "Admin" : "Integrante"}</td>
                  <td className="px-4 py-3">
                    {p.role === "member" ? (
                      <Link
                        href={`/admin/integrantes/${p.id}`}
                        className="font-medium underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {accCount.get(p.id) ?? 0} cuentas
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: p.status === "active" ? "var(--ok-bg)" : "var(--danger-bg)",
                        color: p.status === "active" ? "var(--ok)" : "var(--danger)",
                      }}
                    >
                      {p.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusToggle userId={p.id} active={p.status === "active"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
