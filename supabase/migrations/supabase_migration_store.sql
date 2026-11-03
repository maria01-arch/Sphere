-- Mini Store: everyone can browse/buy, only is_authentic (verified) users
-- can create listings. Sellers manage their own listings' status (active /
-- sold / out_of_stock) and can delete them outright.
create table if not exists public.store_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price text,
  category text,
  image_url text,
  cta_text text,
  cta_url text,
  status text not null default 'active' check (status in ('active','sold','out_of_stock')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_listings_seller_idx on public.store_listings(seller_id);
create index if not exists store_listings_created_idx on public.store_listings(created_at desc);

alter table public.store_listings enable row level security;

drop policy if exists "store_listings_select_all" on public.store_listings;
create policy "store_listings_select_all" on public.store_listings for select using (true);

-- Only is_authentic accounts can create new listings.
drop policy if exists "store_listings_insert_authentic" on public.store_listings;
create policy "store_listings_insert_authentic" on public.store_listings for insert
  with check (
    auth.uid() = seller_id
    and exists (select 1 from public.profiles where id = auth.uid() and is_authentic = true)
  );

-- A seller can always manage (edit status / delete) listings they already
-- created, even if their is_authentic status later changes — losing
-- verification shouldn't strand existing listings unmanageable.
drop policy if exists "store_listings_update_own" on public.store_listings;
create policy "store_listings_update_own" on public.store_listings for update
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
drop policy if exists "store_listings_delete_own" on public.store_listings;
create policy "store_listings_delete_own" on public.store_listings for delete
  using (auth.uid() = seller_id);
