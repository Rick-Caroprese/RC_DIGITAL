import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Post, TaskCompletion } from "@/lib/types";
import {
  formatDateTimeBogota,
  formatTimeBogota,
  bogotaDateInput,
  bogotaTimeInput,
} from "@/lib/datetime";
import { buildAssignmentView } from "@/lib/assignmentView";
import { PostBadge, AssignmentBadge } from "@/components/StatusBadge";
import GenerateButton from "./GenerateButton";
import RowActions from "./RowActions";

type Row = Assignment & {
  profiles: { full_name: string; email: string } | null;
  task_completions: Pick<
    TaskCompletion,
    "platform" | "link_opened_at" | "completed_at" | "completion_status"
  >[];
};

function PlatformCell({ completedAt, onTime, required }: { completedAt: string | null; onTime: boolean | null; required: boolean }) {
  if (!required) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  if (!completedAt) return <span style={{ color: "var(--status-pending)" }}>Pendiente</span>;
  return (
    <span style={{ color: onTime === false ? "var(--status-late)" : "var(--status-done)" }}>
      {onTime === false ? "Tarde" : "Completado"}
    </span>
  );
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();
  if (!post) notFound();
  const p = post as Post;

  const { data: assignmentsData } = await supabase
    .from("assignments")
    .select("*, profiles(full_name, email), task_completions(platform, link_opened_at, completed_at, completion_status)")
    .eq("post_id", id)
    .order("rotation_position", { ascending: true });
  const rows = (assignmentsData ?? []) as Row[];

  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/publicaciones" className="text-sm underline" style={{ color: "var(--primary)" }}>
          ← Publicaciones
        </Link>
        <PostBadge status={p.status} />
      </div>

      <div className="card p-5">
        <h1 className="text-xl font-bold">{p.title}</h1>
        {p.description && <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{p.description}</p>}
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><b>Publicación:</b> {formatDateTimeBogota(p.publication_datetime)}</div>
          <div><b>Intervalo:</b> {p.interval_minutes} min · <b>Ventana:</b> {p.completion_window_minutes} min</div>
          {p.instagram_url && <div><b>Instagram:</b> <a className="underline" href={p.instagram_url} target="_blank" rel="noreferrer">enlace</a></div>}
          {p.tiktok_url && <div><b>TikTok:</b> <a className="underline" href={p.tiktok_url} target="_blank" rel="noreferrer">enlace</a></div>}
        </div>
        {p.requested_actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.requested_actions.map((a) => (
              <span key={a} className="badge" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>{a}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Horarios y cumplimiento</h2>
        <GenerateButton postId={p.id} hasAssignments={rows.length > 0} />
      </div>

      {rows.length === 0 ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          Aún no se han generado horarios. Pulsa «Generar horarios».
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--surface-2)" }}>
                  <th className="px-3 py-3 text-left font-semibold">Integrante</th>
                  <th className="px-3 py-3 text-left font-semibold">Horario</th>
                  <th className="px-3 py-3 text-left font-semibold">Instagram</th>
                  <th className="px-3 py-3 text-left font-semibold">TikTok</th>
                  <th className="px-3 py-3 text-left font-semibold">Estado</th>
                  <th className="px-3 py-3 text-left font-semibold">Notas</th>
                  <th className="px-3 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const view = buildAssignmentView(r, p, r.task_completions, now);
                  return (
                    <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-3 font-medium">{r.profiles?.full_name || r.profiles?.email || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{formatTimeBogota(r.assigned_datetime)}</td>
                      <td className="px-3 py-3"><PlatformCell {...view.platforms.instagram} /></td>
                      <td className="px-3 py-3"><PlatformCell {...view.platforms.tiktok} /></td>
                      <td className="px-3 py-3"><AssignmentBadge status={view.effectiveStatus} /></td>
                      <td className="px-3 py-3" style={{ color: "var(--text-muted)" }}>{r.admin_notes || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <RowActions
                          assignmentId={r.id}
                          defaultDate={bogotaDateInput(r.assigned_datetime)}
                          defaultTime={bogotaTimeInput(r.assigned_datetime)}
                          justified={r.justified}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
