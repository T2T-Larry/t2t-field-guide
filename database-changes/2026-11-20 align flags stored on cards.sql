-- Nov 20 2026 (Larry): ALIGN and light flags become real flags stored on the card.
-- Already applied to the live database. Kept here so the change can be read and, if needed, undone.

-- 1. The new columns
alter table public.ideas add column if not exists align_flags_set boolean not null default false;
alter table public.profiles add column if not exists align_flag_styles jsonb;

-- 2. Safety copy of Larry's cards that name an ALIGN, taken before they were stamped
create table if not exists public.ideas_align_flags_backup_20261120 as
select id, flag_counts, align_flags_set from public.ideas
where user_id = '819d8af0-3105-47c6-8208-a75a9d4dfd05'
  and (coalesce(subject,'')||' '||coalesce(text_content,'')||' '||coalesce(idea_text,'')) ~* '(vision|design|plan|resource|performance|goal)\s+align';

-- 3. One-time stamp of Larry's own cards (other members' cards are stamped by their owners when they next see them)
--    keys in flag_counts: align-vision, align-design, align-plan, align-resource, align-performance, align-goal,
--                         light-green, light-yellow, light-red

-- TO UNDO (puts Larry's stamped cards back the way they were):
-- update public.ideas i set flag_counts = b.flag_counts, align_flags_set = b.align_flags_set
-- from public.ideas_align_flags_backup_20261120 b where b.id = i.id;
