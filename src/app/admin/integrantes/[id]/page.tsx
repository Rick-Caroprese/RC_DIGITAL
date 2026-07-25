import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberAccount, Profile } from "@/lib/types";
import AccountsManager from "./AccountsManager";

export default async function MemberAccountsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!profile) notFound();
  const p = profile as Profile;

  const { data: accountsData } = await supabase
    .from("member_accounts")
    .select("*")
    .eq("user_id", id)
    .order("position", { ascending: true });
  const accounts = (accountsData ?? []) as MemberAccount[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{p.full_name || p.email}</h1>
          <p className="text-sm muted">
            {accounts.filter((a) => a.active).length} cuentas activas de {accounts.length}
          </p>
        </div>
        <Link href="/admin/integrantes" className="text-sm underline" style={{ color: "var(--primary)" }}>
          ← Integrantes
        </Link>
      </div>

      <AccountsManager userId={id} accounts={accounts} />
    </div>
  );
}
