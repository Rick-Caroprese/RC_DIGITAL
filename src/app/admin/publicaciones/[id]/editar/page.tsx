import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
import { bogotaDateInput, bogotaTimeInput } from "@/lib/datetime";
import EditPostForm from "./EditPostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();
  if (!post) notFound();
  const p = post as Post;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Editar publicación</h1>
        <Link href={`/admin/publicaciones/${p.id}`} className="text-sm underline" style={{ color: "var(--primary)" }}>
          Volver
        </Link>
      </div>
      <EditPostForm
        post={p}
        defaultDate={bogotaDateInput(p.publication_datetime)}
        defaultTime={bogotaTimeInput(p.publication_datetime)}
      />
    </div>
  );
}
