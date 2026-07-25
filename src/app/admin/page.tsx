import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bogotaDayKey, bogotaWeekRange, formatDateTimeBogota } from "@/lib/datetime";
import { buildAssignmentView } from "@/lib/assignmentView";
import { computeWeekly, type WeeklyRow } from "@/lib/weekly";
import type { Post } from "@/lib/types";

export default async function AdminHome() {
  const supabase = await createClient();
  const now = new Date();

  // Rango de hoy (Bogotá)
  const todayKey = bogotaDayKey(now);
  const todayStart = `${todayKey}T05:00:00.000Z`;
  const todayEnd = new Date(new Date(todayStart).getTime() + 86_400_000).toISOString();
  const { start: weekStart, end: weekEnd } = bogotaWeekRange(now);

  const [
    { count: activePosts },
    { count: activeMembers },
    { data: nextPostData },
    { data: todayRows },
    { data: weekRows },
  ] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member").eq("status", "active"),
    supabase.from("posts").select("*").gt("publication_datetime", now.toISOString()).order("publication_datetime", { ascending: true }).limit(1),
    supabase
      .from("assignments")
      .select("*, posts(instagram_url, tiktok_url, status), task_completions(platform, link_opened_at, completed_at, completion_status)")
      .gte("assigned_datetime", todayStart)
      .lt("assigned_datetime", todayEnd),
    supabase
      .from("assignments")
      .select("*, profiles(full_name, email), posts(instagram_url, tiktok_url, status), task_completions(platform, link_opened_at, completed_at, completion_status)")
      .gte("assigned_datetime", weekStart.toISOString())
      .lt("assigned_datetime", weekEnd.toISOString()),
  ]);

  let pendingToday = 0;
  let overdueToday = 0;
  for (const r of (todayRows ?? []) as WeeklyRow[]) {
    if (r.posts?.status === "draft") continue; // pausadas no cuentan
    const v = buildAssignmentView(r, r.posts ?? { instagram_url: null, tiktok_url: null }, r.task_completions, now);
    if (v.effectiveStatus === "available" || v.effectiveStatus === "scheduled") pendingToday++;
    if (v.effectiveStatus === "missed") overdueToday++;
  }

  const stats = computeWeekly((weekRows ?? []) as WeeklyRow[], now);
  const totalAssigned = stats.reduce((a, s) => a + (s.assigned - s.justified), 0);
  const totalCompleted = stats.reduce((a, s) => a + s.completed, 0);
  const teamPct = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

  const nextPost = (nextPostData?.[0] as Post | undefined) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Panel</h1>
          <p className="text-sm muted">Resumen del equipo · hoy</p>
        </div>
        <Link href="/admin/publicaciones/nueva" className="btn btn-primary !min-h-0 !px-4 !py-2.5 text-sm">
          + Nueva publicación
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric label="Publicaciones activas" value={activePosts ?? 0} icon="📣" />
        <Metric label="Pendientes hoy" value={pendingToday} accent="var(--warn)" icon="⏳" />
        <Metric label="Vencidas hoy" value={overdueToday} accent="var(--danger)" icon="⚠️" />
        <Metric label="Cumplimiento equipo" value={`${teamPct}%`} accent="var(--primary)" icon="📊" />
        <Metric label="Integrantes activos" value={activeMembers ?? 0} icon="👥" />
      </div>

      <div className="card card-hover p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">🗓️</span>
          <h2 className="font-bold">Próxima publicación</h2>
        </div>
        {nextPost ? (
          <Link href={`/admin/publicaciones/${nextPost.id}`} className="block">
            <p className="text-lg font-semibold" style={{ color: "var(--primary)" }}>{nextPost.title}</p>
            <p className="text-sm muted">{formatDateTimeBogota(nextPost.publication_datetime)}</p>
          </Link>
        ) : (
          <p className="text-sm muted">No hay publicaciones programadas.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/cumplimiento" className="btn btn-secondary text-sm">📈 Cumplimiento semanal</Link>
        <Link href="/admin/integrantes" className="btn btn-secondary text-sm">👥 Gestionar integrantes</Link>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent?: string;
  icon?: string;
}) {
  return (
    <div className="card card-hover relative overflow-hidden p-4">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent || "var(--border-strong)" }}
      />
      <div className="mb-1 flex items-center justify-between">
        <span className="text-lg opacity-80">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color: accent || "var(--text)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs muted">{label}</p>
    </div>
  );
}
