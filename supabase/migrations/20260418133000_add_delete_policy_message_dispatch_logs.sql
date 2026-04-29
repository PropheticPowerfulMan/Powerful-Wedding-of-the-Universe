/*
  # Allow Dashboard To Delete Message Dispatch Logs

  ## Why
  - The admin dashboard runs in browser context with anon/authenticated roles.
  - Without a DELETE policy, delete actions in the Journal des envois UI fail under RLS.
*/

alter table public.message_dispatch_logs enable row level security;

drop policy if exists "Anyone can delete message dispatch logs" on public.message_dispatch_logs;

create policy "Anyone can delete message dispatch logs"
  on public.message_dispatch_logs
  for delete
  to anon, authenticated
  using (true);
