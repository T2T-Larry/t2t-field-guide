-- 2026-10-16  ONE ROW PER CARD
-- Board fields (column, person, dates, hang-up info, plan links) move from the
-- side table task_fields onto the card's own row in ideas. The briefing_cards
-- view keeps its name and columns, so every screen that reads it is unchanged.
-- task_fields is retired (renamed task_fields_retired_20261016) as a rollback copy.
-- Backup taken first: task_fields_backup_20261016.

-- 1. New columns on ideas ---------------------------------------------------
alter table public.ideas
  add column if not exists board_id uuid references public.briefing_boards(id) on delete cascade,
  add column if not exists col text,
  add column if not exists person text,
  add column if not exists reviewed_by text,
  add column if not exists due_date date,
  add column if not exists start_date date,
  add column if not exists completed_date date,
  add column if not exists budget text,
  add column if not exists verified boolean,
  add column if not exists pro boolean,
  add column if not exists grow boolean,
  add column if not exists grow_note text,
  add column if not exists situation text,
  add column if not exists hangup_since date,
  add column if not exists hangup_header_id uuid references public.ideas(id) on delete cascade,
  add column if not exists is_routine boolean,
  add column if not exists routine_freq text,
  add column if not exists routine_custom text,
  add column if not exists routine_day text,
  add column if not exists due_time text,
  add column if not exists start_time text,
  add column if not exists start_escalated_for date,
  add column if not exists due_escalated_for date,
  add column if not exists overdue_flash_shown_for date,
  add column if not exists start_overdue_flash_shown_for date,
  add column if not exists personal_rank integer,
  add column if not exists personal_col text,
  add column if not exists shared_to_board_id uuid references public.briefing_boards(id) on delete set null,
  add column if not exists shared_col text,
  add column if not exists shared_rank integer,
  add column if not exists source_header_id uuid references public.ideas(id) on delete cascade,
  add column if not exists topic_label text,
  add column if not exists lock_reason text,
  add column if not exists project_header_id uuid references public.ideas(id) on delete set null,
  add column if not exists adds_checklist boolean,
  add column if not exists adds_due boolean,
  add column if not exists adds_routine boolean,
  add column if not exists adds_budget boolean,
  add column if not exists adds_start boolean,
  add column if not exists archived boolean not null default false,
  add column if not exists trashed_at timestamptz,
  add column if not exists plan_step_id uuid references public.ideas(id) on delete set null,
  add column if not exists needs_plan boolean not null default false,
  add column if not exists goal_header_id uuid;

-- 2. Copy the data across (nine duplicate fields already agreed; ideas copy is kept)
update public.ideas i set
  board_id = t.board_id, col = t.col, person = t.person, reviewed_by = t.reviewed_by,
  due_date = t.due_date, start_date = t.start_date, completed_date = t.completed_date,
  budget = t.budget, verified = t.verified, pro = t.pro, grow = t.grow, grow_note = t.grow_note,
  situation = t.situation, hangup_since = t.hangup_since, hangup_header_id = t.hangup_header_id,
  is_routine = t.is_routine, routine_freq = t.routine_freq, routine_custom = t.routine_custom,
  routine_day = t.routine_day, due_time = t.due_time, start_time = t.start_time,
  start_escalated_for = t.start_escalated_for, due_escalated_for = t.due_escalated_for,
  overdue_flash_shown_for = t.overdue_flash_shown_for,
  start_overdue_flash_shown_for = t.start_overdue_flash_shown_for,
  personal_rank = t.personal_rank, personal_col = t.personal_col,
  shared_to_board_id = t.shared_to_board_id, shared_col = t.shared_col, shared_rank = t.shared_rank,
  source_header_id = t.source_header_id, topic_label = t.topic_label, lock_reason = t.lock_reason,
  project_header_id = t.project_header_id, adds_checklist = t.adds_checklist, adds_due = t.adds_due,
  adds_routine = t.adds_routine, adds_budget = t.adds_budget, adds_start = t.adds_start,
  archived = t.archived, trashed_at = t.trashed_at, plan_step_id = t.plan_step_id,
  needs_plan = t.needs_plan, goal_header_id = t.goal_header_id
from public.task_fields t where t.idea_id = i.id;

-- 3. Stop the old side-table triggers ---------------------------------------
drop trigger if exists bb_card_gone_tf on public.task_fields;
drop trigger if exists task_fields_needs_plan_route on public.task_fields;
drop trigger if exists task_fields_plan_advance on public.task_fields;
drop trigger if exists task_fields_plan_mark_done on public.task_fields;

-- 4. The briefing_cards view now reads only from ideas -----------------------
create or replace view public.briefing_cards as
 select i.id, i.board_id, i.col, i.text_content as task, i.person, i.reviewed_by, i.due_date, i.start_date,
    i.completed_date, i.budget, i.priority, i.verified, i.pro, i.grow, i.grow_note, i.archived,
    i.key_slot_1, i.key_slot_2, i.key_slot_3, i.sort_order, i.created_at, i.notes, i.situation,
    i.hangup_since, i.hangup_header_id, i.is_routine, i.routine_freq, i.routine_custom, i.due_time,
    i.start_time, i.start_escalated_for, i.due_escalated_for, i.trashed_at, i.personal_rank,
    i.personal_col, i.shared_to_board_id, i.shared_col, i.shared_rank, i.link_url, i.link_title,
    i.link_thumb, i.source_header_id, i.topic_label, i.locked, i.lock_reason, i.overdue_flash_shown_for,
    i.color, i.adds_checklist, i.adds_due, i.adds_routine, i.adds_budget, i.adds_notes, i.adds_links,
    i.adds_start, i.adds_related, i.adds_flags, i.start_overdue_flash_shown_for, i.hide_primary_badge,
    i.project_header_id, i.subject, i.hide_contents_front, i.routine_day, i.adds_org, i.org_name,
    i.org_eyebrow, i.logo_url, i.logo_w, i.logo_h, i.logo_dx, i.logo_dy, i.front_hidden,
    i.plan_step_id, i.needs_plan, i.goal_header_id
   from public.ideas i
  where i.board_id is not null
    and (public.is_board_member(i.board_id)
         or exists (select 1 from public.briefing_boards bb where bb.id = i.board_id and bb.user_id = (select auth.uid()))
         or (i.shared_to_board_id is not null
             and (public.is_board_member(i.shared_to_board_id)
                  or exists (select 1 from public.briefing_boards bs where bs.id = i.shared_to_board_id and bs.user_id = (select auth.uid())))))
 union all
 select l.id, l.board_id, l.col, l.task, l.person, l.reviewed_by, l.due_date, l.start_date, l.completed_date,
    l.budget, l.priority, l.verified, l.pro, l.grow, l.grow_note, l.archived, l.key_slot_1, l.key_slot_2,
    l.key_slot_3, l.sort_order, l.created_at, l.notes, l.situation, l.hangup_since, l.hangup_header_id,
    l.is_routine, l.routine_freq, l.routine_custom, l.due_time, l.start_time, l.start_escalated_for,
    l.due_escalated_for, l.trashed_at, l.personal_rank, l.personal_col, l.shared_to_board_id, l.shared_col,
    l.shared_rank, l.link_url, l.link_title, l.link_thumb, l.source_header_id, l.topic_label, l.locked,
    l.lock_reason, l.overdue_flash_shown_for, l.color, l.adds_checklist, l.adds_due, l.adds_routine,
    l.adds_budget, l.adds_notes, l.adds_links, l.adds_start, l.adds_related, l.adds_flags,
    l.start_overdue_flash_shown_for, l.hide_primary_badge, l.project_header_id, l.subject,
    l.hide_contents_front, l.routine_day, l.adds_org, l.org_name, l.org_eyebrow, l.logo_url, l.logo_w,
    l.logo_h, l.logo_dx, l.logo_dy, l.front_hidden,
    null::uuid as plan_step_id, false as needs_plan, null::uuid as goal_header_id
   from public.briefing_cards_legacy l
  where not exists (select 1 from public.ideas t where t.id = l.id and t.board_id is not null)
    and (public.is_board_member(l.board_id)
         or exists (select 1 from public.briefing_boards bb where bb.id = l.board_id and bb.user_id = (select auth.uid()))
         or (l.shared_to_board_id is not null
             and (public.is_board_member(l.shared_to_board_id)
                  or exists (select 1 from public.briefing_boards bs where bs.id = l.shared_to_board_id and bs.user_id = (select auth.uid())))));

-- 5. One shared writer for a MASTER card -------------------------------------
create or replace function public.bb_save_master_card(r public.briefing_cards)
 returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_owner uuid; v_cluster uuid; v_scope uuid; v_hname text;
begin
  select user_id into v_owner from public.briefing_boards where id = r.board_id;
  v_cluster := coalesce(r.project_header_id, (select storyboard_project_id from public.briefing_boards where id = r.board_id));
  select coalesce(topic_scope_id, id) into v_scope from public.ideas where id = v_cluster;
  insert into public.ideas (id, user_id, content_type, text_content, cluster_id, topic_scope_id, priority, sort_order,
      created_at, notes, link_url, link_title, link_thumb, locked, color, adds_notes, adds_links, adds_related, adds_flags,
      subject, hide_contents_front, front_hidden, key_slot_1, key_slot_2, key_slot_3,
      board_id, col, person, reviewed_by, due_date, start_date, completed_date, budget, verified, pro, grow, grow_note,
      archived, situation, hangup_since, hangup_header_id, is_routine, routine_freq, routine_custom, routine_day,
      due_time, start_time, start_escalated_for, due_escalated_for, overdue_flash_shown_for, start_overdue_flash_shown_for,
      trashed_at, personal_rank, personal_col, shared_to_board_id, shared_col, shared_rank, source_header_id, topic_label,
      lock_reason, project_header_id, adds_checklist, adds_due, adds_routine, adds_budget, adds_start, hide_primary_badge,
      adds_org, org_name, org_eyebrow, logo_url, logo_w, logo_h, logo_dx, logo_dy, plan_step_id, needs_plan, goal_header_id)
    values (r.id, v_owner, 'task', r.task, v_cluster, v_scope, r.priority, r.sort_order,
      r.created_at, r.notes, r.link_url, r.link_title, r.link_thumb, r.locked, r.color, r.adds_notes, r.adds_links, r.adds_related, r.adds_flags,
      r.subject, r.hide_contents_front, r.front_hidden, r.key_slot_1, r.key_slot_2, r.key_slot_3,
      r.board_id, r.col, r.person, r.reviewed_by, r.due_date, r.start_date, r.completed_date, r.budget, r.verified, r.pro, r.grow, r.grow_note,
      coalesce(r.archived, false), r.situation, r.hangup_since, r.hangup_header_id, r.is_routine, r.routine_freq, r.routine_custom, r.routine_day,
      r.due_time, r.start_time, r.start_escalated_for, r.due_escalated_for, r.overdue_flash_shown_for, r.start_overdue_flash_shown_for,
      r.trashed_at, r.personal_rank, r.personal_col, r.shared_to_board_id, r.shared_col, r.shared_rank, r.source_header_id, r.topic_label,
      r.lock_reason, r.project_header_id, r.adds_checklist, r.adds_due, r.adds_routine, r.adds_budget, r.adds_start, r.hide_primary_badge,
      r.adds_org, r.org_name, r.org_eyebrow, r.logo_url, r.logo_w, r.logo_h, r.logo_dx, r.logo_dy, r.plan_step_id, coalesce(r.needs_plan, false), r.goal_header_id)
    on conflict (id) do update set
      text_content = excluded.text_content, cluster_id = excluded.cluster_id, topic_scope_id = excluded.topic_scope_id,
      priority = excluded.priority, sort_order = excluded.sort_order, created_at = excluded.created_at, notes = excluded.notes,
      link_url = excluded.link_url, link_title = excluded.link_title, link_thumb = excluded.link_thumb, locked = excluded.locked,
      color = excluded.color, adds_notes = excluded.adds_notes, adds_links = excluded.adds_links, adds_related = excluded.adds_related,
      adds_flags = excluded.adds_flags, subject = excluded.subject, hide_contents_front = excluded.hide_contents_front,
      front_hidden = excluded.front_hidden, key_slot_1 = excluded.key_slot_1, key_slot_2 = excluded.key_slot_2, key_slot_3 = excluded.key_slot_3,
      board_id = excluded.board_id, col = excluded.col, person = excluded.person, reviewed_by = excluded.reviewed_by,
      due_date = excluded.due_date, start_date = excluded.start_date, completed_date = excluded.completed_date, budget = excluded.budget,
      verified = excluded.verified, pro = excluded.pro, grow = excluded.grow, grow_note = excluded.grow_note, archived = excluded.archived,
      situation = excluded.situation, hangup_since = excluded.hangup_since, hangup_header_id = excluded.hangup_header_id,
      is_routine = excluded.is_routine, routine_freq = excluded.routine_freq, routine_custom = excluded.routine_custom,
      routine_day = excluded.routine_day, due_time = excluded.due_time, start_time = excluded.start_time,
      start_escalated_for = excluded.start_escalated_for, due_escalated_for = excluded.due_escalated_for,
      overdue_flash_shown_for = excluded.overdue_flash_shown_for, start_overdue_flash_shown_for = excluded.start_overdue_flash_shown_for,
      trashed_at = excluded.trashed_at, personal_rank = excluded.personal_rank, personal_col = excluded.personal_col,
      shared_to_board_id = excluded.shared_to_board_id, shared_col = excluded.shared_col, shared_rank = excluded.shared_rank,
      source_header_id = excluded.source_header_id, topic_label = excluded.topic_label, lock_reason = excluded.lock_reason,
      project_header_id = excluded.project_header_id, adds_checklist = excluded.adds_checklist, adds_due = excluded.adds_due,
      adds_routine = excluded.adds_routine, adds_budget = excluded.adds_budget, adds_start = excluded.adds_start,
      hide_primary_badge = excluded.hide_primary_badge, adds_org = excluded.adds_org, org_name = excluded.org_name,
      org_eyebrow = excluded.org_eyebrow, logo_url = excluded.logo_url, logo_w = excluded.logo_w, logo_h = excluded.logo_h,
      logo_dx = excluded.logo_dx, logo_dy = excluded.logo_dy, plan_step_id = excluded.plan_step_id,
      needs_plan = excluded.needs_plan, goal_header_id = excluded.goal_header_id
    where public.ideas.content_type = 'task';
  if r.source_header_id is not null then
    v_hname := trim(case when r.task like 'Develop %' then substring(r.task from 9) else r.task end);
    if v_hname <> '' then update public.ideas set text_content = v_hname where id = r.source_header_id and text_content is distinct from v_hname; end if;
    update public.ideas set locked = r.locked where id = r.source_header_id and locked is distinct from r.locked;
  end if;
end $fn$;

-- 6. The view's write trigger, now writing one table -------------------------
create or replace function public.bb_cards_iud()
 returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  c_master constant uuid := '63eae2df-3b03-4c21-b4a9-7add6ee84fb6';
  v_in_tree boolean;
  v_trusted boolean := (auth.uid() is null or pg_trigger_depth() > 1);
begin
  if tg_op = 'INSERT' then
    if not v_trusted and not (public.can_edit_board(NEW.board_id) or exists (select 1 from public.briefing_boards bb where bb.id=NEW.board_id and bb.user_id=auth.uid())) then
      raise exception 'new row violates row-level security policy for table "briefing_cards"' using errcode = '42501';
    end if;
    if NEW.board_id = c_master then
      perform public.bb_save_master_card(NEW);
    else
      insert into public.briefing_cards_legacy select (jsonb_populate_record(null::public.briefing_cards_legacy, to_jsonb(NEW))).*;
    end if;
    return NEW;
  elsif tg_op = 'UPDATE' then
    if not v_trusted and not (public.can_edit_board(OLD.board_id) or exists (select 1 from public.briefing_boards bb where bb.id=OLD.board_id and bb.user_id=auth.uid()) or (OLD.shared_to_board_id is not null and (public.can_edit_board(OLD.shared_to_board_id) or exists (select 1 from public.briefing_boards bs where bs.id=OLD.shared_to_board_id and bs.user_id=auth.uid())))) then return null; end if;
    v_in_tree := exists (select 1 from public.ideas where id = OLD.id and board_id is not null);
    if NEW.board_id = c_master then
      perform set_config('bb.moving','1',true);
      perform public.bb_save_master_card(NEW);
      delete from public.briefing_cards_legacy where id = OLD.id;
      perform set_config('bb.moving','0',true);
    elsif v_in_tree then
      perform set_config('bb.moving','1',true);
      delete from public.ideas where id = OLD.id and content_type = 'task';
      perform set_config('bb.moving','0',true);
      insert into public.briefing_cards_legacy select (jsonb_populate_record(null::public.briefing_cards_legacy, to_jsonb(NEW))).*;
    else
      update public.briefing_cards_legacy set id = NEW.id, board_id = NEW.board_id, col = NEW.col, task = NEW.task, person = NEW.person, reviewed_by = NEW.reviewed_by, due_date = NEW.due_date, start_date = NEW.start_date, completed_date = NEW.completed_date, budget = NEW.budget, priority = NEW.priority, verified = NEW.verified, pro = NEW.pro, grow = NEW.grow, grow_note = NEW.grow_note, archived = NEW.archived, key_slot_1 = NEW.key_slot_1, key_slot_2 = NEW.key_slot_2, key_slot_3 = NEW.key_slot_3, sort_order = NEW.sort_order, created_at = NEW.created_at, notes = NEW.notes, situation = NEW.situation, hangup_since = NEW.hangup_since, hangup_header_id = NEW.hangup_header_id, is_routine = NEW.is_routine, routine_freq = NEW.routine_freq, routine_custom = NEW.routine_custom, due_time = NEW.due_time, start_time = NEW.start_time, start_escalated_for = NEW.start_escalated_for, due_escalated_for = NEW.due_escalated_for, trashed_at = NEW.trashed_at, personal_rank = NEW.personal_rank, personal_col = NEW.personal_col, shared_to_board_id = NEW.shared_to_board_id, shared_col = NEW.shared_col, shared_rank = NEW.shared_rank, link_url = NEW.link_url, link_title = NEW.link_title, link_thumb = NEW.link_thumb, source_header_id = NEW.source_header_id, topic_label = NEW.topic_label, locked = NEW.locked, lock_reason = NEW.lock_reason, overdue_flash_shown_for = NEW.overdue_flash_shown_for, color = NEW.color, adds_checklist = NEW.adds_checklist, adds_due = NEW.adds_due, adds_routine = NEW.adds_routine, adds_budget = NEW.adds_budget, adds_notes = NEW.adds_notes, adds_links = NEW.adds_links, adds_start = NEW.adds_start, adds_related = NEW.adds_related, adds_flags = NEW.adds_flags, start_overdue_flash_shown_for = NEW.start_overdue_flash_shown_for, hide_primary_badge = NEW.hide_primary_badge, project_header_id = NEW.project_header_id, subject = NEW.subject, hide_contents_front = NEW.hide_contents_front, routine_day = NEW.routine_day, adds_org = NEW.adds_org, org_name = NEW.org_name, org_eyebrow = NEW.org_eyebrow, logo_url = NEW.logo_url, logo_w = NEW.logo_w, logo_h = NEW.logo_h, logo_dx = NEW.logo_dx, logo_dy = NEW.logo_dy, front_hidden = NEW.front_hidden where id = OLD.id;
    end if;
    return NEW;
  else
    if not v_trusted and not (public.can_edit_board(OLD.board_id) or exists (select 1 from public.briefing_boards bb where bb.id=OLD.board_id and bb.user_id=auth.uid()) or (OLD.shared_to_board_id is not null and (public.can_edit_board(OLD.shared_to_board_id) or exists (select 1 from public.briefing_boards bs where bs.id=OLD.shared_to_board_id and bs.user_id=auth.uid())))) then return null; end if;
    delete from public.ideas where id = OLD.id and content_type = 'task';
    delete from public.briefing_cards_legacy where id = OLD.id;
    return OLD;
  end if;
end $fn$;

-- 7. Clean-up when a card row is deleted (same job the old trigger did) -------
create or replace function public.bb_card_gone()
 returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare v_id uuid;
begin
  v_id := coalesce(to_jsonb(old)->>'idea_id', to_jsonb(old)->>'id')::uuid;
  if coalesce(current_setting('bb.moving', true),'0') = '1' then return old; end if;
  delete from public.briefing_checklist_items where card_id = v_id;
  delete from public.briefing_card_links where card_id = v_id or target_card_id = v_id;
  return old;
end $fn$;

-- 8. NEEDS PLAN routing, plan advance and plan step marking, now on ideas -----
create or replace function public.bb_needs_plan_route()
 returns trigger language plpgsql set search_path to 'public' as $fn$
begin
  if new.needs_plan then
    -- A NEEDS PLAN card cannot sit in New or a DO column: it is a hang-up.
    if new.col in ('new','do-h','do-m','do-l') then
      new.col := 'hangups';
      if new.hangup_since is null then new.hangup_since := current_date; end if;
    -- Flagging a card that is in DOING also sends it to HANG-UPS (the moment the flag turns on).
    -- Moving it back to DOING afterwards is allowed and means: build the plan now.
    elsif new.col = 'doing' and (tg_op = 'INSERT' or not coalesce(old.needs_plan, false)) then
      new.col := 'hangups';
      if new.hangup_since is null then new.hangup_since := current_date; end if;
    end if;
  end if;
  return new;
end $fn$;

create or replace function public.plan_advance_on_done()
 returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  cur   public.ideas%rowtype;
  nxt   public.ideas%rowtype;
  v_new uuid := gen_random_uuid();
  v_col text;
  v_task text;
  v_kids text;
begin
  if new.plan_step_id is null then return new; end if;
  if new.col is distinct from 'done' or old.col is not distinct from 'done' then return new; end if;
  select * into cur from public.ideas where id = new.plan_step_id;
  if not found then return new; end if;
  select * into nxt from public.ideas
   where content_type = 'header' and cluster_id = cur.cluster_id
     and sort_order > cur.sort_order and coalesce(step_time,'') <> ''
   order by sort_order asc limit 1;
  if not found then return new; end if;
  if exists (select 1 from public.ideas t
              where t.plan_step_id = nxt.id and t.archived = false and t.trashed_at is null) then
    return new;
  end if;
  select string_agg(coalesce(nullif(c.subject,''), c.text_content, c.idea_text), '; ' order by c.sort_order)
    into v_kids from public.ideas c where c.cluster_id = nxt.id and c.content_type = 'text';
  v_task := coalesce(nxt.text_content, nxt.idea_text, '(plan step)')
            || case when v_kids is not null then ': ' || v_kids else '' end;
  v_col := case coalesce(new.priority,'')
             when 'HH' then 'do-h' when 'H' then 'do-h'
             when 'MH' then 'do-m' when 'M' then 'do-m' when 'ML' then 'do-m'
             when 'L' then 'do-l' else 'new' end;
  insert into public.ideas (id, user_id, content_type, text_content, subject, hide_contents_front,
                            cluster_id, project_id, topic_scope_id, storyboard_kind, priority, library_shared, sort_order,
                            board_id, col, person, reviewed_by, archived, project_header_id, hide_primary_badge, plan_step_id)
  values (v_new, new.user_id, 'task', v_task, coalesce(nxt.text_content, nxt.idea_text), true,
          new.cluster_id, new.project_id, new.topic_scope_id, new.storyboard_kind, coalesce(new.priority,''), new.library_shared, 0,
          new.board_id, v_col, new.person, new.reviewed_by, false, new.project_header_id, new.hide_primary_badge, nxt.id);
  insert into public.card_roles (card_type, card_id, role, user_id, is_parent_connection, added_by,
                                 is_key, is_primary, is_primary_stakeholder, is_board_member, status, pass_down)
  select r.card_type, v_new, r.role, r.user_id, r.is_parent_connection, r.added_by,
         r.is_key, r.is_primary, r.is_primary_stakeholder, r.is_board_member, r.status, r.pass_down
    from public.card_roles r
   where r.card_id = new.id and r.card_type = 'briefing_card' and r.role = 'primary';
  return new;
end
$fn$;

create or replace function public.move_card_to_topic(p_card_id uuid, p_topic_id uuid)
 returns jsonb language plpgsql set search_path to 'public' as $fn$
declare
  n int; v_goal uuid; v_goal_cards int; v_moved_plan boolean := false; v_step_ids uuid[] := '{}';
  v_old uuid; v_old_name text; v_note text; v_notes text;
begin
  if p_card_id is null or p_topic_id is null then raise exception 'card and topic are both required'; end if;
  if not exists (select 1 from public.ideas where id = p_topic_id and content_type = 'header') then
    raise exception 'that topic was not found';
  end if;

  select cluster_id into v_old from public.ideas where id = p_card_id;
  select coalesce(nullif(subject,''), nullif(idea_text,''), nullif(text_content,'')) into v_old_name from public.ideas where id = v_old;

  update public.briefing_cards set project_header_id = p_topic_id where id = p_card_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'the card was not moved (no permission, or it was not found)'; end if;

  if v_old is distinct from p_topic_id and v_old_name is not null then
    v_note := 'Moved from TOPIC: ' || v_old_name || '.';
    update public.ideas set notes = coalesce(nullif(notes,'') || E'\n', '') || v_note, adds_notes = true
     where id = p_card_id returning notes into v_notes;
  else
    select notes into v_notes from public.ideas where id = p_card_id;
  end if;

  select goal_header_id into v_goal from public.ideas where id = p_card_id;
  if v_goal is not null and v_goal <> p_topic_id then
    select count(*) into v_goal_cards from public.ideas where goal_header_id = v_goal;
    if v_goal_cards = 1 then
      if exists (
        with recursive sub as (
          select id from public.ideas where id = v_goal
          union all
          select i.id from public.ideas i join sub s on i.cluster_id = s.id where i.id <> i.cluster_id
        ) select 1 from sub where id = p_topic_id
      ) then
        raise exception 'a plan cannot be moved under itself';
      end if;
      update public.ideas set cluster_id = p_topic_id where id = v_goal and cluster_id is distinct from p_topic_id;
      get diagnostics n = row_count;
      v_moved_plan := n = 1;
      if v_moved_plan then
        with recursive sub as (
          select id from public.ideas where id = v_goal
          union all
          select i.id from public.ideas i join sub s on i.cluster_id = s.id where i.id <> i.cluster_id
        ), upd as (
          update public.briefing_cards bc set project_header_id = p_topic_id
           where bc.id <> p_card_id
             and bc.id in (select i2.id from public.ideas i2 where i2.plan_step_id in (select id from sub))
             and bc.project_header_id is distinct from p_topic_id
          returning bc.id
        )
        select coalesce(array_agg(id), '{}') into v_step_ids from upd;
      end if;
    end if;
  end if;

  return jsonb_build_object('card', p_card_id, 'topic', p_topic_id, 'moved_plan', v_moved_plan, 'step_card_ids', to_jsonb(v_step_ids), 'notes', v_notes);
end $fn$;

-- unused leftover that wrote to the side table (no trigger used it)
drop function if exists public.bb_mirror_card();
drop function if exists public.task_fields_needs_plan_route();

-- 9. Triggers on ideas (after the copy, so they do not fire on it) -------------
create trigger bb_needs_plan_route before insert or update on public.ideas
  for each row when (new.board_id is not null) execute function public.bb_needs_plan_route();
create trigger bb_card_gone_ideas after delete on public.ideas
  for each row when (old.content_type = 'task') execute function public.bb_card_gone();
create trigger bb_plan_advance after update of col on public.ideas
  for each row when (new.plan_step_id is not null and new.col = 'done' and old.col is distinct from 'done')
  execute function public.plan_advance_on_done();
create trigger bb_plan_mark_done after update of col on public.ideas
  for each row when (new.plan_step_id is not null and new.col is distinct from old.col)
  execute function public.plan_mark_step_done();

-- 10. Retire the side table (kept as a rollback copy) -------------------------
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.task_fields'::regclass and contype = 'f' loop
    execute format('alter table public.task_fields drop constraint %I', c.conname);
  end loop;
end $$;
alter publication supabase_realtime drop table public.task_fields;
alter table public.task_fields rename to task_fields_retired_20261016;
revoke all on public.task_fields_retired_20261016 from anon, authenticated;

-- 11. Indexes for the new columns ---------------------------------------------
create index if not exists ideas_board_id_idx on public.ideas (board_id) where board_id is not null;
create index if not exists ideas_plan_step_id_idx on public.ideas (plan_step_id) where plan_step_id is not null;
create index if not exists ideas_goal_header_id_idx on public.ideas (goal_header_id) where goal_header_id is not null;
create index if not exists ideas_hangup_header_id_idx on public.ideas (hangup_header_id) where hangup_header_id is not null;
create index if not exists ideas_source_header_id_idx on public.ideas (source_header_id) where source_header_id is not null;
create index if not exists ideas_project_header_id_idx on public.ideas (project_header_id) where project_header_id is not null;

comment on column public.ideas.board_id is 'ONE ROW PER CARD (Oct 16 2026): a card on a Briefing Board has board_id set; col says which column it sits in (new, do-h, do-m, do-l, doing, hangups, done). Replaces the old task_fields side table.';
