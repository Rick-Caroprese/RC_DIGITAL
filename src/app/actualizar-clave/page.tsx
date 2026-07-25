"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SubmitButton from "@/components/SubmitButton";

export default function ActualizarClavePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function action(formData: FormData) {
    setError(null);
    const p1 = String(formData.get("password") || "");
    const p2 = String(formData.get("password2") || "");
    if (p1.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (p1 !== p2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) {
      setError("El enlace expiró o no es válido. Solicita uno nuevo.");
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/"), 1500);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <form action={action} className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Nueva contraseña</h2>
        {done ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Contraseña actualizada. Redirigiendo...
          </p>
        ) : (
          <>
            {error && (
              <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <label className="label" htmlFor="password">
              Contraseña nueva
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input mb-3"
              placeholder="Mínimo 8 caracteres"
            />
            <label className="label" htmlFor="password2">
              Repetir contraseña
            </label>
            <input
              id="password2"
              name="password2"
              type="password"
              required
              className="input mb-4"
            />
            <SubmitButton pendingText="Guardando...">Actualizar</SubmitButton>
          </>
        )}
      </form>
    </main>
  );
}
