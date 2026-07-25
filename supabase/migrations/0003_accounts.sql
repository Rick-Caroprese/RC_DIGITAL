-- ============================================================================
-- Qubika Studio — Cuentas por integrante (multi-cuenta)
-- Cada integrante puede tener varias cuentas (IG+TikTok). En cada publicación,
-- cada cuenta recibe su propio horario, repartido en la ventana total.
-- ============================================================================

-- Tabla de cuentas ------------------------------------------------------------
create table if not exists member_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  label             text not null,                 -- ej. "Cuenta 1"
  instagram_handle  text,                          -- @usuario (informativo)
  tiktok_handle     text,
  position          integer not null default 0,    -- orden estable
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_member_accounts_user on member_accounts(user_id);

drop trigger if exists trg_member_accounts_updated on member_accounts;
create trigger trg_member_accounts_updated before update on member_accounts
  for each row execute function set_updated_at();

alter table member_accounts enable row level security;

drop policy if exists accounts_select on member_accounts;
create policy accounts_select on member_accounts for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists accounts_admin_write on member_accounts;
create policy accounts_admin_write on member_accounts for all
  using (is_admin()) with check (is_admin());

-- Ventana total de la publicación (minutos) -----------------------------------
alter table posts add column if not exists total_window_minutes integer;
update posts set total_window_minutes = coalesce(total_window_minutes, 480)
  where total_window_minutes is null;

-- assignments ahora referencian una cuenta ------------------------------------
alter table assignments add column if not exists account_id uuid
  references member_accounts(id) on delete cascade;

-- Un integrante ya puede tener varias asignaciones por publicación (una por
-- cuenta), así que quitamos la unicidad por (post, usuario).
alter table assignments drop constraint if exists uq_assignment_post_user;

-- Una cuenta como máximo una vez por publicación.
alter table assignments drop constraint if exists uq_assignment_post_account;
alter table assignments add constraint uq_assignment_post_account
  unique (post_id, account_id);

create index if not exists idx_assignments_account on assignments(account_id);
