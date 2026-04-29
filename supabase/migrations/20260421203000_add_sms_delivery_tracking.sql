alter table public.message_dispatch_logs
  add column if not exists provider_message_id text null,
  add column if not exists provider_status text null,
  add column if not exists provider_status_detail text null,
  add column if not exists provider_updated_at timestamptz null,
  add column if not exists delivered_at timestamptz null,
  add column if not exists provider_payload jsonb null;

alter table public.message_dispatch_logs
  drop constraint if exists message_dispatch_logs_status_check;

alter table public.message_dispatch_logs
  add constraint message_dispatch_logs_status_check
  check (status in ('eligible', 'sent', 'delivered', 'failed', 'skipped'));

create index if not exists idx_message_dispatch_logs_provider_message_id
  on public.message_dispatch_logs (provider_message_id)
  where provider_message_id is not null;

create index if not exists idx_message_dispatch_logs_provider_status
  on public.message_dispatch_logs (provider_status)
  where provider_status is not null;
