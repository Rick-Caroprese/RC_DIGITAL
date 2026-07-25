"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SubmitButton from "@/components/SubmitButton";

export default function RecuperarPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") || "").trim();
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/actualizar-clave`,
    });
    if (error) {
      setError("No se pudo enviar el correo. Inténtalo de nuevo.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <form action={action} className="card p-5">
        <h2 className="mb-2 text-lg font-semibold">Recuperar contraseña</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Si el correo existe, recibirás un enlace en tu bandeja de entrada.
          </p>
        ) : (
          <>
            {error && (
              <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <label className="label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input mb-4"
              placeholder="tucorreo@dominio.com"
            />
            <SubmitButton pendingText="Enviando...">Enviar enlace</SubmitButton>
          </>
        )}

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm underline" style={{ color: "var(--primary)" }}>
            Volver a iniciar sesión
          </Link>
        </div>
      </form>
    </main>
  );
}
