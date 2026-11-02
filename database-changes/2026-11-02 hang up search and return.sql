-- Nov 2 2026 (Larry): the VISION search belongs to the HANG UP, not to DOING. The PRIMARY decides "I do not know how to do this" and that move
-- into HANG-UPS starts the search; a Hang Up that gets a GOAL returns to the column it LAST WAS IN (usually DOING), not always TO DO.
-- Applied through Supabase SQL. Both functions already had triggers in place (task_fields_hangup_vision_ins / _upd, task_fields_needs_plan_route).
--
-- Previous bodies, for restoring: both were no-ops (see "2026-10-20 hang-up vision check.sql"):
--   task_fields_hangup_vision():     return null;
--   task_fields_needs_plan_route():  return new;

create or replace function public.task_fields_hangup_vision()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  -- A card entering HANG-UPS: look for a VISION header matching its subject. None -> add one and flag the card NEEDS VISION; empty -> flag only;
  -- developed -> leave alone. Same single function the card back's Vision switch uses.
  perform public.ensure_vision_header(new.idea_id);
  return null;
end $$;

create or replace function public.task_fields_needs_plan_route()
returns trigger language plpgsql set search_path to 'public' as $$
declare v_pri text; v_from text;
begin
  -- A Hang Up that has just been given a GOAL is unstuck: it goes back to the column it last was in.
  -- Fallback (no usable last column): its own priority column, TO DO when it has no priority.
  if tg_op = 'UPDATE' and new.col = 'hangups' and new.goal_header_id is not null
     and old.goal_header_id is distinct from new.goal_header_id then
    v_from := coalesce(new.hangup_from, '');
    if v_from not in ('new','do-h','do-m','do-l','doing') then
      select coalesce(priority,'') into v_pri from public.ideas where id = new.idea_id;
      v_from := case v_pri when 'HH' then 'do-h' when 'H' then 'do-h' when 'MH' then 'do-m' when 'M' then 'do-m'
                           when 'ML' then 'do-m' when 'L' then 'do-l' else 'new' end;
    end if;
    new.col := v_from;
    new.hangup_since := null;
  end if;
  return new;
end $$;

-- LATER SAME DAY (Larry): "The search should be ONLY in the TOPIC selector." The database no longer searches or adds a VISION header when a card enters
-- HANG-UPS (it matched a plan header as if it were a vision and left an empty header behind). The search now happens on the card's screen, in the TOPIC list:
-- numbered matches plus the (+). task_fields_hangup_vision() is a no-op again; the "goes back to its last column" part above stays.
create or replace function public.task_fields_hangup_vision()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  return null;
end $$;
