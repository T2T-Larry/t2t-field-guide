-- Faster access checks, Nov 26 2026 (Larry: "Can we speed up the BB?  YES! do it").
-- WHY: these checks run once for every card read or saved. Written as plain SQL functions with a fixed search_path they were planned again on every
-- single call (about 1 ms each; most of the Briefing Board's load time). As plpgsql functions the database keeps the plan and reuses it.
-- WHAT CHANGES: speed only. Each query below is the earlier one, unchanged; same arguments, same answers, same grants.
-- UNDO: the earlier versions are the same bodies written as "language sql".

create or replace function public.topic_chain(p_id uuid)
 returns table(id uuid) language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return query
  with recursive up as (
    select i.id as node, i.cluster_id as parent, 0 as d from public.ideas i where i.id = p_id
    union all
    select p.id, p.cluster_id, u.d + 1 from public.ideas p join up u on p.id = u.parent where u.d < 40
  )
  select up.node from up;
end $function$;

create or replace function public.is_storyboard_member(p_project_id uuid)
 returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return
    exists (select 1 from public.topic_chain(p_project_id) c
            join public.storyboard_members sm on sm.project_id = c.id and sm.user_id = auth.uid())
    or exists (select 1 from public.topic_chain(p_project_id) c
            join public.briefing_boards b on b.storyboard_project_id = c.id
            join public.board_members bm on bm.board_id = b.id and bm.user_id = auth.uid())
    or exists (select 1 from public.topic_chain(p_project_id) c
            join public.card_roles cr on cr.card_type = 'idea' and cr.card_id = c.id and cr.user_id = auth.uid()
            where cr.role in ('primary','team','facilitator','facilitator_qualified') or (cr.role = 'stakeholder' and cr.is_key = true))
    or exists (select 1 from public.card_roles cr
            where cr.card_type = 'idea' and cr.card_id = p_project_id and cr.user_id = auth.uid()
              and cr.role in ('primary','stakeholder','cast_member','facilitator','facilitator_qualified','guest','team'));
end $function$;

create or replace function public.can_edit_storyboard(p_project_id uuid)
 returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return
    exists (select 1 from public.topic_chain(p_project_id) c
            join public.storyboard_members sm on sm.project_id = c.id and sm.user_id = auth.uid() and sm.access_level = 'edit')
    or exists (select 1 from public.topic_chain(p_project_id) c
            join public.briefing_boards b on b.storyboard_project_id = c.id
            join public.board_members bm on bm.board_id = b.id and bm.user_id = auth.uid() and bm.access_level = 'edit')
    or exists (select 1 from public.topic_chain(p_project_id) c
            join public.card_roles cr on cr.card_type = 'idea' and cr.card_id = c.id and cr.user_id = auth.uid()
            where cr.role in ('primary','team','facilitator','facilitator_qualified') or (cr.role = 'stakeholder' and cr.is_key = true));
end $function$;

create or replace function public.board_inherits_access(p_board_id uuid, p_edit boolean)
 returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return exists (
    select 1 from public.briefing_boards b
    where b.id = p_board_id and b.storyboard_project_id is not null
      and (
        exists (select 1 from public.topic_chain(b.storyboard_project_id) c
                join public.storyboard_members sm on sm.project_id = c.id and sm.user_id = auth.uid()
                where (not p_edit or sm.access_level = 'edit'))
        or exists (select 1 from public.topic_chain(b.storyboard_project_id) c
                join public.briefing_boards b2 on b2.storyboard_project_id = c.id
                join public.board_members bm on bm.board_id = b2.id and bm.user_id = auth.uid()
                where (not p_edit or bm.access_level = 'edit'))
        or exists (select 1 from public.topic_chain(b.storyboard_project_id) c
                join public.card_roles cr on cr.card_type = 'idea' and cr.card_id = c.id and cr.user_id = auth.uid()
                where cr.role in ('primary','team','facilitator','facilitator_qualified')
                   or (cr.role = 'stakeholder' and cr.is_key = true))
      )
  );
end $function$;

create or replace function public.is_board_member(p_board_id uuid)
 returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return exists(select 1 from public.board_members bm where bm.board_id = p_board_id and bm.user_id = auth.uid())
         or public.board_inherits_access(p_board_id, false);
end $function$;

create or replace function public.can_edit_board(p_board_id uuid)
 returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return exists(select 1 from public.board_members bm where bm.board_id = p_board_id and bm.user_id = auth.uid() and bm.access_level = 'edit')
         or public.board_inherits_access(p_board_id, true);
end $function$;
