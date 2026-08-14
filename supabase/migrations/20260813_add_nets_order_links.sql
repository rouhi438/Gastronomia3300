-- Link paid restaurant orders to the Nets checkout that created them.
-- Existing historical orders remain valid because all new columns are nullable.
-- The unique constraints make webhook finalization idempotent.

alter table public.orders
  add column if not exists checkout_session_id uuid
    references public.checkout_sessions(id) on delete set null,
  add column if not exists nets_payment_id text,
  add column if not exists nets_charge_id text;

create unique index if not exists orders_checkout_session_id_unique
  on public.orders (checkout_session_id)
  where checkout_session_id is not null;

create unique index if not exists orders_nets_payment_id_unique
  on public.orders (nets_payment_id)
  where nets_payment_id is not null;

create unique index if not exists orders_nets_charge_id_unique
  on public.orders (nets_charge_id)
  where nets_charge_id is not null;
