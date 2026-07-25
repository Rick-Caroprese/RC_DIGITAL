import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import {
  MEMBER_ASSIGNMENT_SELECT,
  toTaskCardData,
  type MemberAssignmentRow,
} from "@/lib/memberData";
import TaskCard from "@/components/TaskCard";
import { AssignmentBadge } from "@/components/StatusBadge";
import { formatDateTimeBogota } from "@/lib/datetime";

export default async function MemberTasks() {
  const profile = await requireMember();
  const supabase = await createClient();

  const { data } = await supabase
    .from("assignments")
    .select(MEMBER_ASSIGNMENT_SELECT)
    .eq("user_id", profile.id)
    .order("assigned_datetime", { ascending: false });

  const rows = (data ?? []) as MemberAssignmentRow[];
  const now = new Date();
  const cards = rows.map((r) => toTaskCardData(r, now));

  const pending = cards.filter((c) =>
    ["scheduled", "available"].includes(c.effectiveStatus),
  );
  const completed = cards.filter((c) =>
    ["completed", "completed_late", "justified"].includes(c.effectiveStatus),
  );
  const overdue = cards.filter((c) => c.effectiveStatus === "missed");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Mis tareas</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">Pendientes ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin pendientes.</p>
        ) : (
          pending.map((c) => <TaskCard key={c.assignmentId} data={c} />)
        )}
      </section>

      <CompactList title={`Vencidas (${overdue.length})`} cards={overdue} />
      <CompactList title={`Completadas (${completed.length})`} cards={completed} />
    </div>
  );
}

function CompactList({
  title,
  cards,
}: {
  title: string;
  cards: ReturnType<typeof toTaskCardData>[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {cards.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nada por aquí.</p>
      ) : (
        cards.map((c) => (
          <div key={c.assignmentId} className="card flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatDateTimeBogota(c.assignedIso)}
              </p>
            </div>
            <AssignmentBadge status={c.effectiveStatus} />
          </div>
        ))
      )}
    </section>
  );
}
