-- Nov 14 2026 (Larry): "Isn't the issue a toggle to 'attach' or 'don't attach' a link?" -- KEEP: a paperclip toggle on a linked word.
-- One row = on that card, that home's word is NOT attached (plain text). No row = attached (the default).
-- Just that spot: other cards keep their link. Shared by every traveler, since it is a choice about the card, not about the person.
create table if not exists public.unattached_words (
  card_id uuid not null,
  home_id uuid not null,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (card_id, home_id)
);
alter table public.unattached_words enable row level security;
drop policy if exists "unattached_words - travelers read" on public.unattached_words;
create policy "unattached_words - travelers read" on public.unattached_words for select to authenticated using (true);
drop policy if exists "unattached_words - travelers add" on public.unattached_words;
create policy "unattached_words - travelers add" on public.unattached_words for insert to authenticated with check (true);
drop policy if exists "unattached_words - travelers remove" on public.unattached_words;
create policy "unattached_words - travelers remove" on public.unattached_words for delete to authenticated using (true);
