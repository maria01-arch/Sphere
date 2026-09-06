-- Comment reactions — mirrors message_reactions exactly (one emoji per user
-- per comment; picking a new emoji replaces your old one).
create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_reactions enable row level security;

drop policy if exists "comment_reactions_select_all" on public.comment_reactions;
create policy "comment_reactions_select_all" on public.comment_reactions
  for select using (true);

drop policy if exists "comment_reactions_insert_own" on public.comment_reactions;
create policy "comment_reactions_insert_own" on public.comment_reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "comment_reactions_update_own" on public.comment_reactions;
create policy "comment_reactions_update_own" on public.comment_reactions
  for update using (auth.uid() = user_id);

drop policy if exists "comment_reactions_delete_own" on public.comment_reactions;
create policy "comment_reactions_delete_own" on public.comment_reactions
  for delete using (auth.uid() = user_id);

-- Quote-repost: lets someone add their own text when resharing a post,
-- instead of a bare repost with no comment.
alter table public.reposts add column if not exists content text;
