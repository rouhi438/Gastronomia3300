-- Store stable timestamps for the admin order countdown.
-- These timestamps must not depend on updated_at because later
-- order changes would move the countdown unexpectedly.

alter table public.orders
  add column if not exists accepted_at timestamptz,

  add column if not exists fulfillment_due_at timestamptz,

  add column if not exists completed_at timestamptz;

create index if not exists orders_active_fulfillment_due_at_idx
  on public.orders (fulfillment_due_at)
  where
    status in ('accepted', 'ready')
    and fulfillment_due_at is not null;
