-- Admin-controlled announcement banner shown at the top of everyone's home
-- feed. Only the newest not-yet-expired row is ever shown (see the app's
-- AnnouncementBanner component); "ending" one early is just done by setting
-- expires_at to now() rather than deleting it, so the history stays visible
-- in the admin panel.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null
);

-- message doubles as the bold headline; these three are optional extras for
-- the X/Twitter-style promo-card look (description line + a CTA button that
-- links wherever the admin sets). Added as a separate ALTER so this file is
-- safe to re-run even if you already created the table before this existed.
alter table public.announcements
  add column if not exists description text,
  add column if not exists button_text text,
  add column if not exists button_url text;

alter table public.announcements enable row level security;

-- Same trust model as the existing `ads` table: readable by everyone,
-- writable by any authenticated user — the admin panel itself is what
-- actually restricts creating/editing/deleting to the one hardcoded admin
-- account (ADMIN_ID in the app), not a database role.
drop policy if exists "announcements_select_all" on public.announcements;
create policy "announcements_select_all" on public.announcements for select using (true);
drop policy if exists "announcements_write_authenticated" on public.announcements;
create policy "announcements_write_authenticated" on public.announcements for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
