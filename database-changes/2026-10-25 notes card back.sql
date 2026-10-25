-- Applied to the database Oct 25 2026 (Task: build the NOTES card back).
-- Oct 25 2026 (Larry): a NOTES card back has OPTIONS Source (with its date), Attachments and Gem.
--   source_date : the date that goes with the note's Source (free text, as typed)
--   is_gem      : the note has been made a gem
--   attachments : the files added to the note, a list of {url, name, size}
-- The Source itself reuses the existing link_url / link_title columns.
alter table public.ideas add column if not exists source_date text;
alter table public.ideas add column if not exists is_gem boolean not null default false;
alter table public.ideas add column if not exists attachments jsonb not null default '[]'::jsonb;
