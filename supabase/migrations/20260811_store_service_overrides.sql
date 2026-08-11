create table public.store_service_overrides (
  service_type text primary key
    check (service_type in ('pickup', 'delivery')),

  mode text not null
    check (mode in ('paused', 'closed')),

  override_until timestamptz not null,

  reason text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_service_overrides
enable row level security;
