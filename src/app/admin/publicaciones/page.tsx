import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
import { formatDateTimeBogota } from "@/lib/datetime";
import { PostBadge } from "@/components/StatusBadge";

export default async function PublicacionesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("publication_datetime", { ascending: false });
  const posts = (data ?? []) as Post[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Publicaciones</h1>
        <Link href="/admin/publicaciones/nueva" className="btn btn-primary !min-h-0 !px-4 !py-2 text-sm">
          + Nueva publicación
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          Aún no hay publicaciones. Crea la primera.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/admin/publicaciones/${p.id}`}
              className="card block p-4 transition-colors hover:brightness-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {formatDateTimeBogota(p.publication_datetime)} · intervalo {p.interval_minutes} min
                  </p>
                </div>
                <PostBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
