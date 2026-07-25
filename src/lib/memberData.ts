import type { Assignment, Post, TaskCompletion } from "./types";
import { buildAssignmentView } from "./assignmentView";
import type { TaskCardData } from "@/components/TaskCard";

export type MemberAssignmentRow = Assignment & {
  posts: Pick<
    Post,
    "title" | "description" | "requested_actions" | "instagram_url" | "tiktok_url"
  > | null;
  task_completions: Pick<
    TaskCompletion,
    "platform" | "link_opened_at" | "completed_at" | "completion_status"
  >[];
};

// Columnas que necesita la vista del integrante.
export const MEMBER_ASSIGNMENT_SELECT =
  "*, posts(title, description, requested_actions, instagram_url, tiktok_url), task_completions(platform, link_opened_at, completed_at, completion_status)";

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
  return {
    assignmentId: row.id,
    title: post.title,
    description: post.description,
    requestedActions: post.requested_actions ?? [],
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
