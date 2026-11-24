-- Nov 24 2026 (Larry: a card that changes between header and subber needs to change colors automatically).
-- When a card's content_type flips between 'header' and anything else, and the same save did not set a color, its own color is cleared
-- so it takes the color its new kind gets from its parents. Covers every way a card changes kind.
create or replace function public.ideas_color_follows_kind() returns trigger language plpgsql as $$
begin
  if (old.content_type = 'header') is distinct from (new.content_type = 'header')
     and new.color is not distinct from old.color then
    new.color := null;
  end if;
  return new;
end $$;
drop trigger if exists ideas_color_follows_kind on public.ideas;
create trigger ideas_color_follows_kind before update of content_type on public.ideas
  for each row execute function public.ideas_color_follows_kind();
