-- Oct 25 2026 (Larry): checking a topic completed moves its task to DONE; unchecking must mirror it and move the task back out of DONE.
-- Before this, topic_check_finishes_tasks only handled checking, so unchecking left the card in DONE and the two fell out of step.
-- NOT YET APPLIED to the live database (the apply was blocked as a production change; waiting on Larry's go-ahead).

create or replace function public.topic_check_finishes_tasks()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Checking a topic completed finishes its tasks (move to DONE).
  if new.step_done is true and old.step_done is distinct from true then
    update public.task_fields t
       set col = 'done', completed_date = coalesce(t.completed_date, current_date)
     where (t.workspace_header_id = new.id or t.hangup_header_id = new.id or t.plan_step_id = new.id)
       and coalesce(t.archived,false) = false and t.trashed_at is null
       and t.col is distinct from 'done';
  end if;
  -- Unchecking mirrors it: tasks sitting in DONE go back to DOING, with the same reset as leaving DONE by hand.
  if new.step_done is not true and old.step_done is true then
    update public.task_fields t
       set col = 'doing', completed_date = null, verified = false, pro = false, grow = false
     where (t.workspace_header_id = new.id or t.hangup_header_id = new.id or t.plan_step_id = new.id)
       and coalesce(t.archived,false) = false and t.trashed_at is null
       and t.col = 'done';
  end if;
  return new;
end $function$;
