-- Nov 11 2026 (Larry: "Delete the auto note feature that signals the source of a moved card").
-- move_card_to_topic no longer writes a "Moved from TOPIC: ..." line into the card's Notes. Everything else it does is unchanged.
CREATE OR REPLACE FUNCTION public.move_card_to_topic(p_card_id uuid, p_topic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  n int; v_goal uuid; v_goal_cards int; v_moved_plan boolean := false; v_step_ids uuid[] := '{}';
  v_notes text;
begin
  if p_card_id is null or p_topic_id is null then raise exception 'card and topic are both required'; end if;
  if not exists (select 1 from public.ideas where id = p_topic_id and content_type = 'header') then
    raise exception 'that topic was not found';
  end if;

  update public.briefing_cards set project_header_id = p_topic_id where id = p_card_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'the card was not moved (no permission, or it was not found)'; end if;

  select notes into v_notes from public.ideas where id = p_card_id;

  select goal_header_id into v_goal from public.task_fields where idea_id = p_card_id;
  if v_goal is not null and v_goal <> p_topic_id then
    select count(*) into v_goal_cards from public.task_fields where goal_header_id = v_goal;
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
             and bc.id in (select tf.idea_id from public.task_fields tf where tf.plan_step_id in (select id from sub))
             and bc.project_header_id is distinct from p_topic_id
          returning bc.id
        )
        select coalesce(array_agg(id), '{}') into v_step_ids from upd;
      end if;
    end if;
  end if;

  return jsonb_build_object('card', p_card_id, 'topic', p_topic_id, 'moved_plan', v_moved_plan, 'step_card_ids', to_jsonb(v_step_ids), 'notes', v_notes);
end $function$;
