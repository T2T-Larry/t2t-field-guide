-- Oct 20 2026 (Larry): when a card enters HANG-UPS, search the VISION board for a header matching the card SUBJECT.
-- None: NEEDS VISION badge + empty header with that subject under the card's topic. Header exists but empty: badge only.
-- Header exists and has content: card left alone. One function (ensure_vision_header) used by the trigger AND the card-back Vision switch.
-- Applied through Supabase SQL (apply_migration kept being cancelled). Functions: ensure_vision_header(uuid), task_fields_hangup_vision().
-- Triggers: task_fields_hangup_vision_ins (insert into hangups), task_fields_hangup_vision_upd (col changes into hangups).
-- A card that already has a GOAL still leaves HANG-UPS first (task_fields_needs_plan_route), so the check never runs for it.

-- Later Oct 20 2026 (Larry's redesign): entering HANG-UPS now shows only WHY (an empty situation); the PRIMARY picks
-- "Unclear what is needed" (VISION + header, through ensure_vision_header) or "Multiple steps needed" (NEEDS PLAN) on the card back.
-- A card stays in HANG-UPS until its PRIMARY moves it out (Priority decision, then Larry's DOING decision).
-- task_fields_hangup_vision() is now a no-op (its two triggers stay in place); task_fields_needs_plan_route() is a no-op (the
-- old automatic exit when a Hang Up got a GOAL is retired). Previous task_fields_needs_plan_route body:
--   if new.needs_plan and new.goal_header_id is not null and new.col = 'hangups' then
--     select coalesce(priority,'') into v_pri from public.ideas where id = new.idea_id;
--     new.col := case v_pri when 'HH' then 'do-h' when 'H' then 'do-h' when 'MH' then 'do-m' when 'M' then 'do-m'
--                  when 'ML' then 'do-m' when 'L' then 'do-l' else 'new' end;
--     new.hangup_since := null;
--   end if;

-- Later Oct 20 2026 (Larry): the Hang Up reasons became a checklist (vision, plan, waiting, interference).
alter table public.task_fields add column if not exists hangup_reasons text not null default '';
-- briefing_cards view re-created with the previous column list plus tf.hangup_reasons at the end (trigger bb_cards_iud unchanged).
