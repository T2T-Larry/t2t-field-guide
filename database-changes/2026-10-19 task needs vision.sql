-- Oct 19 2026: VISION flag on task cards (Larry: checking Vision adds a VISION badge, meaning the task needs a Vision statement).
-- task_fields.needs_vision boolean, default false; briefing_cards view re-created with one new last column, needs_vision.
-- The screen writes the flag straight to task_fields (narrow write, like needs_plan), so a whole-card save never changes it.
alter table public.task_fields add column if not exists needs_vision boolean not null default false;
-- (view re-created in Supabase with the previous column list plus tf.needs_vision at the end)
