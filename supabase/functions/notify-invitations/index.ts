import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_COUNTRY_CODE = Deno.env.get('DEFAULT_COUNTRY_CODE') ?? '+243';

type Channel = 'sms' | 'email' | 'both' | 'whatsapp';
type DeliveryStatus = 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped';

type GuestPayload = {
  id: string;
  first_name: string;
  last_name: string;
  post_name?: string;
  is_couple?: boolean;
  phone?: string;
  rsvp_contact_phone?: string;
  rsvp_contact_email?: string;
};

type NotifyInvitationsPayload = {
  channel?: Channel;
  channels?: {
    sms?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
  dry_run?: boolean;
  mark_sent?: boolean;
  guests?: GuestPayload[];
};

type GuestDeliveryDetail = {
  guest_id: string;
  guest_name: string;
  sms?: {
    target: string;
    status: DeliveryStatus;
    reason?: string;
  };
  whatsapp?: {
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

const normalizePhone = (raw?: string): string | null => {
  if (!raw) return null;

  let cleaned = raw
    .trim()
    .replace(/^=+/, '')
    .replace(/^tel:/i, '')
    .replace(/^['"]+|['"]+$/g, '');
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

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
    const enabled = (Deno.env.get('INVITATIONS_NOTIFY_ENABLED') ?? 'true').toLowerCase() === 'true';

    if (!enabled) {
      return new Response(
        JSON.stringify({
          error: 'Invitation notifications are disabled. Set INVITATIONS_NOTIFY_ENABLED=true to activate.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const payload = (await req.json()) as NotifyInvitationsPayload;
    const channel: Channel = payload.channel ?? 'both';
    const requestedChannels = payload.channels ?? {
      sms: channel === 'sms' || channel === 'both',
      email: channel === 'email' || channel === 'both',
      whatsapp: channel === 'whatsapp',
    };
    const wantsSms = Boolean(requestedChannels.sms);
    const wantsEmail = Boolean(requestedChannels.email);
    const wantsWhatsapp = Boolean(requestedChannels.whatsapp);
    const dryRun = payload.dry_run ?? false;
    const markSent = payload.mark_sent ?? true;

    const guests = Array.isArray(payload.guests) ? payload.guests : [];

    if (guests.length === 0) {
      return new Response(JSON.stringify({ error: 'No guests provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

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
    const africastalkingBaseUrl =
      (Deno.env.get('AFRICASTALKING_BASE_URL') ?? 'https://api.sandbox.africastalking.com')
        .replace(/\/version1\/messaging\/?$/i, '')
        .replace(/\/$/, '');
    const isSandboxUrl = africastalkingBaseUrl.includes('sandbox');
    const africastalkingFrom = Deno.env.get('AFRICASTALKING_FROM')?.trim();
    const smsConfigured = !!(africastalkingApiKey && africastalkingUsername);

    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const whatsappApiVersion = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v22.0';
    const whatsappTemplateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME')?.trim();
    const whatsappTemplateLanguage = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') ?? 'fr';
    const whatsappConfigured = !!(whatsappAccessToken && whatsappPhoneNumberId);

    const emailSubjectTemplate =
      Deno.env.get('INVITATION_EMAIL_SUBJECT') ??
      'Official Invitation - Download your card and confirm attendance (Jonathan & Maria)';

    const emailBodyTemplate =
      Deno.env.get('INVITATION_EMAIL_BODY') ??
      'Hello {invitation_label},\n\nWe are delighted to confirm your official invitation to the wedding of Jonathan & Maria.\n\nIMPORTANT: everything happens on this single website: {site_url}\n\nSteps to follow:\n1) Open the website: {site_url}\n2) Download your digital invitation from the invitation section\n3) Confirm your attendance (RSVP) on the same website\n\nUseful information:\n- Invitation download is done on this website\n- Attendance confirmation (RSVP) is done on this website\n- If your plan changes, update your RSVP on this website\n\nIf you experience any issue, simply reply to this email.\n\nWarmly,\nJonathan & Maria\nOfficial website: {site_url}';

    const smsBodyTemplate =
      Deno.env.get('INVITATION_SMS_BODY') ??
      'Hello {invitation_label}, you are warmly invited to the wedding of Jonathan & Maria. Please check your invitation and confirm via RSVP.';

    const whatsappBodyTemplate =
      Deno.env.get('INVITATION_WHATSAPP_BODY') ??
      'Hello {invitation_label}, you are warmly invited to the wedding of Jonathan & Maria. Your official invitation is available here: {site_url} Please download it and confirm your attendance via RSVP. Jonathan & Maria';

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
      console.error('CRITICAL: Supabase log client not initialized in notify-invitations');
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
        console.error('message_dispatch_logs insert failed (notify-invitations):', await res.text());
      }
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

    const sendSms = async (to: string, body: string): Promise<SmsSendResult> => {
      if (!africastalkingApiKey || !africastalkingUsername) {
        return { error: 'Africastalking secrets missing (AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME)' };
      }

      if (!dryRun && isSandboxUrl) {
        return {
          error: 'Africastalking sandbox detected: real SMS delivery is disabled. Configure AFRICASTALKING_BASE_URL to the production API host.',
        };
      }

      const normalized = normalizePhone(to);
      if (!normalized) return { error: `Invalid phone (${to})` };

      if (africastalkingBaseUrl.includes('sandbox') && africastalkingUsername !== 'sandbox') {
        return { error: "In sandbox mode, AFRICASTALKING_USERNAME must be 'sandbox'." };
      }

      const smsPayload = new URLSearchParams({
        username: africastalkingUsername,
        to: normalized,
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

    const sendWhatsApp = async (
      to: string,
      body: string,
      vars: Record<string, string>
    ): Promise<SmsSendResult> => {
      if (!whatsappAccessToken || !whatsappPhoneNumberId) {
        return { error: 'WhatsApp secrets missing (WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID)' };
      }

      const normalized = normalizePhone(to);
      if (!normalized) return { error: `Invalid WhatsApp phone (${to})` };

      const messagePayload = whatsappTemplateName
        ? {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalized.replace(/^\+/, ''),
            type: 'template',
            template: {
              name: whatsappTemplateName,
              language: {
                code: whatsappTemplateLanguage,
              },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: vars.invitation_label },
                    { type: 'text', text: vars.site_url },
                  ],
                },
              ],
            },
          }
        : {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalized.replace(/^\+/, ''),
            type: 'text',
            text: {
              preview_url: true,
              body,
            },
          };

      const res = await fetch(`https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const raw = await res.text();
      let parsed: {
        messages?: Array<{ id?: string; message_status?: string }>;
        error?: { message?: string; type?: string; code?: number; error_subcode?: number };
      } | null = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      const providerMessageId = parsed?.messages?.[0]?.id ?? null;
      const providerStatus = parsed?.messages?.[0]?.message_status ?? (res.ok ? 'accepted' : null);

      if (!res.ok) {
        return {
          error: `WhatsApp HTTP ${res.status}: ${parsed?.error?.message ?? raw}`,
          providerMessageId,
          providerStatus,
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

    const summary = {
      channel,
      channels: requestedChannels,
      dryRun,
      totalSelected: guests.length,
      sms: {
        eligible: 0,
        sent: 0,
        failed: 0,
      },
      whatsapp: {
        eligible: 0,
        sent: 0,
        failed: 0,
      },
      email: {
        eligible: 0,
        sent: 0,
        failed: 0,
      },
      sentGuestIds: [] as string[],
      details: [] as GuestDeliveryDetail[],
      errors: [] as string[],
    };

    if (!smsConfigured && wantsSms) {
      summary.errors.push('SMS channel not configured. Missing: AFRICASTALKING_API_KEY or AFRICASTALKING_USERNAME.');
    }

    if (!whatsappConfigured && wantsWhatsapp) {
      summary.errors.push('WhatsApp channel not configured. Missing: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.');
    }

    if (wantsSms && !dryRun && isSandboxUrl) {
      summary.errors.push(
        'Africastalking is in SANDBOX mode. Real SMS cannot be delivered until AFRICASTALKING_BASE_URL points to production.'
      );
    }

    for (const guest of guests) {
      const fullName = [guest.first_name, guest.post_name, guest.last_name].filter(Boolean).join(' ').trim();
      const displayName = fullName || 'Invite';
      const invitationLabel = guest.is_couple ? `Mr. ${displayName} and spouse` : displayName;
      const guestPhone = (guest.rsvp_contact_phone || guest.phone || '').trim();
      const guestEmail = (guest.rsvp_contact_email || '').trim();
      const vars = {
        name: displayName,
        invitation_label: invitationLabel,
        first_name: guest.first_name,
        site_url: invitationSiteUrl,
      };

      const detail: GuestDeliveryDetail = {
        guest_id: guest.id,
        guest_name: invitationLabel,
      };

      let guestWasSent = false;

      if (smsConfigured && wantsSms) {
        if (guestPhone) {
          summary.sms.eligible += 1;
          detail.sms = {
            target: guestPhone,
            status: 'eligible',
          };

          await logDispatch({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
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
            const body = resolveTemplate(smsBodyTemplate, vars);
            const smsResult = await sendSms(guestPhone, body);
            if (smsResult.error) {
              summary.sms.failed += 1;
              if (detail.sms) {
                detail.sms.status = 'failed';
                detail.sms.reason = smsResult.error;
              }
              summary.errors.push(`${displayName}: SMS failed: ${smsResult.error}`);

              await logDispatch({
                source_function: 'notify-invitations',
                event_type: 'invitation_direct',
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
              summary.sms.sent += 1;
              if (detail.sms) detail.sms.status = 'sent';
              guestWasSent = true;

              await logDispatch({
                source_function: 'notify-invitations',
                event_type: 'invitation_direct',
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
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
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
      } else if (!smsConfigured && wantsSms) {
        detail.sms = {
          target: '',
          status: 'skipped',
          reason: 'SMS not configured (missing Africastalking credentials)',
        };

        await logDispatch({
          source_function: 'notify-invitations',
          event_type: 'invitation_direct',
          channel: 'sms',
          recipient_type: 'guest',
          guest_id: guest.id,
          guest_name: invitationLabel,
          target: null,
          status: 'skipped',
          dry_run: dryRun,
          provider: 'africastalking',
          error_message: 'SMS not configured (missing Africastalking credentials)',
          metadata: { mode: channel },
        });
      }

      if (whatsappConfigured && wantsWhatsapp) {
        if (guestPhone) {
          summary.whatsapp.eligible += 1;
          detail.whatsapp = {
            target: guestPhone,
            status: 'eligible',
          };

          await logDispatch({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'whatsapp',
            recipient_type: 'guest',
            guest_id: guest.id,
            guest_name: invitationLabel,
            target: guestPhone,
            status: 'eligible',
            dry_run: dryRun,
            provider: 'meta-whatsapp',
            metadata: { mode: channel },
          });

          if (!dryRun) {
            const body = resolveTemplate(whatsappBodyTemplate, vars);
            const whatsappResult = await sendWhatsApp(guestPhone, body, vars);
            if (whatsappResult.error) {
              summary.whatsapp.failed += 1;
              if (detail.whatsapp) {
                detail.whatsapp.status = 'failed';
                detail.whatsapp.reason = whatsappResult.error;
              }
              summary.errors.push(`${displayName}: WhatsApp failed: ${whatsappResult.error}`);

              await logDispatch({
                source_function: 'notify-invitations',
                event_type: 'invitation_direct',
                channel: 'whatsapp',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestPhone,
                status: 'failed',
                dry_run: false,
                provider: 'meta-whatsapp',
                error_message: whatsappResult.error,
                provider_message_id: whatsappResult.providerMessageId ?? null,
                provider_status: whatsappResult.providerStatus ?? null,
                provider_status_detail: whatsappResult.providerStatusDetail ?? null,
                provider_updated_at: new Date().toISOString(),
                provider_payload: whatsappResult.providerPayload ?? null,
                metadata: { mode: channel },
              });
            } else {
              summary.whatsapp.sent += 1;
              if (detail.whatsapp) detail.whatsapp.status = 'sent';
              guestWasSent = true;

              await logDispatch({
                source_function: 'notify-invitations',
                event_type: 'invitation_direct',
                channel: 'whatsapp',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestPhone,
                status: 'sent',
                dry_run: false,
                provider: 'meta-whatsapp',
                provider_message_id: whatsappResult.providerMessageId ?? null,
                provider_status: whatsappResult.providerStatus ?? 'accepted',
                provider_updated_at: new Date().toISOString(),
                provider_payload: whatsappResult.providerPayload ?? null,
                metadata: { mode: channel },
              });
            }
          }
        } else {
          detail.whatsapp = {
            target: '',
            status: 'skipped',
            reason: 'No phone in database',
          };

          await logDispatch({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'whatsapp',
            recipient_type: 'guest',
            guest_id: guest.id,
            guest_name: invitationLabel,
            target: null,
            status: 'skipped',
            dry_run: dryRun,
            provider: 'meta-whatsapp',
            error_message: 'No phone in database',
            metadata: { mode: channel },
          });
        }
      } else if (!whatsappConfigured && wantsWhatsapp) {
        detail.whatsapp = {
          target: '',
          status: 'skipped',
          reason: 'WhatsApp not configured (missing WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID)',
        };

        await logDispatch({
          source_function: 'notify-invitations',
          event_type: 'invitation_direct',
          channel: 'whatsapp',
          recipient_type: 'guest',
          guest_id: guest.id,
          guest_name: invitationLabel,
          target: null,
          status: 'skipped',
          dry_run: dryRun,
          provider: 'meta-whatsapp',
          error_message: 'WhatsApp not configured (missing WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID)',
          metadata: { mode: channel },
        });
      }

      if (wantsEmail) {
        if (guestEmail) {
          summary.email.eligible += 1;
          detail.email = {
            target: guestEmail,
            status: 'eligible',
          };

          await logDispatch({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
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
            const subject = resolveTemplate(emailSubjectTemplate, vars);
            const text = resolveTemplate(emailBodyTemplate, vars);
            const err = await sendEmail(guestEmail, subject, text, hostEmailRecipients);
            if (err) {
              summary.email.failed += 1;
              detail.email.status = 'failed';
              detail.email.reason = err;
              summary.errors.push(`${displayName}: Email failed: ${err}`);

              await logDispatch({
                source_function: 'notify-invitations',
                event_type: 'invitation_direct',
                channel: 'email',
                recipient_type: 'guest',
                guest_id: guest.id,
                guest_name: invitationLabel,
                target: guestEmail,
                status: 'failed',
                dry_run: false,
                provider: 'resend',
                error_message: err,
                metadata: { mode: channel },
              });
            } else {
              summary.email.sent += 1;
              detail.email.status = 'sent';
              guestWasSent = true;

              await logDispatch({
                source_function: 'notify-invitations',
                event_type: 'invitation_direct',
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
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
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

      if (!dryRun && guestWasSent) {
        summary.sentGuestIds.push(guest.id);
      }

      summary.details.push(detail);
    }

    const markSentUpdate = {
      attempted: false,
      updated: 0,
      failed: 0,
      error: null as string | null,
    };

    if (!dryRun && markSent && summary.sentGuestIds.length > 0) {
      markSentUpdate.attempted = true;

      const validGuestIds = summary.sentGuestIds.filter((id) => isUuid(id));
      const invalidGuestIds = summary.sentGuestIds.filter((id) => !isUuid(id));

      if (invalidGuestIds.length > 0) {
        markSentUpdate.failed += invalidGuestIds.length;
        summary.errors.push(
          `Invitation status skipped for ${invalidGuestIds.length} guest(s) with invalid id format.`
        );
      }

      if (validGuestIds.length === 0) {
        markSentUpdate.error = 'No valid UUID guest ids to update.';
      } else {
      if (!supabaseUrl || !serviceRole) {
        markSentUpdate.error = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
        markSentUpdate.failed += validGuestIds.length;
        summary.errors.push(
          'Invitation status not updated in DB: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
        );
      } else {
        const admin = createClient(supabaseUrl, serviceRole);
        const { data: updatedRows, error: updateError } = await admin
          .from('guests')
          .update({ invitation_status: 'sent' })
          .in('id', validGuestIds)
          .select('id');

        if (updateError) {
          markSentUpdate.error = updateError.message;
          markSentUpdate.failed += validGuestIds.length;
          summary.errors.push(`Invitation status update failed: ${updateError.message}`);
        } else {
          const updatedCount = updatedRows?.length ?? 0;
          markSentUpdate.updated += updatedCount;
          markSentUpdate.failed += Math.max(validGuestIds.length - updatedCount, 0);

          if (markSentUpdate.failed > 0) {
            summary.errors.push(
              `Invitation status updated for ${updatedCount}/${validGuestIds.length} valid guest ids.`
            );
          }
        }
      }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        summary,
        mark_sent_requested: markSent,
        mark_sent_update: markSentUpdate,
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
