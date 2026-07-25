import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { formatDateBogota } from "@/lib/datetime";
import MemberForm from "./MemberForm";
import StatusToggle from "./StatusToggle";

export default async function IntegrantesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  const profiles = (data ?? []) as Profile[];

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
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Creado</th>
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
                    <span
                      className="badge"
                      style={{
                        backgroundColor: p.status === "active" ? "#dcfce7" : "#fee2e2",
                        color: p.status === "active" ? "#166534" : "#991b1b",
                      }}
                    >
                      {p.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {formatDateBogota(p.created_at)}
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
