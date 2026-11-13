-- Nov 13 2026 (Larry): "my fingers do not always keep up with my mind ... a learning feature that corrects frequent typos."
-- MY WORDS: each traveler's own typo memory (fixes learned from their hand corrections, words never to change, words to protect).
-- One row per traveler. The page keeps a copy on the device too, so typing never waits on this table.
create table if not exists public.my_words (
  user_id uuid primary key references auth.users(id) on delete cascade,
  words jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.my_words enable row level security;
drop policy if exists "my_words - own row" on public.my_words;
create policy "my_words - own row" on public.my_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
