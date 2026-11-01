-- Nov 1 2026 -- LINK. Every card can have up to 3 LINKS (slots 1, 2, 3). Each slot points to another card, topic or header in the one tree.
-- Slot number decides the arrow color (1 lime green, 2 orange, 3 hot pink). One small table serves every board, so no card table or view changes.
-- If the target row is deleted outright the link simply disappears (cascade); a target that is only trashed or archived is detected in the app.
create table if not exists card_links (
  idea_id uuid not null references ideas(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  target_idea_id uuid not null references ideas(id) on delete cascade,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (idea_id, slot)
);
create index if not exists card_links_target_idx on card_links(target_idea_id);
alter table card_links enable row level security;
drop policy if exists card_links_all on card_links;
create policy card_links_all on card_links for all to authenticated using (true) with check (true);
-- The Stringer flag is retired (Larry, Nov 1 2026): its target column goes away.
alter table custom_keys drop column if exists target_idea_id;
-- To undo: drop table card_links;
