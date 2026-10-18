-- Oct 18 2026: the traffic light on every Briefing Board task card (Larry: red = HANG UP, yellow = more to do before green, green = go).
-- Stored on the card's own task_fields row. Empty (null) means green, so every existing and new task starts green with nothing to backfill.
-- Whether the light shows on the card face is not stored here: it rides the existing back-only list (ideas.front_hidden, key 'light').
-- What ran in Supabase (one transaction):
--   1. Backup: view_def_backup_20261018 holds the previous briefing_cards view definition.
--   2. task_fields.light text, allowed values red / yellow / green (or empty).
--   3. briefing_cards view re-created with one new last column, light (the old-table half returns null, i.e. green).
-- Same as needs_plan and plan_step_id, the screen writes light straight to task_fields (a narrow write), so a whole-card save can never change it by accident.

begin;

create table if not exists public.view_def_backup_20261018 as
  select 'briefing_cards'::text as view_name, pg_get_viewdef('public.briefing_cards'::regclass, true) as definition, now() as saved_at;

alter table public.task_fields add column if not exists light text;
alter table public.task_fields drop constraint if exists task_fields_light_check;
alter table public.task_fields add constraint task_fields_light_check check (light is null or light in ('red','yellow','green'));

create or replace view public.briefing_cards as
 SELECT tf.idea_id AS id,
    tf.board_id,
    tf.col,
    tf.task,
    tf.person,
    tf.reviewed_by,
    tf.due_date,
    tf.start_date,
    tf.completed_date,
    tf.budget,
    i.priority,
    tf.verified,
    tf.pro,
    tf.grow,
    tf.grow_note,
    tf.archived,
    i.key_slot_1,
    i.key_slot_2,
    i.key_slot_3,
    i.sort_order,
    i.created_at,
    i.notes,
    tf.situation,
    tf.hangup_since,
    tf.hangup_header_id,
    tf.is_routine,
    tf.routine_freq,
    tf.routine_custom,
    tf.due_time,
    tf.start_time,
    tf.start_escalated_for,
    tf.due_escalated_for,
    tf.trashed_at,
    tf.personal_rank,
    tf.personal_col,
    tf.shared_to_board_id,
    tf.shared_col,
    tf.shared_rank,
    i.link_url,
    i.link_title,
    i.link_thumb,
    tf.source_header_id,
    tf.topic_label,
    i.locked,
    tf.lock_reason,
    tf.overdue_flash_shown_for,
    i.color,
    tf.adds_checklist,
    tf.adds_due,
    tf.adds_routine,
    tf.adds_budget,
    i.adds_notes,
    i.adds_links,
    tf.adds_start,
    i.adds_related,
    i.adds_flags,
    tf.start_overdue_flash_shown_for,
    tf.hide_primary_badge,
    tf.project_header_id,
    i.subject,
    i.hide_contents_front,
    tf.routine_day,
    tf.adds_org,
    tf.org_name,
    tf.org_eyebrow,
    tf.logo_url,
    tf.logo_w,
    tf.logo_h,
    tf.logo_dx,
    tf.logo_dy,
    i.front_hidden,
    tf.plan_step_id,
    tf.needs_plan,
    tf.goal_header_id,
    tf.light
   FROM task_fields tf
     JOIN ideas i ON i.id = tf.idea_id
  WHERE is_board_member(tf.board_id) OR (EXISTS ( SELECT 1
           FROM briefing_boards bb
          WHERE bb.id = tf.board_id AND bb.user_id = (( SELECT auth.uid() AS uid)))) OR tf.shared_to_board_id IS NOT NULL AND (is_board_member(tf.shared_to_board_id) OR (EXISTS ( SELECT 1
           FROM briefing_boards bs
          WHERE bs.id = tf.shared_to_board_id AND bs.user_id = (( SELECT auth.uid() AS uid)))))
UNION ALL
 SELECT l.id,
    l.board_id,
    l.col,
    l.task,
    l.person,
    l.reviewed_by,
    l.due_date,
    l.start_date,
    l.completed_date,
    l.budget,
    l.priority,
    l.verified,
    l.pro,
    l.grow,
    l.grow_note,
    l.archived,
    l.key_slot_1,
    l.key_slot_2,
    l.key_slot_3,
    l.sort_order,
    l.created_at,
    l.notes,
    l.situation,
    l.hangup_since,
    l.hangup_header_id,
    l.is_routine,
    l.routine_freq,
    l.routine_custom,
    l.due_time,
    l.start_time,
    l.start_escalated_for,
    l.due_escalated_for,
    l.trashed_at,
    l.personal_rank,
    l.personal_col,
    l.shared_to_board_id,
    l.shared_col,
    l.shared_rank,
    l.link_url,
    l.link_title,
    l.link_thumb,
    l.source_header_id,
    l.topic_label,
    l.locked,
    l.lock_reason,
    l.overdue_flash_shown_for,
    l.color,
    l.adds_checklist,
    l.adds_due,
    l.adds_routine,
    l.adds_budget,
    l.adds_notes,
    l.adds_links,
    l.adds_start,
    l.adds_related,
    l.adds_flags,
    l.start_overdue_flash_shown_for,
    l.hide_primary_badge,
    l.project_header_id,
    l.subject,
    l.hide_contents_front,
    l.routine_day,
    l.adds_org,
    l.org_name,
    l.org_eyebrow,
    l.logo_url,
    l.logo_w,
    l.logo_h,
    l.logo_dx,
    l.logo_dy,
    l.front_hidden,
    NULL::uuid AS plan_step_id,
    false AS needs_plan,
    NULL::uuid AS goal_header_id,
    NULL::text AS light
   FROM briefing_cards_legacy l
  WHERE NOT (EXISTS ( SELECT 1
           FROM task_fields t
          WHERE t.idea_id = l.id)) AND (is_board_member(l.board_id) OR (EXISTS ( SELECT 1
           FROM briefing_boards bb
          WHERE bb.id = l.board_id AND bb.user_id = (( SELECT auth.uid() AS uid)))) OR l.shared_to_board_id IS NOT NULL AND (is_board_member(l.shared_to_board_id) OR (EXISTS ( SELECT 1
           FROM briefing_boards bs
          WHERE bs.id = l.shared_to_board_id AND bs.user_id = (( SELECT auth.uid() AS uid))))));

commit;
