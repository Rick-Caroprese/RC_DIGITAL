-- ============================================================================
-- NU Digital Team — Row Level Security + funciones RPC seguras
-- ============================================================================

-- Habilitar RLS ---------------------------------------------------------------
alter table profiles         enable row level security;
alter table posts            enable row level security;
alter table assignments      enable row level security;
alter table task_completions enable row level security;
alter table rotation_state   enable row level security;
alter table notifications    enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
--  - un integrante lee su propio perfil; el admin lee todos.
--  - solo el admin modifica perfiles (roles, estado). Las escrituras masivas
--    (crear integrantes) las hace el servidor con service_role.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin());

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- posts
--  - el admin ve todo; el integrante solo ve las publicaciones donde tiene
--    una asignación (para leer instrucciones y enlaces).
--  - solo el admin crea/edita/elimina publicaciones.
-- ---------------------------------------------------------------------------
drop policy if exists posts_select on posts;
create policy posts_select on posts for select
  using (
    is_admin()
    or exists (
      select 1 from assignments a
      where a.post_id = posts.id and a.user_id = auth.uid()
    )
  );

drop policy if exists posts_admin_write on posts;
create policy posts_admin_write on posts for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- assignments
--  - el integrante lee solo sus asignaciones; el admin, todas.
--  - solo el admin crea/edita/elimina (los integrantes NO cambian horarios).
-- ---------------------------------------------------------------------------
drop policy if exists assignments_select on assignments;
create policy assignments_select on assignments for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists assignments_admin_write on assignments;
create policy assignments_admin_write on assignments for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- task_completions
--  - lectura: dueño de la asignación o admin.
--  - escritura directa: solo admin. Los integrantes confirman EXCLUSIVAMENTE
--    a través de las RPC de abajo (que fijan la hora en el servidor), por lo
--    que NO pueden alterar la fecha/hora de cumplimiento.
-- ---------------------------------------------------------------------------
drop policy if exists completions_select on task_completions;
create policy completions_select on task_completions for select
  using (
    is_admin()
    or exists (
      select 1 from assignments a
      where a.id = task_completions.assignment_id and a.user_id = auth.uid()
    )
  );

drop policy if exists completions_admin_write on task_completions;
create policy completions_admin_write on task_completions for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- rotation_state: solo el admin (o el servidor) lo consulta/modifica.
-- ---------------------------------------------------------------------------
drop policy if exists rotation_admin on rotation_state;
create policy rotation_admin on rotation_state for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- notifications: el integrante ve y marca como leídas las suyas; el admin ve
-- todas. La creación la hace el servidor (service_role) o el admin.
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_admin_write on notifications;
create policy notifications_admin_write on notifications for all
  using (is_admin()) with check (is_admin());

-- ============================================================================
-- RPC: registrar apertura de enlace (no marca cumplimiento)
-- ============================================================================
create or replace function register_link_open(
  p_assignment_id uuid,
  p_platform      platform_type,
  p_ip            text default null,
  p_user_agent    text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from assignments where id = p_assignment_id;
  if v_owner is null then
    raise exception 'Asignación no encontrada';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  insert into task_completions (assignment_id, platform, link_opened_at, ip_address, user_agent)
  values (p_assignment_id, p_platform, now(), nullif(p_ip,'')::inet, p_user_agent)
  on conflict (assignment_id, platform) do update
    set link_opened_at = coalesce(task_completions.link_opened_at, excluded.link_opened_at),
        ip_address     = coalesce(task_completions.ip_address, excluded.ip_address),
        user_agent     = coalesce(task_completions.user_agent, excluded.user_agent);
end $$;

-- ============================================================================
-- RPC: confirmar tarea de una plataforma. La hora la fija el servidor (now()),
-- el integrante no puede falsearla. Calcula a tiempo / fuera de tiempo y
-- actualiza el estado de la asignación cuando todas las plataformas requeridas
-- están confirmadas.
-- ============================================================================
create or replace function confirm_task(
  p_assignment_id uuid,
  p_platform      platform_type,
  p_ip            text default null,
  p_user_agent    text default null
) returns task_completions
language plpgsql security definer set search_path = public as $$
declare
  v_assignment assignments%rowtype;
  v_post       posts%rowtype;
  v_now        timestamptz := now();
  v_on_time    boolean;
  v_row        task_completions%rowtype;
  v_ig_needed  boolean;
  v_tt_needed  boolean;
  v_ig_done    boolean;
  v_tt_done    boolean;
  v_all_done   boolean;
  v_any_late   boolean;
begin
  select * into v_assignment from assignments where id = p_assignment_id;
  if not found then raise exception 'Asignación no encontrada'; end if;
  if v_assignment.user_id <> auth.uid() then raise exception 'No autorizado'; end if;

  -- No se puede confirmar antes de que empiece el horario asignado.
  if v_now < v_assignment.assigned_datetime then
    raise exception 'La tarea aún no está disponible';
  end if;

  v_on_time := v_now <= v_assignment.deadline_datetime;

  insert into task_completions (
    assignment_id, platform, link_opened_at, completed_at, completion_status,
    ip_address, user_agent
  ) values (
    p_assignment_id, p_platform, v_now, v_now,
    case when v_on_time then 'on_time' else 'late' end::completion_status,
    nullif(p_ip,'')::inet, p_user_agent
  )
  on conflict (assignment_id, platform) do update
    set completed_at      = case
                              when task_completions.completed_at is null then excluded.completed_at
                              else task_completions.completed_at end,
        completion_status = case
                              when task_completions.completed_at is null then excluded.completion_status
                              else task_completions.completion_status end,
        link_opened_at    = coalesce(task_completions.link_opened_at, excluded.link_opened_at),
        ip_address        = coalesce(task_completions.ip_address, excluded.ip_address),
        user_agent        = coalesce(task_completions.user_agent, excluded.user_agent)
  returning * into v_row;

  -- ¿Están confirmadas todas las plataformas que la publicación requiere?
  select * into v_post from posts where id = v_assignment.post_id;
  v_ig_needed := v_post.instagram_url is not null;
  v_tt_needed := v_post.tiktok_url is not null;

  select
    bool_or(platform = 'instagram' and completed_at is not null),
    bool_or(platform = 'tiktok'    and completed_at is not null),
    bool_or(completion_status = 'late')
  into v_ig_done, v_tt_done, v_any_late
  from task_completions where assignment_id = p_assignment_id;

  v_ig_done := coalesce(v_ig_done, false);
  v_tt_done := coalesce(v_tt_done, false);
  v_all_done := (not v_ig_needed or v_ig_done) and (not v_tt_needed or v_tt_done);

  if v_all_done then
    update assignments
      set status = case when coalesce(v_any_late,false)
                        then 'completed_late' else 'completed' end
      where id = p_assignment_id;
  end if;

  return v_row;
end $$;

-- Permisos de ejecución para usuarios autenticados.
grant execute on function register_link_open(uuid, platform_type, text, text) to authenticated;
grant execute on function confirm_task(uuid, platform_type, text, text) to authenticated;
