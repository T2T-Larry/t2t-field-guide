-- NOT YET APPLIED to the database (waiting on Larry's go-ahead, Oct 24 2026). Remove this line once it has been run.
-- Oct 24 2026 (Larry): PROCESS is an option on every kind of card. It holds a list of steps you shape yourself: add, edit, rearrange.
-- One row per step, keyed to the card (every card is a row in ideas), so it works for tasks, ideas, notes and every other kind.
--   state: 'suggested' = light text offered by the card kind; 'mine' = accepted or typed by the user (dark); 'done' = ticked off.
-- Steps never block anything. Whether the option is switched on rides the existing word list (ideas.front_hidden: "on:process"), so no other column is needed.
create table if not exists public.card_process_steps (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  sort_order integer not null default 0,
  text_content text not null default '',
  state text not null default 'mine' check (state in ('suggested','mine','done')),
  created_at timestamptz not null default now()
);
create index if not exists card_process_steps_idea_idx on public.card_process_steps (idea_id, sort_order);
alter table public.card_process_steps enable row level security;
create policy "card_process_steps - select" on public.card_process_steps for select
  using (exists (select 1 from ideas i where i.id = card_process_steps.idea_id));
create policy "card_process_steps - insert" on public.card_process_steps for insert
  with check (exists (select 1 from ideas i where i.id = card_process_steps.idea_id and (i.user_id = (select auth.uid()) or i.topic_owner_user_id = (select auth.uid()) or (i.topic_scope_id is not null and can_edit_storyboard(i.topic_scope_id)))));
create policy "card_process_steps - update" on public.card_process_steps for update
  using (exists (select 1 from ideas i where i.id = card_process_steps.idea_id and (i.user_id = (select auth.uid()) or i.topic_owner_user_id = (select auth.uid()) or (i.topic_scope_id is not null and can_edit_storyboard(i.topic_scope_id)))))
  with check (exists (select 1 from ideas i where i.id = card_process_steps.idea_id and (i.user_id = (select auth.uid()) or i.topic_owner_user_id = (select auth.uid()) or (i.topic_scope_id is not null and can_edit_storyboard(i.topic_scope_id)))));
create policy "card_process_steps - delete" on public.card_process_steps for delete
  using (exists (select 1 from ideas i where i.id = card_process_steps.idea_id and (i.user_id = (select auth.uid()) or i.topic_owner_user_id = (select auth.uid()) or (i.topic_scope_id is not null and can_edit_storyboard(i.topic_scope_id)))));
