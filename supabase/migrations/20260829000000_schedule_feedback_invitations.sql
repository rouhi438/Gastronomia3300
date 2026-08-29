alter table public.orders
  add column if not exists feedback_invitation_email_scheduled_for timestamptz;

comment on column public.orders.feedback_invitation_email_scheduled_for is
  'Requested delivery time for the delayed customer feedback invitation email.';
