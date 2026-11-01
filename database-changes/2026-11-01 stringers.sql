-- Nov 1 2026 -- STRINGERS. A Stringer is a signal flag that also points to somewhere else in the one tree.
-- The place it points to is one optional column on the flag itself (custom_keys.target_idea_id): any card, header or topic row in ideas.
-- Every card carrying that flag jumps to the same place. If the target row is ever deleted outright the flag simply stops pointing (set null);
-- a target that is only trashed or archived is detected in the app and the flag says so quietly.
-- Nothing else changes: flags without a target behave exactly as before.
alter table custom_keys add column if not exists target_idea_id uuid references ideas(id) on delete set null;
create index if not exists custom_keys_target_idea_id_idx on custom_keys(target_idea_id) where target_idea_id is not null;
-- To undo: alter table custom_keys drop column target_idea_id;
