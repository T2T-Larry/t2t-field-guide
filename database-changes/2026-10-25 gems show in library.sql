-- Applied to the database Oct 25 2026 (Task: Gems show in the Library).
-- A note marked Gem now shows on the Library Gems board. The board keeps each note-gem's
-- look and spot on the note itself, since it has no row in the gems table.
--   gem_shape / gem_color : the shape and color its gem tile wears
--   gem_pos_x / gem_pos_y : where it was dragged on the board
--   gem_hearted           : the heart on its tile
alter table public.ideas add column if not exists gem_shape text;
alter table public.ideas add column if not exists gem_color text;
alter table public.ideas add column if not exists gem_pos_x numeric;
alter table public.ideas add column if not exists gem_pos_y numeric;
alter table public.ideas add column if not exists gem_hearted boolean not null default false;
