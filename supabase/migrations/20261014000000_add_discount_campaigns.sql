-- Discount campaigns managed by restaurant admins.
-- All timestamps are stored as timestamptz (UTC internally).

create table public.discount_campaigns (
  id uuid primary key default gen_random_uuid(),

  name text not null
    check (length(trim(name)) between 1 and 120),

  code text not null unique
    check (
      code = upper(code)
      and code ~ '^[A-Z0-9_-]{3,32}$'
    ),

  discount_percent integer not null
    check (discount_percent between 1 and 100),

  is_active boolean not null default false,

  starts_at timestamptz,
  ends_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint discount_campaign_dates_check
    check (
      starts_at is null
      or ends_at is null
      or ends_at > starts_at
    )
);

create index discount_campaigns_active_idx
  on public.discount_campaigns (is_active);

alter table public.discount_campaigns
  enable row level security;

-- No public policies.
-- Campaign management and validation will use
-- authenticated server-side endpoints.

alter table public.orders
  add column discount_campaign_id uuid
    references public.discount_campaigns(id)
    on delete set null,

  add column discount_code text,

  add column discount_amount numeric(12, 2)
    not null default 0
    check (discount_amount >= 0);
