-- Protect private order data from direct Data API access.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Remove legacy policies that are not used by the current server-side flow.
drop policy if exists "Users can insert their own orders"
on public.orders;

drop policy if exists "Users can view their own orders"
on public.orders;

drop policy if exists "Admins can read orders for realtime"
on public.orders;

-- Remove direct table access from public client roles.
revoke all privileges
on table public.orders
from public, anon, authenticated;

revoke all privileges
on table public.order_items
from public, anon, authenticated;

-- The authenticated administrator needs SELECT for Supabase Realtime.
grant select
on table public.orders
to authenticated;

create policy "Admins can read orders for realtime"
on public.orders
for select
to authenticated
using (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);
