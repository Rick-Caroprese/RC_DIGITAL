"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAccount,
  setAccountActive,
  deleteAccount,
  updateAccount,
} from "../../actions";
import SubmitButton from "@/components/SubmitButton";
import type { MemberAccount } from "@/lib/types";

export default function AccountsManager({
  userId,
  accounts,
}: {
  userId: string;
  accounts: MemberAccount[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(createAccount, null as { ok: boolean; error?: string } | null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {accounts.length === 0 && (
          <p className="text-sm muted">Este integrante aún no tiene cuentas.</p>
        )}
        {accounts.map((a) => (
          <AccountRow key={a.id} account={a} />
        ))}
      </div>

      <form ref={formRef} action={action} className="card p-4">
        <h3 className="mb-3 font-semibold">Agregar cuenta</h3>
        {state?.error && (
          <p className="mb-3 rounded-lg p-2.5 text-sm" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
            {state.error}
          </p>
        )}
        <input type="hidden" name="user_id" value={userId} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Nombre</label>
            <input name="label" required className="input" defaultValue={`Cuenta ${accounts.length + 1}`} />
          </div>
          <div>
            <label className="label">Usuario Instagram</label>
            <input name="instagram_handle" className="input" placeholder="@usuario" />
          </div>
          <div>
            <label className="label">Usuario TikTok</label>
            <input name="tiktok_handle" className="input" placeholder="@usuario" />
          </div>
        </div>
        <div className="mt-3">
          <SubmitButton pendingText="Agregando..." className="btn btn-primary">Agregar cuenta</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function AccountRow({ account }: { account: MemberAccount }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [ig, setIg] = useState(account.instagram_handle ?? "");
  const [tt, setTt] = useState(account.tiktok_handle ?? "");
  const [label, setLabel] = useState(account.label);

  function refresh() {
    start(() => {
      router.refresh();
    });
  }

  function save() {
    start(async () => {
      await updateAccount(account.id, { label, instagram_handle: ig, tiktok_handle: tt });
      setEditing(false);
      router.refresh();
    });
  }
  function toggle() {
    start(async () => {
      await setAccountActive(account.id, !account.active);
      router.refresh();
    });
  }
  function remove() {
    if (!confirm(`¿Eliminar ${account.label}?`)) return;
    start(async () => {
      await deleteAccount(account.id);
      router.refresh();
    });
  }

  return (
    <div className="card p-3" style={{ opacity: account.active ? 1 : 0.55 }}>
      {editing ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input className="input" value={ig} onChange={(e) => setIg(e.target.value)} placeholder="IG @usuario" />
            <input className="input" value={tt} onChange={(e) => setTt(e.target.value)} placeholder="TikTok @usuario" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className="btn btn-primary !min-h-0 !px-3 !py-1.5 text-sm">Guardar</button>
            <button onClick={() => setEditing(false)} className="btn btn-outline !min-h-0 !px-3 !py-1.5 text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">
              {account.label}{" "}
              {!account.active && <span className="text-xs muted">(inactiva)</span>}
            </p>
            <p className="truncate text-sm muted">
              {account.instagram_handle ? `IG @${account.instagram_handle}` : "IG —"}
              {"  ·  "}
              {account.tiktok_handle ? `TT @${account.tiktok_handle}` : "TT —"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => setEditing(true)} className="btn btn-outline !min-h-0 !px-2.5 !py-1 text-xs">Editar</button>
            <button onClick={toggle} disabled={pending} className="btn btn-outline !min-h-0 !px-2.5 !py-1 text-xs">
              {account.active ? "Desactivar" : "Activar"}
            </button>
            <button onClick={remove} disabled={pending} className="btn btn-danger !min-h-0 !px-2.5 !py-1 text-xs">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
