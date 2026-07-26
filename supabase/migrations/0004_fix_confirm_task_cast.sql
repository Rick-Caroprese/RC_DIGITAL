-- ============================================================================
-- Fix: confirm_task fallaba al confirmar la ÚLTIMA plataforma de una tarea.
--
-- El UPDATE final asigna a assignments.status (tipo assignment_status) el
-- resultado de un CASE que Postgres infiere como text, lanzando:
--   42804: column "status" is of type assignment_status but expression is of type text
--
-- Ese bloque solo corre cuando todas las plataformas requeridas están
-- confirmadas, por eso la primera confirmación (Instagram) funcionaba y la
-- segunda (TikTok) fallaba y revertía toda la transacción.
--
-- Solución: castear explícitamente a assignment_status.
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
    (case when v_on_time then 'on_time' else 'late' end)::completion_status,
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
      set status = (case when coalesce(v_any_late,false)
                         then 'completed_late' else 'completed' end)::assignment_status
      where id = p_assignment_id;
  end if;

  return v_row;
end $$;

grant execute on function confirm_task(uuid, platform_type, text, text) to authenticated;
