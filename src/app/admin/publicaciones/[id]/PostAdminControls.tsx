"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePost, updatePostStatus } from "../../actions";
import type { PostStatus } from "@/lib/types";

export default function PostAdminControls({
  postId,
  status,
}: {
  postId: string;
  status: PostStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: PostStatus) {
    setError(null);
    start(async () => {
      const res = await updatePostStatus(postId, next);
      if (!res.ok) setError(res.error || "Error");
      else router.refresh();
    });
  }

  function remove() {
    if (!confirm("¿Eliminar esta publicación? Se borrarán también sus horarios y confirmaciones. Esta acción no se puede deshacer.")) return;
    setError(null);
    start(async () => {
      const res = await deletePost(postId);
      if (!res.ok) setError(res.error || "Error");
      else router.push("/admin/publicaciones");
    });
  }

  const paused = status === "draft";
  const finished = status === "finished";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/publicaciones/${postId}/editar`}
          className="btn btn-secondary !min-h-0 !px-3 !py-2 text-sm"
        >
          ✏️ Editar
        </Link>

        {paused || finished ? (
          <button
            onClick={() => setStatus("active")}
            disabled={pending}
            className="btn btn-secondary !min-h-0 !px-3 !py-2 text-sm"
          >
            ▶️ Reanudar
          </button>
        ) : (
          <button
            onClick={() => setStatus("draft")}
            disabled={pending}
            className="btn btn-secondary !min-h-0 !px-3 !py-2 text-sm"
          >
            ⏸️ Pausar
          </button>
        )}

        {!finished && (
          <button
            onClick={() => setStatus("finished")}
            disabled={pending}
            className="btn btn-secondary !min-h-0 !px-3 !py-2 text-sm"
          >
            ✓ Finalizar
          </button>
        )}

        <button
          onClick={remove}
          disabled={pending}
          className="btn btn-danger !min-h-0 !px-3 !py-2 text-sm"
        >
          🗑️ Eliminar
        </button>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      {paused && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          En pausa: los integrantes no ven esta publicación ni sus tareas.
        </p>
      )}
    </div>
  );
}
