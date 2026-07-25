import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { bogotaWeekRange, formatDateBogota } from "@/lib/datetime";
import { computeWeekly, type WeeklyRow } from "@/lib/weekly";

export default async function MemberCompliance() {
  const profile = await requireMember();
  const supabase = await createClient();
  const { start, end } = bogotaWeekRange();

  const { data } = await supabase
    .from("assignments")
    .select("*, profiles(full_name, email), posts(instagram_url, tiktok_url), task_completions(platform, link_opened_at, completed_at, completion_status)")
    .eq("user_id", profile.id)
    .gte("assigned_datetime", start.toISOString())
    .lt("assigned_datetime", end.toISOString());

  const stats = computeWeekly((data ?? []) as WeeklyRow[]);
  const s = stats[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Mi cumplimiento</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Semana del {formatDateBogota(start)} al {formatDateBogota(new Date(end.getTime() - 86400000))}
        </p>
      </div>

      {!s ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          No tienes tareas esta semana.
        </div>
      ) : (
        <>
          <div className="card p-6 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cumplimiento semanal</p>
            <p className="text-5xl font-bold" style={{ color: "var(--primary)" }}>{s.compliancePct}%</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Asignadas" value={s.assigned} />
            <Stat label="Completadas" value={s.completed} />
            <Stat label="A tiempo" value={s.onTime} />
            <Stat label="Vencidas" value={s.overdue} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
