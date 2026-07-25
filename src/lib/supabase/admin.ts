import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service_role. SOLO para el servidor (Server Actions / Route
// Handlers). Omite RLS, así que nunca debe usarse en el navegador.
// Úsalo únicamente después de verificar en el servidor que el usuario es admin.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
