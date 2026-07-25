import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Devuelve el perfil del usuario autenticado, o null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

/** Exige sesión activa; redirige a login si no la hay o está inactivo. */
export async function requireActiveProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/login?error=inactive");
  return profile;
}

/** Exige rol admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "admin") redirect("/app");
  return profile;
}

/** Exige rol integrante (member). */
export async function requireMember(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "member") redirect("/admin");
  return profile;
}
