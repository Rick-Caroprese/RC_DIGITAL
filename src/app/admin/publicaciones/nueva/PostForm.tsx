"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

const ACTION_OPTIONS = [
  "Ver el contenido completo",
  "Dar me gusta",
  "Guardar",
  "Compartir",
  "Comentar de acuerdo con el contenido",
];

export default function PostForm() {
  const router = useRouter();
  const [state, action] = useActionState(
    createPost,
    null as { ok: boolean; error?: string; postId?: string } | null,
  );

  useEffect(() => {
    if (state?.ok && state.postId) {
      router.push(`/admin/publicaciones/${state.postId}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="card space-y-4 p-5">
      {state?.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="label" htmlFor="title">Título interno</label>
        <input id="title" name="title" required className="input" placeholder="Ej. Los errores al iniciar un GLP-1" />
      </div>

      <div>
        <label className="label" htmlFor="description">Descripción / instrucciones</label>
        <textarea id="description" name="description" rows={3} className="input" style={{ minHeight: 90 }} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="instagram_url">Enlace de Instagram</label>
          <input id="instagram_url" name="instagram_url" type="url" className="input" placeholder="https://www.instagram.com/..." />
        </div>
        <div>
          <label className="label" htmlFor="tiktok_url">Enlace de TikTok</label>
          <input id="tiktok_url" name="tiktok_url" type="url" className="input" placeholder="https://www.tiktok.com/@..." />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Fecha de publicación</label>
          <input id="date" name="date" type="date" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="time">Hora de publicación</label>
          <input id="time" name="time" type="time" required className="input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="total_window_minutes">Ventana total (cuánto dura todo)</label>
          <select id="total_window_minutes" name="total_window_minutes" className="input" defaultValue={480}>
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
          <input id="completion_window_minutes" name="completion_window_minutes" type="number" min={1} defaultValue={40} required className="input" />
        </div>
      </div>
      <p className="rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
        El sistema reparte automáticamente todas las cuentas dentro de la ventana
        total, separando las cuentas de una misma persona para evitar patrones.
      </p>

      <div>
        <span className="label">Acciones solicitadas (solo instrucciones)</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTION_OPTIONS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requested_actions" value={a} className="h-4 w-4" />
              {a}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="status">Estado</label>
        <select id="status" name="status" className="input" defaultValue="draft">
          <option value="draft">Borrador</option>
          <option value="scheduled">Programada</option>
          <option value="active">Activa</option>
          <option value="finished">Finalizada</option>
        </select>
      </div>

      <p className="rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
        Las acciones son únicamente instrucciones para el equipo. La aplicación no
        realiza ninguna acción dentro de Instagram o TikTok.
      </p>

      <SubmitButton pendingText="Guardando...">Crear publicación</SubmitButton>
    </form>
  );
}
