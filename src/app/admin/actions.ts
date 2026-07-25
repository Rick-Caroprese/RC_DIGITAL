"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSchedule } from "@/lib/rotation";
import type { Profile } from "@/lib/types";

// Verifica en el servidor que quien llama es admin activo. No confiar en el UI.
async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || (profile as Profile).role !== "admin" || (profile as Profile).status !== "active") {
    throw new Error("No autorizado");
  }
  return { supabase, profile: profile as Profile };
}

type Result = { ok: boolean; error?: string; postId?: string };

// --- Integrantes -----------------------------------------------------------
export async function createMember(_prev: unknown, formData: FormData): Promise<Result> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "member") === "admin" ? "admin" : "member";

  if (!full_name || !email || password.length < 8) {
    return { ok: false, error: "Nombre, correo y contraseña (mín. 8) son obligatorios." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message?.includes("already") ? "Ese correo ya existe." : "No se pudo crear el usuario." };
  }

  // El trigger crea el profile; fijamos nombre/rol/estado.
  const { error: upErr } = await admin
    .from("profiles")
    .update({ full_name, role, status: "active" })
    .eq("id", data.user.id);
  if (upErr) return { ok: false, error: "Usuario creado, pero falló al guardar el perfil." };

  revalidatePath("/admin/integrantes");
  return { ok: true };
}

export async function setMemberStatus(userId: string, active: boolean): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ status: active ? "active" : "inactive" })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/integrantes");
    return { ok: true };
  } catch {
    return { ok: false, error: "No autorizado" };
  }
}

// --- Publicaciones ---------------------------------------------------------
export async function createPost(_prev: unknown, formData: FormData): Promise<Result> {
  let profileId: string;
  try {
    const { profile } = await assertAdmin();
    profileId = profile.id;
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const instagram_url = String(formData.get("instagram_url") || "").trim() || null;
  const tiktok_url = String(formData.get("tiktok_url") || "").trim() || null;
  const date = String(formData.get("date") || ""); // YYYY-MM-DD
  const time = String(formData.get("time") || ""); // HH:mm
  const interval_minutes = Number(formData.get("interval_minutes") || 20);
  const completion_window_minutes = Number(formData.get("completion_window_minutes") || 40);
  const status = String(formData.get("status") || "draft");
  const requested_actions = formData
    .getAll("requested_actions")
    .map((x) => String(x))
    .filter(Boolean);

  if (!title) return { ok: false, error: "El título es obligatorio." };
  if (!instagram_url && !tiktok_url)
    return { ok: false, error: "Agrega al menos un enlace (Instagram o TikTok)." };
  if (!date || !time) return { ok: false, error: "Indica fecha y hora de publicación." };
  if (interval_minutes <= 0 || completion_window_minutes <= 0)
    return { ok: false, error: "El intervalo y la ventana deben ser mayores que 0." };

  // Bogotá es UTC-5 fijo -> convertimos "fecha hora" local a UTC.
  const publicationIso = bogotaLocalToUtcIso(date, time);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title,
      description,
      instagram_url,
      tiktok_url,
      requested_actions,
      publication_datetime: publicationIso,
      interval_minutes,
      completion_window_minutes,
      status,
      created_by: profileId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/publicaciones");
  return { ok: true, postId: data.id };
}

export async function deletePost(postId: string): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/publicaciones");
    return { ok: true };
  } catch {
    return { ok: false, error: "No autorizado" };
  }
}

// Editar una publicación existente. No regenera horarios automáticamente:
// si cambian fecha/intervalo/ventana, el admin usa "Regenerar horarios".
export async function updatePost(_prev: unknown, formData: FormData): Promise<Result> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const instagram_url = String(formData.get("instagram_url") || "").trim() || null;
  const tiktok_url = String(formData.get("tiktok_url") || "").trim() || null;
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const interval_minutes = Number(formData.get("interval_minutes") || 20);
  const completion_window_minutes = Number(formData.get("completion_window_minutes") || 40);
  const status = String(formData.get("status") || "draft");
  const requested_actions = formData
    .getAll("requested_actions")
    .map((x) => String(x))
    .filter(Boolean);

  if (!id) return { ok: false, error: "Publicación no válida." };
  if (!title) return { ok: false, error: "El título es obligatorio." };
  if (!instagram_url && !tiktok_url)
    return { ok: false, error: "Agrega al menos un enlace (Instagram o TikTok)." };
  if (!date || !time) return { ok: false, error: "Indica fecha y hora de publicación." };
  if (interval_minutes <= 0 || completion_window_minutes <= 0)
    return { ok: false, error: "El intervalo y la ventana deben ser mayores que 0." };

  const publicationIso = bogotaLocalToUtcIso(date, time);
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({
      title,
      description,
      instagram_url,
      tiktok_url,
      requested_actions,
      publication_datetime: publicationIso,
      interval_minutes,
      completion_window_minutes,
      status,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/publicaciones");
  revalidatePath(`/admin/publicaciones/${id}`);
  return { ok: true, postId: id };
}

// Cambiar solo el estado (pausar = draft, reanudar = active, finalizar, etc.).
export async function updatePostStatus(
  postId: string,
  status: "draft" | "scheduled" | "active" | "finished",
): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase.from("posts").update({ status }).eq("id", postId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/publicaciones");
    revalidatePath(`/admin/publicaciones/${postId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No autorizado" };
  }
}

// --- Generación de horarios (rotación balanceada) --------------------------
export async function generatePostSchedule(postId: string): Promise<Result> {
  let supabase;
  try {
    ({ supabase } = await assertAdmin());
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  // Publicación
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (postErr || !post) return { ok: false, error: "Publicación no encontrada." };

  // Integrantes activos, orden estable por fecha de creación.
  const { data: members } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const activeUserIds = (members ?? []).map((m) => m.id);
  if (activeUserIds.length === 0)
    return { ok: false, error: "No hay integrantes activos." };

  // Estado de rotación global
  const { data: rot } = await supabase
    .from("rotation_state")
    .select("*")
    .eq("id", 1)
    .single();
  const rotationIndex = rot?.last_rotation_index ?? 0;

  const slots = generateSchedule({
    activeUserIds,
    publicationDatetime: new Date(post.publication_datetime),
    intervalMinutes: post.interval_minutes,
    completionWindowMinutes: post.completion_window_minutes,
    rotationIndex,
  });

  // Reemplaza asignaciones previas de esta publicación.
  await supabase.from("assignments").delete().eq("post_id", postId);

  const rows = slots.map((s) => ({
    post_id: postId,
    user_id: s.userId,
    assigned_datetime: s.assignedDatetime.toISOString(),
    deadline_datetime: s.deadlineDatetime.toISOString(),
    rotation_position: s.rotationPosition,
    status: "scheduled" as const,
  }));
  const { error: insErr } = await supabase.from("assignments").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };

  // Avanza la rotación y guarda quién empezó.
  await supabase
    .from("rotation_state")
    .update({
      last_rotation_index: rotationIndex + 1,
      last_starting_user_id: slots[0].userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  // Notificación in-app "Nueva tarea asignada" a cada integrante.
  await supabase.from("notifications").insert(
    slots.map((s) => ({
      user_id: s.userId,
      title: "Nueva tarea asignada",
      message: `Publicación: ${post.title}`,
    })),
  );

  revalidatePath(`/admin/publicaciones/${postId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// --- Edición manual de un horario ------------------------------------------
export async function updateAssignmentTime(
  assignmentId: string,
  date: string,
  time: string,
): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const assignedIso = bogotaLocalToUtcIso(date, time);
    // Recalcula el deadline usando la ventana de la publicación.
    const { data: a } = await supabase
      .from("assignments")
      .select("post_id, posts(completion_window_minutes)")
      .eq("id", assignmentId)
      .single();
    const win =
      (a as { posts?: { completion_window_minutes?: number } })?.posts
        ?.completion_window_minutes ?? 40;
    const deadlineIso = new Date(
      new Date(assignedIso).getTime() + win * 60000,
    ).toISOString();

    const { error } = await supabase
      .from("assignments")
      .update({ assigned_datetime: assignedIso, deadline_datetime: deadlineIso })
      .eq("id", assignmentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/publicaciones");
    return { ok: true };
  } catch {
    return { ok: false, error: "No autorizado" };
  }
}

// --- Justificar / notas ----------------------------------------------------
export async function setAssignmentJustified(
  assignmentId: string,
  justified: boolean,
  notes: string,
): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase
      .from("assignments")
      .update({
        justified,
        status: justified ? "justified" : "missed",
        admin_notes: notes || null,
      })
      .eq("id", assignmentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/publicaciones");
    return { ok: true };
  } catch {
    return { ok: false, error: "No autorizado" };
  }
}

// Convierte fecha/hora local de Bogotá (UTC-5 fijo) a ISO UTC.
function bogotaLocalToUtcIso(date: string, time: string): string {
  // date=YYYY-MM-DD, time=HH:mm  ->  añade el offset -05:00
  return new Date(`${date}T${time}:00-05:00`).toISOString();
}
