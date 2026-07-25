import { createClient } from "@/lib/supabase/server";
import { bogotaWeekRange, formatDateBogota } from "@/lib/datetime";
import { computeWeekly, type WeeklyRow } from "@/lib/weekly";

export default async function CumplimientoPage() {
  const supabase = await createClient();
  const { start, end } = bogotaWeekRange();

  const { data } = await supabase
    .from("assignments")
    .select("*, profiles(full_name, email), posts(instagram_url, tiktok_url), task_completions(platform, link_opened_at, completed_at, completion_status)")
    .gte("assigned_datetime", start.toISOString())
    .lt("assigned_datetime", end.toISOString());

  const stats = computeWeekly((data ?? []) as WeeklyRow[]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Cumplimiento semanal</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {formatDateBogota(start)} – {formatDateBogota(new Date(end.getTime() - 86400000))}
          </p>
        </div>
        <a href="/admin/cumplimiento/export" className="btn btn-primary !min-h-0 !px-4 !py-2 text-sm">
          Exportar CSV
        </a>
      </div>

      {stats.length === 0 ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          No hay datos de asignaciones esta semana.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--surface-2)" }}>
                  <th className="px-3 py-3 text-left font-semibold">Integrante</th>
                  <th className="px-3 py-3 text-right font-semibold">Asignadas</th>
                  <th className="px-3 py-3 text-right font-semibold">IG</th>
                  <th className="px-3 py-3 text-right font-semibold">TikTok</th>
                  <th className="px-3 py-3 text-right font-semibold">Completadas</th>
                  <th className="px-3 py-3 text-right font-semibold">A tiempo</th>
                  <th className="px-3 py-3 text-right font-semibold">Vencidas</th>
                  <th className="px-3 py-3 text-right font-semibold">Justif.</th>
                  <th className="px-3 py-3 text-right font-semibold">Cumpl.</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-3 font-medium">{s.fullName}</td>
                    <td className="px-3 py-3 text-right">{s.assigned}</td>
                    <td className="px-3 py-3 text-right">{s.igAssigned}</td>
                    <td className="px-3 py-3 text-right">{s.ttAssigned}</td>
                    <td className="px-3 py-3 text-right">{s.completed}</td>
                    <td className="px-3 py-3 text-right">{s.onTime}</td>
                    <td className="px-3 py-3 text-right">{s.overdue}</td>
                    <td className="px-3 py-3 text-right">{s.justified}</td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: "var(--primary)" }}>
                      {s.compliancePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        El cumplimiento excluye las ausencias justificadas del total. Útil para
        organizar los pagos semanales (la app no gestiona pagos en esta versión).
      </p>
    </div>
  );
}
