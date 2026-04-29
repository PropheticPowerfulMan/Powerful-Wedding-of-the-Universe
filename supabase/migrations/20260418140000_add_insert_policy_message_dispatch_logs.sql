/*
  # Allow Edge Functions To Insert Message Dispatch Logs

  ## Why
  - The edge functions (notify-invitations, notify-all-guests, notify-rsvp) use SUPABASE_SERVICE_ROLE_KEY
  - They call logDispatch() which inserts into message_dispatch_logs
  - Without an INSERT policy, these logs are silently dropped (no error in function, but table stays empty in UI)
  - This causes the Journal des envois to appear empty despite sends happening
*/

alter table public.message_dispatch_logs enable row level security;

drop policy if exists "Anyone can insert message dispatch logs" on public.message_dispatch_logs;

create policy "Anyone can insert message dispatch logs"
  on public.message_dispatch_logs
  for insert
  to anon, authenticated, service_role
  with check (true);
