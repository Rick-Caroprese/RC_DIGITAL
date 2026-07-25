"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMember } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export default function MemberForm() {
  const [state, action] = useActionState(createMember, null as { ok: boolean; error?: string } | null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card p-4">
      <h3 className="mb-3 font-semibold">Nuevo integrante</h3>

      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{state.error}</p>
      )}
      {state?.ok && (
        <p className="mb-3 rounded-lg bg-green-50 p-2.5 text-sm text-green-700">
          Integrante creado correctamente.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="full_name">Nombre completo</label>
          <input id="full_name" name="full_name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña (mín. 8)</label>
          <input id="password" name="password" type="text" minLength={8} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="role">Rol</label>
          <select id="role" name="role" className="input" defaultValue="member">
            <option value="member">Integrante</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <SubmitButton pendingText="Creando..." className="btn btn-primary">
          Crear integrante
        </SubmitButton>
      </div>
    </form>
  );
}
