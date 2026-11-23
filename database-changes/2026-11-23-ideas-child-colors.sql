-- Nov 23 2026 (Larry: COLOR SELECTOR). A card can set the TOPIC, HEADERS and SUBBERS colors for every card beneath it that has no color of its own.
-- Shape: {"topic":"#hex","headers":"#hex","subbers":"#hex"}; missing key = follow the card above. Already applied to the live project.
alter table public.ideas add column if not exists child_colors jsonb;
