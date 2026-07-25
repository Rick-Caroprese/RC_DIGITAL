-- ============================================================================
-- NU Digital Team — Esquema inicial
-- Postgres / Supabase. Zona horaria de negocio: America/Bogota.
-- Todos los instantes se guardan como timestamptz (UTC) y se muestran en Bogotá.
-- ============================================================================

-- Extensiones -----------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Tipos (enums) ---------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'scheduled', 'active', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assignment_status as enum (
    'scheduled', 'available', 'completed', 'completed_late',
    'missed', 'justified', 'in_review'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type platform_type as enum ('instagram', 'tiktok');
exception when duplicate_object then null; end $$;

do $$ begin
  create type completion_status as enum ('on_time', 'late');
exception when duplicate_object then null; end $$;

-- Utilidad: updated_at --------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================================
-- Tablas
-- ============================================================================

-- profiles: extiende auth.users -----------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  avatar_url  text,
  role        user_role not null default 'member',
  status      user_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_status on profiles(status);

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- posts -----------------------------------------------------------------------
create table if not exists posts (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null,
  description               text,
  instagram_url             text,
  tiktok_url                text,
  requested_actions         text[] not null default '{}',
  publication_datetime      timestamptz not null,
  interval_minutes          integer not null default 20 check (interval_minutes > 0),
  completion_window_minutes integer not null default 40 check (completion_window_minutes > 0),
  status                    post_status not null default 'draft',
  created_by                uuid not null references profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- Debe existir al menos un enlace.
  constraint posts_has_link check (instagram_url is not null or tiktok_url is not null)
);
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_posts_pub_dt on posts(publication_datetime);

drop trigger if exists trg_posts_updated on posts;
create trigger trg_posts_updated before update on posts
  for each row execute function set_updated_at();

-- assignments -----------------------------------------------------------------
create table if not exists assignments (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references posts(id) on delete cascade,
  user_id            uuid not null references profiles(id) on delete cascade,
  assigned_datetime  timestamptz not null,
  deadline_datetime  timestamptz not null,
  rotation_position  integer not null,             -- 0-based
  status             assignment_status not null default 'scheduled',
  justified          boolean not null default false,
  admin_notes        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Un integrante como máximo una vez por publicación.
  constraint uq_assignment_post_user unique (post_id, user_id),
  -- Nunca dos personas en la misma posición de una publicación.
  constraint uq_assignment_post_pos  unique (post_id, rotation_position)
);
create index if not exists idx_assignments_user on assignments(user_id);
create index if not exists idx_assignments_post on assignments(post_id);
create index if not exists idx_assignments_assigned on assignments(assigned_datetime);

drop trigger if exists trg_assignments_updated on assignments;
create trigger trg_assignments_updated before update on assignments
  for each row execute function set_updated_at();

-- task_completions ------------------------------------------------------------
create table if not exists task_completions (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references assignments(id) on delete cascade,
  platform          platform_type not null,
  link_opened_at    timestamptz,
  completed_at      timestamptz,
  completion_status completion_status,
  ip_address        inet,
  user_agent        text,
  created_at        timestamptz not null default now(),
  -- Una sola confirmación válida por (assignment, plataforma).
  constraint uq_completion_assignment_platform unique (assignment_id, platform)
);
create index if not exists idx_completions_assignment on task_completions(assignment_id);

-- rotation_state (singleton) --------------------------------------------------
create table if not exists rotation_state (
  id                    integer primary key default 1 check (id = 1),
  last_starting_user_id uuid references profiles(id),
  last_rotation_index   integer not null default 0,
  updated_at            timestamptz not null default now()
);
insert into rotation_state (id, last_rotation_index)
  values (1, 0) on conflict (id) do nothing;

-- notifications ---------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  message    text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, read);

-- ============================================================================
-- Funciones de seguridad (SECURITY DEFINER, evitan recursión de RLS)
-- ============================================================================
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'active'
  );
$$;

-- Crea el profile automáticamente al registrar un usuario en auth.users.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
