-- Nov 4 2026 (Larry): a LINK subject is italic, never bold; bold is reserved for the MAIN source of a subject.
-- Card-level only (no screen toggle), same pattern as subject_bold / subject_caps: true = italic, false or null = plain.
alter table public.ideas add column if not exists subject_italic boolean;

-- First use: the three BB link headers that point to MAIN (PLAN > Briefing Board).
update public.ideas set subject_italic = true where id in (
  '83057853-2705-48c3-baa0-fefde9f42866',  -- CLAUDE > BOARD OPERATIONS > BRIEFING BOARD
  'ace49fcb-635e-4970-95e5-673a01dc86d7',  -- WEBSITE > ... > BRIEFING BOARD SYSTEM
  'a1174871-0e0f-4bf4-8531-778fd4d1d95e'   -- BRIEFING BOARD SYSTEM > BB / Storyboard Entry Card
);
