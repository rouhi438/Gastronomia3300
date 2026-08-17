-- Checkout sessions for Nets Easy hosted payments.
-- A real row in public.orders is created only after a successful payment.

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,

  status text not null default 'created'
    check (
      status in (
        'created',
        'payment_created',
        'paid',
        'completed',
        'failed',
        'cancelled'
      )
    ),

  -- Snapshot prepared and validated on the server.
  -- Never trust client-side prices when creating this payload.
  order_payload jsonb not null,

  amount_minor integer not null
    check (amount_minor > 0),

  currency text not null default 'DKK'
    check (currency = 'DKK'),

  nets_payment_id text unique,
  nets_charge_id text unique,
  nets_payment_method text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,

  -- Nets Checkout payment URLs expire after 48 hours.
  expires_at timestamptz not null default (now() + interval '48 hours')
);

create index if not exists checkout_sessions_status_idx
  on public.checkout_sessions (status);

create index if not exists checkout_sessions_expires_at_idx
  on public.checkout_sessions (expires_at);

create index if not exists checkout_sessions_created_at_idx
  on public.checkout_sessions (created_at desc);

alter table public.checkout_sessions enable row level security;

-- No anon/authenticated policies are intentionally created.
-- Access is server-side only through the Supabase service role.
