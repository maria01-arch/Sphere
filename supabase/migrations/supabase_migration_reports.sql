-- Reporting mechanism — required by Google Play's Child Safety Standards
-- policy (an app can't just declare it has one, it actually has to). Covers
-- reporting a user, a post, a comment, a DM/group message, or a reel; a
-- report always has exactly one target, the rest stay null.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reported_post_id uuid references public.posts(id) on delete cascade,
  reported_comment_id uuid references public.comments(id) on delete cascade,
  reported_message_id uuid,
  reported_reel_id uuid references public.reels(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_reason_idx on public.reports(reason);

alter table public.reports enable row level security;

-- Anyone signed in can file a report. Nobody but the admin panel (which
-- authenticates as the hardcoded ADMIN_ID like the rest of the admin
-- surface) should be able to read the queue — reports must never be
-- visible to the person they're about, or to other regular users.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert
  with check (auth.uid() = reporter_id);
drop policy if exists "reports_select_none" on public.reports;
create policy "reports_select_none" on public.reports for select using (false);
drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all" on public.reports for all
  using (auth.uid() = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae')
  with check (auth.uid() = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae');
