-- Oct 27 2026 -- countable signal flags. One small column holds how many of each flag a card has
-- (keys: "gem" or a custom flag's id; hearts keep using heart_count). The Briefing Board view now also passes up heart_count, is_gem and flag_counts.
alter table ideas add column if not exists flag_counts jsonb not null default '{}'::jsonb;
update ideas set flag_counts = jsonb_build_object('gem',1) where is_gem = true and flag_counts = '{}'::jsonb;
-- (briefing_cards view re-created with i.heart_count, i.is_gem, i.flag_counts added at the end)
