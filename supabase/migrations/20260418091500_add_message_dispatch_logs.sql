create table if not exists public.message_dispatch_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source_function text not null,
  event_type text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  recipient_type text not null default 'unknown' check (recipient_type in ('guest', 'host', 'admin', 'unknown')),
  guest_id uuid null references public.guests(id) on delete set null,
  guest_name text null,
  target text null,
  status text not null check (status in ('eligible', 'sent', 'failed', 'skipped')),
  dry_run boolean not null default false,
  provider text null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_message_dispatch_logs_created_at
  on public.message_dispatch_logs (created_at desc);

create index if not exists idx_message_dispatch_logs_guest_id
  on public.message_dispatch_logs (guest_id)
  where guest_id is not null;

create index if not exists idx_message_dispatch_logs_channel_status
  on public.message_dispatch_logs (channel, status);

create index if not exists idx_message_dispatch_logs_event_type
  on public.message_dispatch_logs (event_type);

alter table public.message_dispatch_logs enable row level security;
