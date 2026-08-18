-- Track Nets refunds for paid restaurant orders.
-- Refund state is separate from the restaurant order status because
-- a refund may remain pending after an order has been cancelled.

alter table public.orders
  add column if not exists nets_refund_id text,

  add column if not exists refund_status text
    check (
      refund_status is null
      or refund_status in (
        'pending',
        'completed',
        'failed'
      )
    ),

  add column if not exists refund_amount_minor integer
    check (
      refund_amount_minor is null
      or refund_amount_minor > 0
    ),

  add column if not exists refund_requested_at timestamptz,

  add column if not exists refund_completed_at timestamptz,

  add column if not exists refund_failed_at timestamptz,

  add column if not exists refund_error text;

create unique index if not exists orders_nets_refund_id_unique
  on public.orders (nets_refund_id)
  where nets_refund_id is not null;

create index if not exists orders_refund_status_idx
  on public.orders (refund_status)
  where refund_status is not null;
