import type { AssignmentStatus, PostStatus } from "@/lib/types";
import { assignmentStatusMeta, postStatusMeta } from "@/lib/status";

export function AssignmentBadge({ status }: { status: AssignmentStatus }) {
  const m = assignmentStatusMeta(status);
  return (
    <span className="badge" style={{ backgroundColor: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}

export function PostBadge({ status }: { status: PostStatus }) {
  const m = postStatusMeta(status);
  return (
    <span className="badge" style={{ backgroundColor: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}
