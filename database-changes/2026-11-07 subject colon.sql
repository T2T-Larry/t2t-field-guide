-- Nov 7 2026 (Larry): every header shows a colon after its SUBJECT automatically; a header can hide it (the colon stays only implied).
-- Card-level only, same pattern as subject_bold / subject_caps: true = show, false = hide, null or missing = follow the screen setting.
-- The colon is display only and is never stored in the words.
alter table public.ideas add column if not exists subject_colon boolean;
