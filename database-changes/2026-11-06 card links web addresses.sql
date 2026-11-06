-- Nov 6 2026 (Larry): LINK works for outside web addresses as well as places inside T2T.
-- A card_links row now holds EITHER a target place (target_idea_id + board_kind) OR a web address (url, with its title and thumbnail).
-- Backup of every row before the change: card_links_backup_20261106.
create table if not exists public.card_links_backup_20261106 as select * from public.card_links;
alter table public.card_links_backup_20261106 enable row level security;
alter table public.card_links add column if not exists url text;
alter table public.card_links add column if not exists url_title text;
alter table public.card_links add column if not exists url_thumb text;
alter table public.card_links alter column target_idea_id drop not null;
alter table public.card_links drop constraint if exists card_links_target_check;
alter table public.card_links add constraint card_links_target_check check (target_idea_id is not null or url is not null);
