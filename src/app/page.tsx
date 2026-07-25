import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Punto de entrada: redirige según sesión y rol.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    redirect("/login?error=inactive");
  }

  redirect(profile.role === "admin" ? "/admin" : "/app");
}
