"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generatePostSchedule } from "../../actions";

export default function GenerateButton({
  postId,
  hasAssignments,
}: {
  postId: string;
  hasAssignments: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (
      hasAssignments &&
      !confirm("Ya existen horarios. ¿Regenerar? Se reemplazarán los actuales.")
    ) {
      return;
    }
    setError(null);
    start(async () => {
      const res = await generatePostSchedule(postId);
      if (!res.ok) setError(res.error || "Error al generar.");
      else router.refresh();
    });
  }

  return (
    <div>
      <button onClick={run} disabled={pending} className="btn btn-primary !min-h-0 !px-4 !py-2 text-sm">
        {pending ? "Generando..." : hasAssignments ? "Regenerar horarios" : "Generar horarios"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
