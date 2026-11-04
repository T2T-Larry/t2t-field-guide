-- Nov 4 2026 (Larry: "merge so I can see the search effects! ... a single home and links for applications and mentions")
-- The two BRIEFING BOARD story headers under STORIES > SHOW DESIGN were exact copies (26 cards + 3 = 5 Principle each).
-- MAIN (the original, bold):  cb6ea952-28d0-410e-998f-d0aeaed66e50  (JOURNEY PHASE > FIELD GUIDE > STORIES)
-- LINK (the copy, italic, not bold): 8e53b5c6-f73a-40e8-91a0-a121b9e39bbd, its two children moved to Trash, link slot 1 points to MAIN.
-- Backup of the copy and everything under it (431 rows): ideas_bb_story_merge_backup_20261104

update ideas set cluster_id='ca064540-1e60-4f32-8dda-ee7f026cb373' where cluster_id='8e53b5c6-f73a-40e8-91a0-a121b9e39bbd';
update ideas set subject_bold=false, subject_italic=true where id='8e53b5c6-f73a-40e8-91a0-a121b9e39bbd';
update ideas set subject_bold=true where id='cb6ea952-28d0-410e-998f-d0aeaed66e50';
insert into card_links (idea_id, slot, target_idea_id, user_id, board_kind)
values ('8e53b5c6-f73a-40e8-91a0-a121b9e39bbd',1,'cb6ea952-28d0-410e-998f-d0aeaed66e50','819d8af0-3105-47c6-8208-a75a9d4dfd05','IDEA');
