alter table public.orders
  add column discount_percent integer
    check (
      discount_percent is null
      or discount_percent between 1 and 100
    );
