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

type NotifyPayload = {
  guest_name: string;
  is_couple?: boolean;
  gender?: 'male' | 'female';
  person_type?: 'family' | 'friends' | 'work';
  guest_phone?: string;
  guest_email?: string;
  rsvp_status: 'attending' | 'not_attending' | 'maybe';
  number_of_guests: number;
  rsvp_message: string;
  contact_email?: string;
  contact_phone?: string;
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
  metadata?: Record<string, unknown>;
};

const attendingLabel = (status: string, gender?: 'male' | 'female') => {
  if (status === 'attending') return gender === 'female' ? 'confirmée présente' : 'confirmé présent';
  if (status === 'not_attending') return gender === 'female' ? 'indisponible' : 'indisponible';
  return gender === 'female' ? 'incertaine' : 'incertain';
};

const personTypeLabel = (type?: 'family' | 'friends' | 'work') => {
  if (type === 'family') return 'Famille';
  if (type === 'friends') return 'Amis';
  if (type === 'work') return 'Travail';
  return 'Non défini';
};

const civility = (gender?: 'male' | 'female') => (gender === 'female' ? 'Chère' : 'Cher');

const parseEmailList = (raw?: string, fallback: string[] = []): string[] => {
  const source = (raw ?? '').trim();
  const values = source ? source.split(/[;,\n]/g) : fallback;
  const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(normalized));
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as NotifyPayload;

    const notifyEmail = Deno.env.get('NOTIFY_EMAIL') ?? 'jonathanlokala9@gmail.com';
    const notifyPhone = Deno.env.get('NOTIFY_PHONE') ?? '+243816300058';
    const notifyEmailWife = Deno.env.get('NOTIFY_EMAIL_WIFE') ?? 'marianzitusumvibudulu@gmail.com';
    const notifyPhoneWife = Deno.env.get('NOTIFY_PHONE_WIFE') ?? '+243816868175';
    const notifyEmailsRaw = Deno.env.get('NOTIFY_EMAILS');
    const fallbackRecipients = parseEmailList(undefined, [notifyEmail, notifyEmailWife]).filter(isValidEmail);
    const configuredRecipients = parseEmailList(notifyEmailsRaw).filter(isValidEmail);
    const hostEmailRecipients = configuredRecipients.length > 0 ? configuredRecipients : fallbackRecipients;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'RSVP Notifications <onboarding@resend.dev>';
    const africastalkingApiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const africastalkingUsername = Deno.env.get('AFRICASTALKING_USERNAME') ?? 'sandbox';
    const africastalkingBaseUrl = (Deno.env.get('AFRICASTALKING_BASE_URL') ?? 'https://api.sandbox.africastalking.com')
      .replace(/\/version1\/messaging\/?$/i, '')
      .replace(/\/$/, '');
    const isSandboxUrl = africastalkingBaseUrl.includes('sandbox');
    const africastalkingFrom = Deno.env.get('AFRICASTALKING_FROM')?.trim();
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
      console.error('CRITICAL: Supabase log client not initialized in notify-rsvp');
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
          metadata: entry.metadata ?? {},
        }),
      });

      if (!res.ok) {
        console.error('message_dispatch_logs insert failed (notify-rsvp):', await res.text());
      }
    };

    const providedPhone = payload.contact_phone?.trim() || 'Non renseigné';
    const profilePhone = payload.guest_phone?.trim() || 'Non renseigné';
    const providedEmail = payload.contact_email?.trim() || 'Non renseigné';
    const profileEmail = payload.guest_email?.trim() || 'Non renseigné';
    const invitationLabel = payload.is_couple ? `Mr. ${payload.guest_name} and spouse` : payload.guest_name;

    const guestSmsTarget = payload.contact_phone?.trim() || payload.guest_phone?.trim() || '';
    const guestEmailTarget = payload.contact_email?.trim() || payload.guest_email?.trim() || '';

    const lines = [
      '📬 Nouvelle réponse RSVP reçue',
      '',
      `Nom complet: ${invitationLabel}`,
      `Mode couple: ${payload.is_couple ? 'Oui (représentant du couple)' : 'Non'}`,
      `Sexe: ${payload.gender === 'female' ? 'Femme' : 'Homme'}`,
      `Type: ${personTypeLabel(payload.person_type)}`,
      `Statut RSVP: ${attendingLabel(payload.rsvp_status, payload.gender)} (${payload.rsvp_status})`,
      `Nombre de personnes: ${payload.number_of_guests}`,
      `Téléphone profil invité: ${profilePhone}`,
      `Téléphone saisi RSVP: ${providedPhone}`,
      `Email profil invité: ${profileEmail}`,
      `Email saisi RSVP: ${providedEmail}`,
      '',
      `Message: ${payload.rsvp_message?.trim() || 'Aucun message'}`,
    ];

    const content = lines.join('\n');

    const results = {
      hostEmailSent: false,
      hostSmsSent: false,
      guestEmailSent: false,
      guestSmsSent: false,
      errors: [] as string[],
    };

    const sendEmail = async (to: string, subject: string, text: string): Promise<string | null> => {
      if (!resendApiKey) return 'RESEND_API_KEY non configurée';
      if (!isValidEmail(to)) return `Adresse email invalide (${to})`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [to],
          subject,
          text,
        }),
      });

      if (res.ok) return null;
      return await res.text();
    };

    const sendSms = async (to: string, body: string): Promise<string | null> => {
      if (!africastalkingApiKey || !africastalkingUsername) {
        return 'Africastalking secrets non configurés (AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME)';
      }

      if (isSandboxUrl) {
        return 'Africastalking est en mode SANDBOX: les SMS réels ne peuvent pas être livrés. Configurez AFRICASTALKING_BASE_URL vers la production.';
      }

      if (africastalkingBaseUrl.includes('sandbox') && africastalkingUsername !== 'sandbox') {
        return "En mode sandbox, AFRICASTALKING_USERNAME doit être 'sandbox'.";
      }

      const toPhone = normalizePhone(to);

      if (!toPhone) {
        return `Numéro destinataire invalide (${to}).`;
      }

      const smsPayload = new URLSearchParams({
        username: africastalkingUsername,
        to: toPhone,
        message: body,
      });

      if (africastalkingFrom) {
        smsPayload.set('from', africastalkingFrom);
      }

      const africastalkingRes = await fetch(`${africastalkingBaseUrl}/version1/messaging`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: africastalkingApiKey,
        },
        body: smsPayload.toString(),
      });

      const raw = await africastalkingRes.text();
      let parsed: {
        SMSMessageData?: {
          Message?: string;
          Recipients?: Array<{ number?: string; status?: string; statusCode?: number | string; messageId?: string }>;
        };
      } | null = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (!africastalkingRes.ok) {
        const providerMessage = parsed?.SMSMessageData?.Message;
        return `AT HTTP ${africastalkingRes.status}: ${providerMessage ?? raw}`;
      }

      const recipients = parsed?.SMSMessageData?.Recipients ?? [];
      const failed = recipients.filter((recipient) => (recipient.status ?? '').toLowerCase() !== 'success');
      if (failed.length > 0) {
        const details = failed
          .map((recipient) => `${recipient.number ?? 'unknown'} (${recipient.status ?? 'unknown'} / ${recipient.statusCode ?? 'n/a'})`)
          .join(', ');
        return `AT recipient failure: ${details}`;
      }

      return null;
    };

    const hostEmailSubject = `RSVP: ${invitationLabel} (${payload.rsvp_status})`;
    let hostEmailSuccess = 0;
    for (const recipient of hostEmailRecipients) {
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'email',
        recipient_type: 'host',
        guest_name: invitationLabel,
        target: recipient,
        status: 'eligible',
        provider: 'resend',
        metadata: { audience: 'host' },
      });

      const hostEmailErr = await sendEmail(recipient, hostEmailSubject, content);
      if (hostEmailErr) {
        results.errors.push(`Email hôte ${recipient} failed: ${hostEmailErr}`);
        await logDispatch({
          source_function: 'notify-rsvp',
          event_type: 'rsvp_notification',
          channel: 'email',
          recipient_type: 'host',
          guest_name: invitationLabel,
          target: recipient,
          status: 'failed',
          provider: 'resend',
          error_message: hostEmailErr,
          metadata: { audience: 'host' },
        });
      } else {
        hostEmailSuccess += 1;
        await logDispatch({
          source_function: 'notify-rsvp',
          event_type: 'rsvp_notification',
          channel: 'email',
          recipient_type: 'host',
          guest_name: invitationLabel,
          target: recipient,
          status: 'sent',
          provider: 'resend',
          metadata: { audience: 'host' },
        });
      }
    }
    results.hostEmailSent = hostEmailSuccess > 0;

    if (guestEmailTarget) {
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'email',
        recipient_type: 'guest',
        guest_name: invitationLabel,
        target: guestEmailTarget,
        status: 'eligible',
        provider: 'resend',
        metadata: { audience: 'guest' },
      });

      const guestEmailBody = [
        `Bonjour ${invitationLabel},`,
        '',
        'Nous avons bien reçu votre réponse RSVP. Merci beaucoup.',
        `Statut: ${attendingLabel(payload.rsvp_status, payload.gender)} (${payload.rsvp_status})`,
        `Nombre de personnes: ${payload.number_of_guests}`,
        '',
        'Jonathan & Maria',
      ].join('\n');

      const guestEmailErr = await sendEmail(
        guestEmailTarget,
        'Confirmation RSVP reçue, Jonathan & Maria',
        guestEmailBody
      );
      if (guestEmailErr) {
        results.errors.push(`Email invité failed: ${guestEmailErr}`);
        await logDispatch({
          source_function: 'notify-rsvp',
          event_type: 'rsvp_notification',
          channel: 'email',
          recipient_type: 'guest',
          guest_name: invitationLabel,
          target: guestEmailTarget,
          status: 'failed',
          provider: 'resend',
          error_message: guestEmailErr,
          metadata: { audience: 'guest' },
        });
      } else {
        results.guestEmailSent = true;
        await logDispatch({
          source_function: 'notify-rsvp',
          event_type: 'rsvp_notification',
          channel: 'email',
          recipient_type: 'guest',
          guest_name: invitationLabel,
          target: guestEmailTarget,
          status: 'sent',
          provider: 'resend',
          metadata: { audience: 'guest' },
        });
      }
    }

    const hostSmsBody = [
      'Nouvelle RSVP',
      `Nom: ${invitationLabel}`,
      `Mode couple: ${payload.is_couple ? 'Oui' : 'Non'}`,
      `Type: ${personTypeLabel(payload.person_type)}`,
      `Sexe: ${payload.gender === 'female' ? 'Femme' : 'Homme'}`,
      `Statut: ${payload.rsvp_status}`,
      `Personnes: ${payload.number_of_guests}`,
      `Tel profil: ${profilePhone}`,
      `Tel RSVP: ${providedPhone}`,
      `Email profil: ${profileEmail}`,
      `Email RSVP: ${providedEmail}`,
      `Msg: ${(payload.rsvp_message?.trim() || 'Aucun').slice(0, 80)}`,
    ].join(' | ');

    await logDispatch({
      source_function: 'notify-rsvp',
      event_type: 'rsvp_notification',
      channel: 'sms',
      recipient_type: 'host',
      guest_name: invitationLabel,
      target: notifyPhone,
      status: 'eligible',
      provider: 'africastalking',
      metadata: { audience: 'host_primary' },
    });

    const hostSmsErr = await sendSms(notifyPhone, hostSmsBody);
    if (hostSmsErr) {
      results.errors.push(`SMS principal failed: ${hostSmsErr}`);
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'sms',
        recipient_type: 'host',
        guest_name: invitationLabel,
        target: notifyPhone,
        status: 'failed',
        provider: 'africastalking',
        error_message: hostSmsErr,
        metadata: { audience: 'host_primary' },
      });
    } else {
      results.hostSmsSent = true;
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'sms',
        recipient_type: 'host',
        guest_name: invitationLabel,
        target: notifyPhone,
        status: 'sent',
        provider: 'africastalking',
        metadata: { audience: 'host_primary' },
      });
    }

    await logDispatch({
      source_function: 'notify-rsvp',
      event_type: 'rsvp_notification',
      channel: 'sms',
      recipient_type: 'host',
      guest_name: invitationLabel,
      target: notifyPhoneWife,
      status: 'eligible',
      provider: 'africastalking',
      metadata: { audience: 'host_secondary' },
    });

    const hostSmsWifeErr = await sendSms(notifyPhoneWife, hostSmsBody);
    if (hostSmsWifeErr) {
      results.errors.push(`SMS wife failed: ${hostSmsWifeErr}`);
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'sms',
        recipient_type: 'host',
        guest_name: invitationLabel,
        target: notifyPhoneWife,
        status: 'failed',
        provider: 'africastalking',
        error_message: hostSmsWifeErr,
        metadata: { audience: 'host_secondary' },
      });
    } else {
      results.hostSmsSent = true;
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'sms',
        recipient_type: 'host',
        guest_name: invitationLabel,
        target: notifyPhoneWife,
        status: 'sent',
        provider: 'africastalking',
        metadata: { audience: 'host_secondary' },
      });
    }

    if (guestSmsTarget) {
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'sms',
        recipient_type: 'guest',
        guest_name: invitationLabel,
        target: guestSmsTarget,
        status: 'eligible',
        provider: 'africastalking',
        metadata: { audience: 'guest' },
      });

      const guestSmsBody = [
        `RSVP recu. ${civility(payload.gender)} ${invitationLabel}, merci pour votre reponse.`,
        `Statut: ${payload.rsvp_status}.`,
        `Jonathan & Maria.`,
      ].join(' ');

      const guestSmsErr = await sendSms(guestSmsTarget, guestSmsBody);
      if (guestSmsErr) {
        results.errors.push(`SMS invité failed: ${guestSmsErr}`);
        await logDispatch({
          source_function: 'notify-rsvp',
          event_type: 'rsvp_notification',
          channel: 'sms',
          recipient_type: 'guest',
          guest_name: invitationLabel,
          target: guestSmsTarget,
          status: 'failed',
          provider: 'africastalking',
          error_message: guestSmsErr,
          metadata: { audience: 'guest' },
        });
      } else {
        results.guestSmsSent = true;
        await logDispatch({
          source_function: 'notify-rsvp',
          event_type: 'rsvp_notification',
          channel: 'sms',
          recipient_type: 'guest',
          guest_name: invitationLabel,
          target: guestSmsTarget,
          status: 'sent',
          provider: 'africastalking',
          metadata: { audience: 'guest' },
        });
      }
    } else {
      await logDispatch({
        source_function: 'notify-rsvp',
        event_type: 'rsvp_notification',
        channel: 'sms',
        recipient_type: 'guest',
        guest_name: payload.guest_name,
        target: null,
        status: 'skipped',
        provider: 'africastalking',
        error_message: 'No guest phone provided',
        metadata: { audience: 'guest' },
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
