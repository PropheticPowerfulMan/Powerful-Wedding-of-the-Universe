import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_COUNTRY_CODE = Deno.env.get('DEFAULT_COUNTRY_CODE') ?? '+243';

const normalizePhone = (raw?: string): string | null => {
  if (!raw) return null;

  let cleaned = raw.trim().replace(/^=+/, '');
  cleaned = cleaned.replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }

  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return null;

  const countryDigits = DEFAULT_COUNTRY_CODE.replace('+', '');
  if (digits.startsWith(countryDigits)) return `+${digits}`;
  if (digits.startsWith('0')) return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;

  if (digits.length >= 8 && digits.length <= 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  return null;
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseEmailList = (raw?: string, fallback: string[] = []): string[] => {
  const source = (raw ?? '').trim();
  const values = source ? source.split(/[;,\n]/g) : fallback;
  const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(normalized));
};

const resolveTemplate = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');

type Channel = 'sms' | 'email' | 'both';
type RSVPStatus = 'pending' | 'attending' | 'not_attending' | 'maybe' | 'all';
type PersonType = 'family' | 'friends' | 'work' | 'all';

type NotifyAllPayload = {
  channel?: Channel;
  dry_run?: boolean;
  limit?: number;
  filter?: {
    rsvp_status?: RSVPStatus;
    person_type?: PersonType;
    is_couple?: boolean | 'all';
  };
  guests?: GuestRow[];
};

type GuestRow = {
  id: string;
  first_name: string;
  last_name: string;
  post_name: string;
  gender: 'male' | 'female';
  is_couple?: boolean;
  person_type: 'family' | 'friends' | 'work';
  rsvp_status: 'pending' | 'attending' | 'not_attending' | 'maybe';
  phone: string;
  rsvp_contact_phone: string;
  rsvp_contact_email: string;
};

type DeliveryStatus = 'eligible' | 'sent' | 'failed' | 'skipped';

type GuestDeliveryDetail = {
  guest_id: string;
  guest_name: string;
  sms?: {
    target: string;
    status: DeliveryStatus;
    reason?: string;
  };
  email?: {
    target: string;
    status: DeliveryStatus;
    reason?: string;
  };
};

type DispatchLogInsert = {
  source_function: string;
  event_type: string;
  channel: 'email' | 'whatsapp' | 'sms';
  recipient_type: 'guest' | 'host' | 'admin' | 'unknown';
  guest_id?: string | null;
  guest_name?: string | null;
  target?: string | null;
  status: 'eligible' | 'sent' | 'failed' | 'skipped';
  dry_run?: boolean;
  provider?: string | null;
  error_message?: string | null;
  provider_message_id?: string | null;
  provider_status?: string | null;
  provider_status_detail?: string | null;
  provider_updated_at?: string | null;
  provider_payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

type SmsSendResult = {
  error: string | null;
  providerMessageId?: string | null;
  providerStatus?: string | null;
  providerStatusDetail?: string | null;
  providerPayload?: Record<string, unknown> | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const enabled = (Deno.env.get('BULK_NOTIFY_ENABLED') ?? 'false').toLowerCase() === 'true';

    if (!enabled) {
      return new Response(
        JSON.stringify({
          error: 'Bulk notifications are disabled. Set BULK_NOTIFY_ENABLED=true to activate.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const payload = (await req.json()) as NotifyAllPayload;

    const channel: Channel = payload.channel ?? 'both';
    const dryRun = payload.dry_run ?? false;
    const limit = Math.max(1, Math.min(payload.limit ?? 500, 5000));
    const filterRsvp = payload.filter?.rsvp_status ?? 'all';
    const filterType = payload.filter?.person_type ?? 'all';
    const filterCouple: boolean | 'all' = payload.filter?.is_couple ?? 'all';

    const payloadGuests = Array.isArray(payload.guests) ? payload.guests : [];

    const requestOrigin = (() => {
      try {
        return new URL(req.url).origin;
      } catch {
        return '';
      }
    })();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? requestOrigin;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('authorization') ?? '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const requestToken = bearerToken || req.headers.get('apikey')?.trim() || '';
    const logApiKey = serviceRole || requestToken;
    const logsEndpoint = supabaseUrl ? `${supabaseUrl}/rest/v1/message_dispatch_logs` : null;

    if (!logsEndpoint || !logApiKey) {
      console.error('CRITICAL: Supabase log client not initialized in notify-all-guests');
      console.error('SUPABASE_URL defined:', !!supabaseUrl);
      console.error('SUPABASE_SERVICE_ROLE_KEY defined:', !!serviceRole);
      console.error('Request token provided:', !!requestToken);
    }

    const logDispatch = async (entry: DispatchLogInsert) => {
      if (!logsEndpoint || !logApiKey) return;

      const res = await fetch(logsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: logApiKey,
          Authorization: `Bearer ${logApiKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          source_function: entry.source_function,
          event_type: entry.event_type,
          channel: entry.channel,
          recipient_type: entry.recipient_type,
          guest_id: entry.guest_id ?? null,
          guest_name: entry.guest_name ?? null,
          target: entry.target ?? null,
          status: entry.status,
          dry_run: entry.dry_run ?? false,
          provider: entry.provider ?? null,
          error_message: entry.error_message ?? null,
          provider_message_id: entry.provider_message_id ?? null,
          provider_status: entry.provider_status ?? null,
          provider_status_detail: entry.provider_status_detail ?? null,
          provider_updated_at: entry.provider_updated_at ?? null,
          provider_payload: entry.provider_payload ?? null,
          metadata: entry.metadata ?? {},
        }),
      });

      if (!res.ok) {
        console.error('message_dispatch_logs insert failed (notify-all-guests):', await res.text());
      }
    };

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Jonathan & Maria <onboarding@resend.dev>';
    const notifyEmail = Deno.env.get('NOTIFY_EMAIL') ?? 'jonathanlokala9@gmail.com';
    const notifyEmailWife = Deno.env.get('NOTIFY_EMAIL_WIFE') ?? 'marianzitusumvibudulu@gmail.com';
    const notifyEmailsRaw = Deno.env.get('NOTIFY_EMAILS');
    const fallbackRecipients = parseEmailList(undefined, [notifyEmail, notifyEmailWife]).filter(isValidEmail);
    const configuredRecipients = parseEmailList(notifyEmailsRaw).filter(isValidEmail);
    const hostEmailRecipients = configuredRecipients.length > 0 ? configuredRecipients : fallbackRecipients;
    const invitationSiteUrl =
      Deno.env.get('INVITATION_SITE_URL') ?? 'https://powerfulweddingoftheuniverse.netlify.app/';

    const africastalkingApiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const africastalkingUsername = Deno.env.get('AFRICASTALKING_USERNAME') ?? 'sandbox';
    const africastalkingBaseUrl = (Deno.env.get('AFRICASTALKING_BASE_URL') ?? 'https://api.sandbox.africastalking.com')
      .replace(/\/version1\/messaging\/?$/i, '')
      .replace(/\/$/, '');
    const isSandboxUrl = africastalkingBaseUrl.includes('sandbox');
    const africastalkingFrom = Deno.env.get('AFRICASTALKING_FROM')?.trim();

    const smsTemplate =
      Deno.env.get('BULK_SMS_TEMPLATE') ??
      'Hello {invitation_label}, Jonathan & Maria confirm your invitation. Please check your card and RSVP when needed.';

    const emailSubjectTemplate =
      Deno.env.get('BULK_EMAIL_SUBJECT') ??
      'Official Invitation - Download your card and confirm attendance (Jonathan & Maria)';

    const emailTextTemplate =
      Deno.env.get('BULK_EMAIL_TEXT') ??
      'Hello {invitation_label},\n\nJonathan & Maria are pleased to confirm your official invitation.\n\nIMPORTANT: everything is centralized on this single website: {site_url}\n\nPlease follow these steps:\n1) Go to: {site_url}\n2) Download your invitation from the website\n3) Confirm your attendance (RSVP) on the same website\n\nReminder:\n- Invitation download: on this website\n- RSVP confirmation: on this website\n- RSVP updates: on this website\n\nThank you very much and see you soon,\nJonathan & Maria\nOfficial website: {site_url}';

    let guests: GuestRow[] = [];

    if (payloadGuests.length > 0) {
      guests = payloadGuests.slice(0, limit);
    } else {
      if (!supabaseUrl || !serviceRole) {
        return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const admin = createClient(supabaseUrl, serviceRole);

      const { data, error } = await admin
        .from('guests')
        .select('id, first_name, last_name, post_name, gender, is_couple, person_type, rsvp_status, phone, rsvp_contact_phone, rsvp_contact_email')
        .limit(limit);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      guests = (data ?? []) as GuestRow[];
    }
    const filtered = guests.filter((guest) => {
      const rsvpOk = filterRsvp === 'all' || guest.rsvp_status === filterRsvp;
      const typeOk = filterType === 'all' || guest.person_type === filterType;
      const coupleOk = filterCouple === 'all' || Boolean(guest.is_couple) === filterCouple;
      return rsvpOk && typeOk && coupleOk;
    });

    const results = {
      channel,
      dryRun,
      totalLoaded: guests.length,
      totalSelected: filtered.length,
      sms: {
        eligible: 0,
        sent: 0,
        failed: 0,
      },
      email: {
        eligible: 0,
        sent: 0,
        failed: 0,
      },
      details: [] as GuestDeliveryDetail[],
      errors: [] as string[],
    };

    if (channel === 'sms' || channel === 'both') {
      if (!africastalkingApiKey) {
        results.errors.push('AFRICASTALKING_API_KEY manquante dans les secrets Supabase.');
      }

      if (!africastalkingUsername) {
        results.errors.push('AFRICASTALKING_USERNAME manquant dans les secrets Supabase.');
      }

      const isSandboxUrl = africastalkingBaseUrl.includes('sandbox');
      if (isSandboxUrl && africastalkingUsername !== 'sandbox') {
        results.errors.push("Configuration incohérente: URL sandbox avec username différent de 'sandbox'.");
      }

      if (!isSandboxUrl && africastalkingUsername === 'sandbox') {
        results.errors.push('Configuration incohérente: URL production avec username sandbox.');
      }

      if (isSandboxUrl && !dryRun) {
        results.errors.push(
          'Africastalking est en mode SANDBOX: les SMS réels ne peuvent pas être livrés. Configurez AFRICASTALKING_BASE_URL vers la production.'
        );
      }
    }

    const sendSms = async (to: string, body: string): Promise<SmsSendResult> => {
      if (!africastalkingApiKey || !africastalkingUsername) {
        return { error: 'Africastalking secrets missing (AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME)' };
      }

      if (!dryRun && isSandboxUrl) {
        return {
          error: 'Africastalking sandbox detected: real SMS delivery is disabled. Configure AFRICASTALKING_BASE_URL to the production API host.',
        };
      }

      const toPhone = normalizePhone(to);
      if (!toPhone) return { error: `Invalid phone (${to})` };

      const smsPayload = new URLSearchParams({
        username: africastalkingUsername,
        to: toPhone,
        message: body,
      });

      if (africastalkingFrom) {
        smsPayload.set('from', africastalkingFrom);
      }

      const res = await fetch(`${africastalkingBaseUrl}/version1/messaging`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: africastalkingApiKey,
        },
        body: smsPayload.toString(),
      });

      const raw = await res.text();
      let parsed: {
        SMSMessageData?: {
          Message?: string;
          Recipients?: Array<{ number?: string; status?: string; statusCode?: number | string }>;
        };
      } | null = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        const providerMessage = parsed?.SMSMessageData?.Message;
        return {
          error: `AT HTTP ${res.status}: ${providerMessage ?? raw}`,
          providerStatus: providerMessage ?? null,
          providerPayload: parsed as Record<string, unknown> | null,
        };
      }

      const recipients = parsed?.SMSMessageData?.Recipients ?? [];
      const primaryRecipient = recipients[0];
      const providerMessageId =
        primaryRecipient?.messageId ??
        (primaryRecipient as { messageID?: string } | undefined)?.messageID ??
        (primaryRecipient as { id?: string } | undefined)?.id ??
        null;
      const providerStatus = primaryRecipient?.status ?? parsed?.SMSMessageData?.Message ?? null;
      const failed = recipients.filter((recipient) => (recipient.status ?? '').toLowerCase() !== 'success');

      if (failed.length > 0) {
        const details = failed
          .map((recipient) => `${recipient.number ?? 'unknown'} (${recipient.status ?? 'unknown'} / ${recipient.statusCode ?? 'n/a'})`)
          .join(', ');
        return {
          error: `AT recipient failure: ${details}`,
          providerMessageId,
          providerStatus,
          providerStatusDetail: details,
          providerPayload: parsed as Record<string, unknown> | null,
        };
      }

      return {
        error: null,
        providerMessageId,
        providerStatus,
        providerPayload: parsed as Record<string, unknown> | null,
      };
    };

    const resendSandboxMode = /onboarding@resend\.dev/i.test(resendFromEmail);

    const sendEmail = async (to: string, subject: string, text: string, bcc: string[] = []): Promise<string | null> => {
      if (!resendApiKey) return 'RESEND_API_KEY missing';
      if (!isValidEmail(to)) return `Invalid email (${to})`;

      const safeBcc = resendSandboxMode
        ? []
        : bcc.filter((value) => isValidEmail(value) && value.toLowerCase() !== to.toLowerCase());

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [to],
          ...(safeBcc.length > 0 ? { bcc: safeBcc } : {}),
          subject,
          text,
        }),
      });

      if (res.ok) return null;
      return await res.text();
    };

    for (const guest of filtered) {
      const name = [guest.first_name, guest.post_name, guest.last_name].filter(Boolean).join(' ').trim();
      const invitationLabel = guest.is_couple ? `Mr. ${name} and spouse` : name;
      const vars = {
        name,
        invitation_label: invitationLabel,
        first_name: guest.first_name,
        site_url: invitationSiteUrl,
      };

      const guestPhone = (guest.rsvp_contact_phone || guest.phone || '').trim();
      const guestEmail = (guest.rsvp_contact_email || '').trim();
      const detail: GuestDeliveryDetail = {
        guest_id: guest.id,
        guest_name: invitationLabel,
      };

      if (channel === 'sms' || channel === 'both') {
        if (guestPhone) {
          results.sms.eligible += 1;
          detail.sms = {
            target: guestPhone,
            status: 'eligible',
          };

          await logDispatch({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'sms',
            recipient_type: 'guest',
            guest_id: guest.id,
            guest_name: invitationLabel,
            target: guestPhone,
            status: 'eligible',
            dry_run: dryRun,
            provider: 'africastalking',
            metadata: { mode: channel },
          });

          if (!dryRun) {
            const smsBody = resolveTemplate(smsTemplate, vars);
            const smsResult = await sendSms(guestPhone, smsBody);
            if (smsResult.error) {
              results.sms.failed += 1;
              results.errors.push(`${name}: SMS failed: ${smsResult.error}`);
              detail.sms.status = 'failed';
              detail.sms.reason = smsResult.error;

              await logDispatch({
                source_function: 'notify-all-guests',
                event_type: 'bulk_notification',
                channel: 'sms',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestPhone,
                status: 'failed',
                dry_run: false,
                provider: 'africastalking',
                error_message: smsResult.error,
                provider_message_id: smsResult.providerMessageId ?? null,
                provider_status: smsResult.providerStatus ?? null,
                provider_status_detail: smsResult.providerStatusDetail ?? null,
                provider_updated_at: new Date().toISOString(),
                provider_payload: smsResult.providerPayload ?? null,
                metadata: { mode: channel },
              });
            } else {
              results.sms.sent += 1;
              detail.sms.status = 'sent';

              await logDispatch({
                source_function: 'notify-all-guests',
                event_type: 'bulk_notification',
                channel: 'sms',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestPhone,
                status: 'sent',
                dry_run: false,
                provider: 'africastalking',
                provider_message_id: smsResult.providerMessageId ?? null,
                provider_status: smsResult.providerStatus ?? 'Accepted',
                provider_updated_at: new Date().toISOString(),
                provider_payload: smsResult.providerPayload ?? null,
                metadata: { mode: channel },
              });
            }
          }
        } else {
          detail.sms = {
            target: '',
            status: 'skipped',
            reason: 'No phone in database',
          };

          await logDispatch({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'sms',
            recipient_type: 'guest',
            guest_id: guest.id,
            guest_name: invitationLabel,
            target: null,
            status: 'skipped',
            dry_run: dryRun,
            provider: 'africastalking',
            error_message: 'No phone in database',
            metadata: { mode: channel },
          });
        }
      }

      if (channel === 'email' || channel === 'both') {
        if (guestEmail) {
          results.email.eligible += 1;
          detail.email = {
            target: guestEmail,
            status: 'eligible',
          };

          await logDispatch({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'email',
            recipient_type: 'guest',
            guest_id: guest.id,
            guest_name: invitationLabel,
            target: guestEmail,
            status: 'eligible',
            dry_run: dryRun,
            provider: 'resend',
            metadata: { mode: channel },
          });

          if (!dryRun) {
            const emailSubject = resolveTemplate(emailSubjectTemplate, vars);
            const emailText = resolveTemplate(emailTextTemplate, vars);
            const emailErr = await sendEmail(guestEmail, emailSubject, emailText, hostEmailRecipients);
            if (emailErr) {
              results.email.failed += 1;
              results.errors.push(`${name}: Email failed: ${emailErr}`);
              detail.email.status = 'failed';
              detail.email.reason = emailErr;

              await logDispatch({
                source_function: 'notify-all-guests',
                event_type: 'bulk_notification',
                channel: 'email',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestEmail,
                status: 'failed',
                dry_run: false,
                provider: 'resend',
                error_message: emailErr,
                metadata: { mode: channel },
              });
            } else {
              results.email.sent += 1;
              detail.email.status = 'sent';

              await logDispatch({
                source_function: 'notify-all-guests',
                event_type: 'bulk_notification',
                channel: 'email',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestEmail,
                status: 'sent',
                dry_run: false,
                provider: 'resend',
                metadata: { mode: channel },
              });
            }
          }
        } else {
          detail.email = {
            target: '',
            status: 'skipped',
            reason: 'No email in database',
          };

          await logDispatch({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'email',
            recipient_type: 'guest',
            guest_id: guest.id,
            guest_name: invitationLabel,
            target: null,
            status: 'skipped',
            dry_run: dryRun,
            provider: 'resend',
            error_message: 'No email in database',
            metadata: { mode: channel },
          });
        }
      }

      results.details.push(detail);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        summary: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
