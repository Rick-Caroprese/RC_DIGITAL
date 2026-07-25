"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Platform } from "@/lib/types";

type Result = { ok: boolean; error?: string };

async function requestMeta() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || h.get("x-real-ip") || "";
  const userAgent = h.get("user-agent") || "";
  return { ip, userAgent };
}

// Registra que el integrante abrió el enlace (NO marca cumplimiento).
export async function registerLinkOpen(
  assignmentId: string,
  platform: Platform,
): Promise<Result> {
  const supabase = await createClient();
  const { ip, userAgent } = await requestMeta();
  const { error } = await supabase.rpc("register_link_open", {
    p_assignment_id: assignmentId,
    p_platform: platform,
    p_ip: ip,
    p_user_agent: userAgent,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  return { ok: true };
}

// Confirma manualmente la actividad de una plataforma. La hora la fija el
// servidor (RPC), el integrante no puede modificarla.
export async function confirmTask(
  assignmentId: string,
  platform: Platform,
): Promise<Result> {
  const supabase = await createClient();
  const { ip, userAgent } = await requestMeta();
  const { error } = await supabase.rpc("confirm_task", {
    p_assignment_id: assignmentId,
    p_platform: platform,
    p_ip: ip,
    p_user_agent: userAgent,
  });
  if (error) {
    const msg = error.message.includes("disponible")
      ? "La tarea aún no está disponible."
      : error.message.includes("autorizado")
        ? "No autorizado."
        : "No se pudo confirmar. Inténtalo de nuevo.";
    return { ok: false, error: msg };
  }
  revalidatePath("/app");
  revalidatePath("/app/tareas");
  return { ok: true };
}
