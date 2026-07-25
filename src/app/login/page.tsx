"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction] = useActionState(signIn, null as { error?: string } | null);
  const params = useSearchParams();
  const inactive = params.get("error") === "inactive";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="mt-1.5 text-sm muted">
            Ingresa para ver tus tareas y horarios del día.
          </p>
        </div>

        <form action={formAction} className="card p-6" style={{ boxShadow: "var(--shadow-lg)" }}>
          {inactive && (
            <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              Tu cuenta está inactiva. Contacta al administrador.
            </div>
          )}
          {state?.error && (
            <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              {state.error}
            </div>
          )}

          <label className="label" htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input mb-4"
            placeholder="tucorreo@dominio.com"
          />

          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input mb-5"
            placeholder="••••••••"
          />

          <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>

          <div className="mt-5 text-center">
            <Link href="/recuperar" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs muted">
          Herramienta interna del equipo · Qubika Studio
        </p>
      </div>
    </main>
  );
}
