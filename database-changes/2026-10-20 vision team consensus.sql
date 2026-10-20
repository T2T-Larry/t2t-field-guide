-- Oct 20 2026 (Larry): a Vision Statement is complete by CONSENSUS. Everyone working the task agrees the headers cover what they can
-- think of, enough to take a shot; anything that arises later is fine (so it can be reopened). The PRIMARY assigns the team with the
-- Key Stakeholder's approval. Experiment: first used on the Hang Up System task (team = Larry and Claude).
-- One row per team member per card. The NEEDS VISION badge clears when every member has agreed, and comes back if a member is added or
-- someone withdraws their agreement. Applied through Supabase SQL.

create table if not exists public.hangup_vision_team (
  idea_id   uuid not null references public.ideas(id) on delete cascade,
  member    text not null,
  agreed    boolean not null default false,
  agreed_at timestamptz,
  primary key (idea_id, member)
);

alter table public.hangup_vision_team enable row level security;

drop policy if exists hangup_vision_team_owner on public.hangup_vision_team;
create policy hangup_vision_team_owner on public.hangup_vision_team
  for all to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.ideas i where i.id = idea_id and i.user_id = auth.uid()));

create or replace function public.hangup_vision_consensus() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare v_idea uuid; v_total int; v_open int;
begin
  v_idea := coalesce(new.idea_id, old.idea_id);
  select count(*), count(*) filter (where not agreed) into v_total, v_open
    from hangup_vision_team where idea_id = v_idea;
  if v_total > 0 then
    update task_fields set needs_vision = (v_open > 0) where idea_id = v_idea;
  end if;
  return null;
end $$;

drop trigger if exists hangup_vision_consensus_trg on public.hangup_vision_team;
create trigger hangup_vision_consensus_trg
  after insert or update or delete on public.hangup_vision_team
  for each row execute function public.hangup_vision_consensus();

-- First use: the Hang Up System task. Larry and Claude are the whole team.
insert into public.hangup_vision_team (idea_id, member) values
  ('367d211d-b94d-4f5d-9d6b-39be34171ddd', 'Larry'),
  ('367d211d-b94d-4f5d-9d6b-39be34171ddd', 'Claude')
on conflict do nothing;
