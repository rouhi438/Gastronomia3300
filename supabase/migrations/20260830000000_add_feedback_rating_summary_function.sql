create or replace function public.get_order_feedback_rating_summary()
returns table (
  total_ratings bigint,
  average_rating numeric
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    count(*)::bigint as total_ratings,
    coalesce(avg(rating), 0)::numeric as average_rating
  from public.order_feedback;
$function$;

revoke all
  on function public.get_order_feedback_rating_summary()
  from public, anon, authenticated;

grant execute
  on function public.get_order_feedback_rating_summary()
  to service_role;

comment on function public.get_order_feedback_rating_summary() is
  'Returns the private feedback rating count and average for server-side public-threshold handling.';
