import type { Assignment, Post, TaskCompletion } from "./types";
import { buildAssignmentView } from "./assignmentView";
import type { TaskCardData } from "@/components/TaskCard";

export type MemberAssignmentRow = Assignment & {
  posts: Pick<
    Post,
    "title" | "description" | "requested_actions" | "instagram_url" | "tiktok_url" | "status"
  > | null;
  member_accounts: {
    label: string;
    instagram_handle: string | null;
    tiktok_handle: string | null;
  } | null;
  task_completions: Pick<
    TaskCompletion,
    "platform" | "link_opened_at" | "completed_at" | "completion_status"
  >[];
};

// Columnas que necesita la vista del integrante.
export const MEMBER_ASSIGNMENT_SELECT =
  "*, posts(title, description, requested_actions, instagram_url, tiktok_url, status), member_accounts(label, instagram_handle, tiktok_handle), task_completions(platform, link_opened_at, completed_at, completion_status)";

// Una publicación es visible para el integrante solo si está programada o activa.
// Pausada (borrador) o finalizada => se oculta.
export function isVisibleToMember(row: MemberAssignmentRow): boolean {
  const s = row.posts?.status;
  return s === "scheduled" || s === "active";
}

export function toTaskCardData(
  row: MemberAssignmentRow,
  now: Date = new Date(),
): TaskCardData {
  const post = row.posts ?? {
    title: "(sin publicación)",
    description: null,
    requested_actions: [],
    instagram_url: null,
    tiktok_url: null,
  };
  const view = buildAssignmentView(
    row,
    { instagram_url: post.instagram_url, tiktok_url: post.tiktok_url },
    row.task_completions,
    now,
  );
  const acc = row.member_accounts;
  return {
    assignmentId: row.id,
    title: post.title,
    description: post.description,
    requestedActions: post.requested_actions ?? [],
    accountLabel: acc?.label ?? null,
    accountInstagram: acc?.instagram_handle ?? null,
    accountTiktok: acc?.tiktok_handle ?? null,
    assignedIso: row.assigned_datetime,
    deadlineIso: row.deadline_datetime,
    effectiveStatus: view.effectiveStatus,
    isAvailable: view.isAvailable,
    platforms: {
      instagram: {
        required: view.platforms.instagram.required,
        url: post.instagram_url,
        completedAt: view.platforms.instagram.completedAt,
        onTime: view.platforms.instagram.onTime,
        linkOpenedAt: view.platforms.instagram.linkOpenedAt,
      },
      tiktok: {
        required: view.platforms.tiktok.required,
        url: post.tiktok_url,
        completedAt: view.platforms.tiktok.completedAt,
        onTime: view.platforms.tiktok.onTime,
        linkOpenedAt: view.platforms.tiktok.linkOpenedAt,
      },
    },
  };
}
