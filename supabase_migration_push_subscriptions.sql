-- Stores each user's Web Push subscription (VAPID) for /api/push to send
-- to. One row per subscription; sendPush() in the app already picks only
-- the newest row per user and prunes older ones, so this table doesn't
-- need a uniqueness constraint on user_id — that cleanup happens in code.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id, created_at desc);

alter table public.push_subscriptions enable row level security;

-- The app currently sends a push by having the SENDER's own browser read
-- the RECIPIENT's subscription row directly (e.g. liking someone's post
-- looks up that post's author's subscription client-side, then POSTs it to
-- /api/push) — there's no server-side lookup step. That means SELECT has
-- to stay permissive for any signed-in user, or every push in the app
-- breaks silently. This does mean any signed-in user can read anyone's
-- subscription endpoint/keys, which is a real tradeoff worth revisiting
-- later (routing sends through a server route with the service-role key
-- instead), but it's what the existing sendPush() flow requires today.
drop policy if exists "push_subscriptions_select_all" on public.push_subscriptions;
create policy "push_subscriptions_select_all" on public.push_subscriptions for select using (true);

-- Writing/deleting a subscription is still restricted to your own row.
drop policy if exists "push_subscriptions_own_write" on public.push_subscriptions;
create policy "push_subscriptions_own_write" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_own_update" on public.push_subscriptions;
create policy "push_subscriptions_own_update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_own_delete" on public.push_subscriptions;
create policy "push_subscriptions_own_delete" on public.push_subscriptions for delete using (auth.uid() = user_id);
