-- Up to 3 images per listing, shown as a carousel in the detail view.
-- image_url (singular) stays in place for backward compatibility with any
-- listings created before this — the app reads image_urls first and falls
-- back to image_url for older rows.
alter table public.store_listings
  add column if not exists image_urls text[] not null default '{}';

-- Hard cap of 5 active listings per seller, enforced in the database so it
-- can't be bypassed by going around the app's own UI check. Fires on both
-- creating a new active listing and relisting one (sold/out_of_stock ->
-- active) — either way you can't end up with more than 5 active at once.
create or replace function public.check_store_listing_limit()
returns trigger as $$
begin
  if new.status = 'active' and (
    select count(*) from public.store_listings
    where seller_id = new.seller_id and status = 'active' and id <> new.id
  ) >= 5 then
    raise exception 'You can have at most 5 active listings at a time.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists store_listings_limit_trigger on public.store_listings;
create trigger store_listings_limit_trigger
  before insert or update on public.store_listings
  for each row execute function public.check_store_listing_limit();
