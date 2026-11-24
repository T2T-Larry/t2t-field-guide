-- Nov 24 2026 (Larry: BOARD COLOR SELECTOR). ideas.board_bg_color (already in the project) now holds a board color on ANY card, not only a root.
-- NULL = follow the card above. No schema change was needed; this note records the new meaning.
alter table public.ideas add column if not exists board_bg_color text;
