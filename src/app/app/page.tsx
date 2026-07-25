import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { bogotaDayKey } from "@/lib/datetime";
import {
  MEMBER_ASSIGNMENT_SELECT,
  toTaskCardData,
  type MemberAssignmentRow,
} from "@/lib/memberData";
import TaskCard from "@/components/TaskCard";

export default async function MemberToday() {
  const profile = await requireMember();
  const supabase = await createClient();

  // Rango de "hoy" en Bogotá (UTC-5): medianoche a medianoche.
  const todayKey = bogotaDayKey(new Date());
  const start = `${todayKey}T05:00:00.000Z`;
  const end = new Date(new Date(start).getTime() + 86_400_000).toISOString();

  const { data } = await supabase
    .from("assignments")
    .select(MEMBER_ASSIGNMENT_SELECT)
    .eq("user_id", profile.id)
    .gte("assigned_datetime", start)
    .lt("assigned_datetime", end)
    .order("assigned_datetime", { ascending: true });

  const rows = (data ?? []) as MemberAssignmentRow[];
  const now = new Date();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Hola, {profile.full_name.split(" ")[0] || "equipo"}</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Tus tareas de hoy
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          No tienes tareas asignadas para hoy. 🎉
        </div>
      ) : (
        rows.map((r) => <TaskCard key={r.id} data={toTaskCardData(r, now)} />)
      )}
    </div>
  );
}
