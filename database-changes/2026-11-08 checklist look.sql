-- Nov 8 2026 (Larry): a card can show a CHECKLIST look -- a check box ahead of its words.
-- checklist_look = true turns the look on; box_checked = the tick, saved on the card itself.
alter table public.ideas add column if not exists checklist_look boolean, add column if not exists box_checked boolean;
-- First use: the "Reasons to be SMART might include" list under PLAN > When do we need to be SMART?
update public.ideas set checklist_look = true where cluster_id = 'c0333810-d294-4740-a329-afe891eab9b8' and sort_order >= 3;
