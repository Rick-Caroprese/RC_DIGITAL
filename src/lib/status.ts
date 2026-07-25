import type { AssignmentStatus, PostStatus } from "./types";

interface StatusMeta {
  label: string;
  bg: string; // color de fondo del badge (token CSS, sensible al tema)
  fg: string; // color del texto del badge
}

// Colores de estado: verde=completada, amarillo=pendiente, rojo=vencida,
// gris=programada, azul=justificada. Usan tokens CSS de globals.css.
export const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, StatusMeta> = {
  scheduled: { label: "Programada", bg: "var(--neutral-bg)", fg: "var(--neutral)" },
  available: { label: "Disponible", bg: "var(--warn-bg)", fg: "var(--warn)" },
  completed: { label: "Completada", bg: "var(--ok-bg)", fg: "var(--ok)" },
  completed_late: { label: "Fuera de tiempo", bg: "var(--warn-bg)", fg: "var(--warn)" },
  missed: { label: "Vencida", bg: "var(--danger-bg)", fg: "var(--danger)" },
  justified: { label: "Justificada", bg: "var(--info-bg)", fg: "var(--info)" },
  in_review: { label: "En revisión", bg: "var(--info-bg)", fg: "var(--info)" },
};

export const POST_STATUS_META: Record<PostStatus, StatusMeta> = {
  draft: { label: "Borrador", bg: "var(--neutral-bg)", fg: "var(--neutral)" },
  scheduled: { label: "Programada", bg: "var(--info-bg)", fg: "var(--info)" },
  active: { label: "Activa", bg: "var(--ok-bg)", fg: "var(--ok)" },
  finished: { label: "Finalizada", bg: "var(--neutral-bg)", fg: "var(--neutral)" },
};

export function assignmentStatusMeta(s: AssignmentStatus): StatusMeta {
  return ASSIGNMENT_STATUS_META[s];
}

export function postStatusMeta(s: PostStatus): StatusMeta {
  return POST_STATUS_META[s];
}
