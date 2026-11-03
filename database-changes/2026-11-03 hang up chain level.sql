-- Nov 3 2026 (Larry): a Hang Up can be passed up the line of KEY STAKEHOLDERs (the PRIMARY of each topic above the card, nearest first, the top
-- person last). hangup_level says how many steps up it has been passed: 0 = still with the card's own PRIMARY, 1 = with the nearest stakeholder, and so on.
-- The card face shows the card's PRIMARY and then the stakeholders up to the one holding it, so the original PRIMARY can see where it has gone.
-- Applied through Supabase. To undo: alter table public.task_fields drop column hangup_level;

alter table public.task_fields add column if not exists hangup_level integer not null default 0;
