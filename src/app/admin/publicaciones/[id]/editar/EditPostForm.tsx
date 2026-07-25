"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePost } from "../../../actions";
import SubmitButton from "@/components/SubmitButton";
import type { Post } from "@/lib/types";

const ACTION_OPTIONS = [
  "Ver el contenido completo",
  "Dar me gusta",
  "Guardar",
  "Compartir",
  "Comentar de acuerdo con el contenido",
];

export default function EditPostForm({
  post,
  defaultDate,
  defaultTime,
}: {
  post: Post;
  defaultDate: string; // YYYY-MM-DD (Bogotá)
  defaultTime: string; // HH:mm (Bogotá)
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    updatePost,
    null as { ok: boolean; error?: string; postId?: string } | null,
  );

  useEffect(() => {
    if (state?.ok && state.postId) {
      router.push(`/admin/publicaciones/${state.postId}`);
    }
  }, [state, router]);

  const actions = post.requested_actions ?? [];

  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="id" value={post.id} />

      {state?.error && (
        <p className="rounded-lg p-3 text-sm" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{state.error}</p>
      )}

      <div>
        <label className="label" htmlFor="title">Título interno</label>
        <input id="title" name="title" required className="input" defaultValue={post.title} />
      </div>

      <div>
        <label className="label" htmlFor="description">Descripción / instrucciones</label>
        <textarea id="description" name="description" rows={3} className="input" style={{ minHeight: 90 }} defaultValue={post.description ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="instagram_url">Enlace de Instagram</label>
          <input id="instagram_url" name="instagram_url" type="url" className="input" defaultValue={post.instagram_url ?? ""} placeholder="https://www.instagram.com/..." />
        </div>
        <div>
          <label className="label" htmlFor="tiktok_url">Enlace de TikTok</label>
          <input id="tiktok_url" name="tiktok_url" type="url" className="input" defaultValue={post.tiktok_url ?? ""} placeholder="https://www.tiktok.com/@..." />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Fecha de publicación</label>
          <input id="date" name="date" type="date" required className="input" defaultValue={defaultDate} />
        </div>
        <div>
          <label className="label" htmlFor="time">Hora de publicación</label>
          <input id="time" name="time" type="time" required className="input" defaultValue={defaultTime} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="total_window_minutes">Ventana total (cuánto dura todo)</label>
          <select id="total_window_minutes" name="total_window_minutes" className="input" defaultValue={post.total_window_minutes ?? 480}>
            <option value={60}>1 hora</option>
            <option value={120}>2 horas</option>
            <option value={180}>3 horas</option>
            <option value={240}>4 horas</option>
            <option value={360}>6 horas</option>
            <option value={480}>8 horas</option>
            <option value={600}>10 horas</option>
            <option value={720}>12 horas</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="completion_window_minutes">Margen por cuenta para completar (min)</label>
          <input id="completion_window_minutes" name="completion_window_minutes" type="number" min={1} required className="input" defaultValue={post.completion_window_minutes} />
        </div>
      </div>

      <div>
        <span className="label">Acciones solicitadas (solo instrucciones)</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTION_OPTIONS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requested_actions" value={a} className="h-4 w-4" defaultChecked={actions.includes(a)} />
              {a}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="status">Estado</label>
        <select id="status" name="status" className="input" defaultValue={post.status}>
          <option value="draft">Borrador (pausada)</option>
          <option value="scheduled">Programada</option>
          <option value="active">Activa</option>
          <option value="finished">Finalizada</option>
        </select>
      </div>

      <p className="rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
        Si cambias la fecha, el intervalo o la ventana, vuelve al detalle y pulsa
        «Regenerar horarios» para recalcular los turnos.
      </p>

      <SubmitButton pendingText="Guardando...">Guardar cambios</SubmitButton>
    </form>
  );
}
