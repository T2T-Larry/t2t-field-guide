-- Applied to the database Oct 25 2026 (Task: every pencil opens the NOTES card).
-- Oct 25 2026 (Larry): "All pencils!!!!" -- the pencil on any card opens a NOTES card for it. A note is a card of its own that lives in the bucket of the
-- card it was written on (its cluster_id is that card), so the note is flagged: is_note.
alter table public.ideas add column if not exists is_note boolean not null default false;
create index if not exists ideas_note_children_idx on public.ideas (cluster_id) where is_note;
