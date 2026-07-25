import type { Assignment, Post, TaskCompletion } from "./types";
import { buildAssignmentView } from "./assignmentView";

export type WeeklyRow = Assignment & {
  profiles: { full_name: string; email: string } | null;
  posts: Pick<Post, "instagram_url" | "tiktok_url"> | null;
  task_completions: Pick<
    TaskCompletion,
    "platform" | "link_opened_at" | "completed_at" | "completion_status"
  >[];
};

export interface WeeklyStat {
  userId: string;
  fullName: string;
  assigned: number;
  igAssigned: number;
  ttAssigned: number;
  completed: number; // completadas (a tiempo o tarde)
  onTime: number;
  overdue: number; // vencidas
  justified: number;
  compliancePct: number;
}

/**
 * Calcula el cumplimiento por integrante a partir de las asignaciones de la
 * semana. Las ausencias justificadas se excluyen del denominador (no penalizan).
 * Cumplimiento = completadas / (asignadas - justificadas).
 */
export function computeWeekly(rows: WeeklyRow[], now: Date = new Date()): WeeklyStat[] {
  const byUser = new Map<string, WeeklyStat>();

  for (const r of rows) {
    const key = r.user_id;
    if (!byUser.has(key)) {
      byUser.set(key, {
        userId: key,
        fullName: r.profiles?.full_name || r.profiles?.email || "—",
        assigned: 0,
        igAssigned: 0,
        ttAssigned: 0,
        completed: 0,
        onTime: 0,
        overdue: 0,
        justified: 0,
        compliancePct: 0,
      });
    }
    const s = byUser.get(key)!;
    const post = r.posts ?? { instagram_url: null, tiktok_url: null };
    const view = buildAssignmentView(r, post, r.task_completions, now);

    s.assigned += 1;
    if (post.instagram_url) s.igAssigned += 1;
    if (post.tiktok_url) s.ttAssigned += 1;

    switch (view.effectiveStatus) {
      case "completed":
        s.completed += 1;
        s.onTime += 1;
        break;
      case "completed_late":
        s.completed += 1;
        break;
      case "missed":
        s.overdue += 1;
        break;
      case "justified":
        s.justified += 1;
        break;
    }
  }

  const out = [...byUser.values()];
  for (const s of out) {
    const denom = s.assigned - s.justified;
    s.compliancePct = denom > 0 ? Math.round((s.completed / denom) * 100) : 100;
  }
  out.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return out;
}
