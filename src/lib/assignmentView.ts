import type {
  Assignment,
  AssignmentStatus,
  Platform,
  TaskCompletion,
} from "./types";

export interface PlatformState {
  required: boolean;
  linkOpenedAt: string | null;
  completedAt: string | null;
  onTime: boolean | null;
}

export interface AssignmentView {
  platforms: Record<Platform, PlatformState>;
  /** Estado efectivo mostrado (deriva tiempo real para pendientes). */
  effectiveStatus: AssignmentStatus;
  /** ¿El botón de completar debe estar habilitado ahora? */
  isAvailable: boolean;
}

/**
 * Combina la asignación, las plataformas requeridas por la publicación y las
 * confirmaciones para calcular el estado efectivo en un instante dado.
 *
 * Reglas:
 *  - completed / completed_late / justified / in_review: se respetan tal cual.
 *  - Si no está completada y ya pasó el deadline -> missed.
 *  - Si llegó el horario asignado pero no el deadline -> available.
 *  - Antes del horario -> scheduled.
 */
export function buildAssignmentView(
  assignment: Assignment,
  post: { instagram_url: string | null; tiktok_url: string | null },
  completions: Pick<
    TaskCompletion,
    "platform" | "link_opened_at" | "completed_at" | "completion_status"
  >[],
  now: Date = new Date(),
): AssignmentView {
  const igReq = post.instagram_url != null;
  const ttReq = post.tiktok_url != null;

  const find = (p: Platform) => completions.find((c) => c.platform === p);
  const mk = (p: Platform, required: boolean): PlatformState => {
    const c = find(p);
    return {
      required,
      linkOpenedAt: c?.link_opened_at ?? null,
      completedAt: c?.completed_at ?? null,
      onTime: c ? (c.completion_status ? c.completion_status === "on_time" : null) : null,
    };
  };

  const platforms: Record<Platform, PlatformState> = {
    instagram: mk("instagram", igReq),
    tiktok: mk("tiktok", ttReq),
  };

  const assignedMs = new Date(assignment.assigned_datetime).getTime();
  const deadlineMs = new Date(assignment.deadline_datetime).getTime();
  const nowMs = now.getTime();
  const isAvailable = nowMs >= assignedMs && nowMs <= deadlineMs;

  // Estados terminales guardados en BD.
  if (
    assignment.status === "completed" ||
    assignment.status === "completed_late" ||
    assignment.status === "justified" ||
    assignment.status === "in_review"
  ) {
    return { platforms, effectiveStatus: assignment.status, isAvailable: false };
  }

  const allDone =
    (!igReq || platforms.instagram.completedAt) &&
    (!ttReq || platforms.tiktok.completedAt);
  if (allDone) {
    const anyLate =
      platforms.instagram.onTime === false || platforms.tiktok.onTime === false;
    return {
      platforms,
      effectiveStatus: anyLate ? "completed_late" : "completed",
      isAvailable: false,
    };
  }

  let effectiveStatus: AssignmentStatus;
  if (nowMs > deadlineMs) effectiveStatus = "missed";
  else if (nowMs >= assignedMs) effectiveStatus = "available";
  else effectiveStatus = "scheduled";

  return { platforms, effectiveStatus, isAvailable };
}
