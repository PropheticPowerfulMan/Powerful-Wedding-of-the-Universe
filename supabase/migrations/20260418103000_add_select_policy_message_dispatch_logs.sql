/*
  # Allow Dashboard To Read Message Dispatch Logs

  ## Why
  - `message_dispatch_logs` has RLS enabled.
  - The admin dashboard uses the anon key in browser context.
  - Without a SELECT policy, logs are written by edge functions but invisible in UI.
*/

alter table public.message_dispatch_logs enable row level security;

drop policy if exists "Anyone can read message dispatch logs" on public.message_dispatch_logs;

create policy "Anyone can read message dispatch logs"
  on public.message_dispatch_logs
  for select
  to anon, authenticated
  using (true);
