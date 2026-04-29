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

type DownloadPayload = {
  guest_id: string;
  guest_name: string;
  is_couple?: boolean;
  person_type: 'family' | 'friends' | 'work';
  gender: 'male' | 'female';
  contact_email?: string;
  contact_phone?: string;
  partner_contact_phone?: string;
};

const personTypeLabel = (type: 'family' | 'friends' | 'work', gender: 'male' | 'female') => {
  if (type === 'family') return 'membre de la famille';
  if (type === 'friends') return gender === 'female' ? 'amie' : 'ami';
  return 'collègue';
};

const genderLabel = (gender: 'male' | 'female') => (gender === 'female' ? 'Femme' : 'Homme');
const civility = (gender: 'male' | 'female') => (gender === 'female' ? 'Chère' : 'Cher');

const parseEmailList = (raw?: string, fallback: string[] = []): string[] => {
  const source = (raw ?? '').trim();
  const values = source ? source.split(',') : fallback;
  const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(normalized));
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as DownloadPayload;

    const notifyEmail = Deno.env.get('NOTIFY_EMAIL') ?? 'jonathanlokala9@gmail.com';
    const notifyPhone = Deno.env.get('NOTIFY_PHONE') ?? '+243816300058';
    const notifyEmailWife = Deno.env.get('NOTIFY_EMAIL_WIFE') ?? 'marianzitusumvibudulu@gmail.com';
    const notifyPhoneWife = Deno.env.get('NOTIFY_PHONE_WIFE') ?? '+243816868175';
    const notifyEmailsRaw = Deno.env.get('NOTIFY_EMAILS');
    const hostEmailRecipients = parseEmailList(notifyEmailsRaw, [notifyEmail, notifyEmailWife]);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Mariage Jonathan & Maria <onboarding@resend.dev>';
    const emailAssetBaseUrl = (Deno.env.get('EMAIL_ASSET_BASE_URL') ?? '').replace(/\/$/, '');
    const africastalkingApiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const africastalkingUsername = Deno.env.get('AFRICASTALKING_USERNAME') ?? 'sandbox';
    const africastalkingBaseUrl = (Deno.env.get('AFRICASTALKING_BASE_URL') ?? 'https://api.sandbox.africastalking.com')
      .replace(/\/version1\/messaging\/?$/i, '')
      .replace(/\/$/, '');
    const isSandboxUrl = africastalkingBaseUrl.includes('sandbox');
    const africastalkingFrom = Deno.env.get('AFRICASTALKING_FROM')?.trim();

    const results = {
      hostSmsSent: false,
      hostEmailSent: false,
      guestSmsSent: false,
      guestEmailSent: false,
      downloadCount: 0,
      errors: [] as string[],
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const adminClient = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

    const logDispatch = async (entry: DispatchLogInsert) => {
      if (!adminClient) return;
      const { error } = await adminClient.from('message_dispatch_logs').insert({
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
      });

      if (error) {
        console.error('message_dispatch_logs insert failed (notify-download):', error.message);
      }
    };

    if (supabaseUrl && supabaseServiceRoleKey && payload.guest_id) {
      const { data: currentGuest, error: readError } = await adminClient
        .from('guests')
        .select('download_count')
        .eq('id', payload.guest_id)
        .single();

      if (readError) {
        results.errors.push(`Compteur lecture: ${readError.message}`);
      } else {
        const nextDownloadCount = (currentGuest?.download_count ?? 0) + 1;
        const { data: updatedGuest, error: updateError } = await adminClient
          .from('guests')
          .update({ download_count: nextDownloadCount })
          .eq('id', payload.guest_id)
          .select('download_count')
          .single();

        if (updateError) {
          results.errors.push(`Compteur update: ${updateError.message}`);
        } else {
          results.downloadCount = updatedGuest?.download_count ?? nextDownloadCount;
        }
      }
    } else {
      results.errors.push('Compteur ignoré: configuration ou guest_id manquant.');
    }

    const contactPhone = payload.contact_phone?.trim() || 'Non renseigne';
    const contactEmail = payload.contact_email?.trim() || 'Non renseigne';
    const invitationLabel = payload.is_couple ? `Mr. ${payload.guest_name} and spouse` : payload.guest_name;

    const hostSmsBody = [
      'Invitation telechargee',
      `Nom: ${invitationLabel}`,
      `Type: ${personTypeLabel(payload.person_type, payload.gender)}`,
      `Sexe: ${genderLabel(payload.gender)}`,
      `Tel: ${contactPhone}`,
      `Email: ${contactEmail}`,
      `Downloads: ${results.downloadCount}`,
    ].join(' | ');

    const hostEmailSubject = `Invitation téléchargée — ${invitationLabel}`;
    const hostEmailText = [
      '✨ Bonne nouvelle!',
      '',
      'Un invité vient de télécharger son invitation.',
      '',
      `Nom complet: ${invitationLabel}`,
      `Type: ${personTypeLabel(payload.person_type, payload.gender)}`,
      `Sexe: ${genderLabel(payload.gender)}`,
      `Téléphone connu: ${contactPhone}`,
      `Email connu: ${contactEmail}`,
      `Nombre de téléchargements: ${results.downloadCount}`,
      '',
      '— Système de gestion du mariage prophétique',
    ].join('\n');

    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://powerfulweddingoftheuniverse.netlify.app/';
    const guestSmsBody = [
      `${civility(payload.gender)} ${invitationLabel}, votre invitation au mariage de Jonathan & Maria vient d'etre telechargee avec succes.`,
      'Merci de la conserver precieusement comme invitation officielle.',
      'Si ce n est pas encore fait, confirmez votre presence sur le site:',
      siteUrl,
      'Jonathan & Maria - 26 juin 2026.',
    ].join(' ');

    const guestEmailSubject = 'Official Wedding Invitation - Jonathan & Maria';
    const guestEmailText = [
      '══════════════════════════════════════════════════════════════════',
      '                     OFFICIAL WEDDING INVITATION',
      '                     OFFICIAL WEDDING INVITATION',
      '══════════════════════════════════════════════════════════════════',
      '',
      `${civility(payload.gender)} ${invitationLabel},`,
      '',
      "C'est avec une joie profonde, un cœur rempli de gratitude et une âme animée par la foi que nous avons",
      "l'immense honneur de vous convier à la célébration de notre union sacrée.",
      '',
      'Ce mariage n\'est pas simplement un événement — c\'est une rencontre prophétique, ordonnée par Dieu,',
      'scellée dans l\'éternité, et célébrée avec grandeur devant notre famille, nos amis et nos bien-aimés.',
      '',
      'Votre présence à nos côtés est pour nous un cadeau inestimable. Vous êtes choisi(e) parmi les nôtres',
      'pour partager ce moment solennel et inoubliable.',
      '',
      '──────────────────────────────────────────────────────────────────',
      '                        PROGRAMME DES FESTIVITÉS',
      '──────────────────────────────────────────────────────────────────',
      '',
      '  MARIAGE CIVIL',
      '  Date    : Vendredi 29 mai 2026',
      '  Heure   : 9h00',
      '  Lieu    : Commune de la Gombe — Kinshasa, République Démocratique du Congo',
      '',
      '  MARIAGE TRADITIONNEL (DOT)',
      '  Date    : Vendredi 26 juin 2026',
      '  Heure   : 9h00',
      '  Lieu    : À confirmer — Kinshasa, République Démocratique du Congo',
      '',
      '  CÉRÉMONIE RELIGIEUSE',
      '  Date    : Vendredi 26 juin 2026',
      '  Heure   : 16h00',
      '  Lieu    : À confirmer — Kinshasa, République Démocratique du Congo',
      '',
      '  SOIRÉE DE RÉCEPTION & CÉLÉBRATION',
      '  Date    : Vendredi 26 juin 2026',
      '  Heure   : 21h00',
      '  Lieu    : À confirmer — Kinshasa, République Démocratique du Congo',
      '',
      '──────────────────────────────────────────────────────────────────',
      '                        INFORMATIONS PRATIQUES',
      '──────────────────────────────────────────────────────────────────',
      '',
      '  Confirmation de présence (RSVP) :',
      '  Nous vous prions de confirmer votre présence le plus tôt possible via notre site officiel.',
      '  Site officiel : https://powerfulweddingoftheuniverse.netlify.app/',
      '',
      '  Tenue vestimentaire :',
      '  Nous vous invitons à vous vêtir avec élégance pour honorer la solennité de cette célébration.',
      '  Code vestimentaire recommandé : Tenue de cérémonie / Tenue africaine ou européenne formelle.',
      '',
      '  Votre invitation numérique :',
      '  Vous venez de télécharger votre invitation personnelle. Nous vous remercions.',
      '  Veuillez la conserver précieusement — elle attestera de votre invitation personnelle.',
      '',
      '══════════════════════════════════════════════════════════════════',
      '                          ENGLISH VERSION',
      '══════════════════════════════════════════════════════════════════',
      '',
      `Dear ${invitationLabel},`,
      '',
      'It is with deep joy, a heart full of gratitude and a soul moved by faith that we have the immense',
      'honor of inviting you to the celebration of our sacred union.',
      '',
      'This wedding is not merely an event — it is a prophetic encounter, ordained by God, sealed in eternity,',
      'and celebrated with grandeur before our family, our friends and our beloved ones.',
      '',
      'Your presence at our side is an invaluable gift to us. You are chosen among ours to share this',
      'solemn and unforgettable moment.',
      '',
      '──────────────────────────────────────────────────────────────────',
      '                          EVENT SCHEDULE',
      '──────────────────────────────────────────────────────────────────',
      '',
      '  CIVIL WEDDING CEREMONY',
      '  Date  : Friday, May 29, 2026',
      '  Time  : 9:00 AM',
      '  Venue : Commune de la Gombe — Kinshasa, Democratic Republic of Congo',
      '',
      '  TRADITIONAL WEDDING CEREMONY (DOT)',
      '  Date  : Friday, June 26, 2026',
      '  Time  : 9:00 AM',
      '  Venue : To be confirmed — Kinshasa, Democratic Republic of Congo',
      '',
      '  RELIGIOUS CEREMONY',
      '  Date  : Friday, June 26, 2026',
      '  Time  : 4:00 PM',
      '  Venue : To be confirmed — Kinshasa, Democratic Republic of Congo',
      '',
      '  RECEPTION & CELEBRATION EVENING',
      '  Date  : Friday, June 26, 2026',
      '  Time  : 9:00 PM',
      '  Venue : To be confirmed — Kinshasa, Democratic Republic of Congo',
      '',
      '──────────────────────────────────────────────────────────────────',
      '                         PRACTICAL INFORMATION',
      '──────────────────────────────────────────────────────────────────',
      '',
      '  RSVP — Kindly confirm your attendance as soon as possible via our official website.',
      '  Official website : https://powerfulweddingoftheuniverse.netlify.app/',
      '',
      '  Dress Code : Elegant ceremony attire — formal African or European dress.',
      '',
      '  Your personal invitation has been successfully downloaded.',
      '  Please keep it as your official entry document.',
      '',
      '══════════════════════════════════════════════════════════════════',
      '',
      '              Avec tout notre amour et notre reconnaissance,',
      '                  With all our love and our gratitude,',
      '',
      '                        Jonathan Lokala — Lomboto',
      '                                  &',
      '                       Maria Nzitusu — Mvibudulu',
      '',
      '                 Site officiel / Official website :',
      '         https://powerfulweddingoftheuniverse.netlify.app/',
      '',
      '══════════════════════════════════════════════════════════════════',
    ].join('\n');

    const jmImageUrl = emailAssetBaseUrl
      ? `${emailAssetBaseUrl}/JM.jpeg`
      : 'https://powerfulweddingoftheuniverse.netlify.app/JM.jpeg';

    const gold = '#D4AF37';
    const bg = '#060E1C';
    const guestEmailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Official Invitation - Jonathan &amp; Maria</title></head>
<body style="margin:0;padding:0;background:${bg};font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#0A1628;border:1px solid ${gold};border-radius:12px;overflow:hidden;">

      <!-- Sceau royal JM -->
      <tr><td style="background:#060E1C;padding:32px 40px 8px;text-align:center;">
        <img src="${jmImageUrl}" alt="Sceau Jonathan &amp; Maria" width="180" height="180" style="display:inline-block;border-radius:50%;border:2px solid #D4AF37;box-shadow:0 0 24px #D4AF3760;"/>
      </td></tr>

      <!-- Bandeau titre -->
      <tr><td style="background:linear-gradient(135deg,#0A1628 0%,#1a2a4a 100%);padding:36px 40px 24px;text-align:center;border-bottom:1px solid ${gold}40;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${gold};font-family:Arial,sans-serif;">OFFICIAL WEDDING INVITATION</p>
        <h1 style="margin:0;font-size:28px;color:#ffffff;font-weight:normal;line-height:1.3;">Wedding Celebration of</h1>
        <h2 style="margin:8px 0 0;font-size:22px;color:${gold};font-weight:normal;">Jonathan Lokala — Lomboto</h2>
        <p style="margin:6px 0;font-size:18px;color:#ffffff;">&amp;</p>
        <h2 style="margin:0;font-size:22px;color:${gold};font-weight:normal;">Maria Nzitusu — Mvibudulu</h2>
      </td></tr>

      <!-- Salutation -->
      <tr><td style="padding:32px 40px 0;">
        <p style="margin:0;font-size:17px;color:#ffffff;"><strong>${civility(payload.gender)} ${invitationLabel},</strong></p>
        <p style="margin:16px 0 0;font-size:15px;color:#cccccc;line-height:1.8;">
          C'est avec une joie profonde, un cœur rempli de gratitude et une âme animée par la foi que nous avons l'immense honneur de vous convier à la célébration de notre union sacrée.
        </p>
        <p style="margin:14px 0 0;font-size:15px;color:#cccccc;line-height:1.8;">
          Ce mariage n'est pas simplement un événement — c'est une <em>rencontre prophétique</em>, ordonnée par Dieu, scellée dans l'éternité, et célébrée avec grandeur devant notre famille, nos amis et nos bien-aimés.
        </p>
        <p style="margin:14px 0 0;font-size:15px;color:#cccccc;line-height:1.8;">
          Votre présence à nos côtés est un cadeau inestimable. Vous êtes choisi(e) parmi les nôtres pour partager ce moment solennel et inoubliable.
        </p>
      </td></tr>

      <!-- Séparateur -->
      <tr><td style="padding:28px 40px 0;"><div style="border-top:1px solid ${gold}50;"></div></td></tr>

      <!-- Programme -->
      <tr><td style="padding:24px 40px 0;">
        <p style="margin:0 0 18px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${gold};font-family:Arial,sans-serif;">Programme des Festivités</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e3050;vertical-align:top;width:42%;color:${gold};font-size:13px;font-family:Arial,sans-serif;letter-spacing:0.5px;">MARIAGE CIVIL</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #1e3050;vertical-align:top;color:#ffffff;font-size:14px;">Vendredi 29 mai 2026 &nbsp;·&nbsp; 9h00<br><span style="color:#888;font-size:12px;">Commune de la Gombe — Kinshasa, RDC</span></td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e3050;vertical-align:top;color:${gold};font-size:13px;font-family:Arial,sans-serif;letter-spacing:0.5px;">MARIAGE TRADITIONNEL</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #1e3050;vertical-align:top;color:#ffffff;font-size:14px;">Vendredi 26 juin 2026 &nbsp;·&nbsp; 9h00<br><span style="color:#888;font-size:12px;">Lieu à confirmer — Kinshasa, RDC</span></td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1e3050;vertical-align:top;color:${gold};font-size:13px;font-family:Arial,sans-serif;letter-spacing:0.5px;">CÉRÉMONIE RELIGIEUSE</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #1e3050;vertical-align:top;color:#ffffff;font-size:14px;">Vendredi 26 juin 2026 &nbsp;·&nbsp; 16h00<br><span style="color:#888;font-size:12px;">Lieu à confirmer — Kinshasa, RDC</span></td>
          </tr>
          <tr>
            <td style="padding:10px 0;vertical-align:top;color:${gold};font-size:13px;font-family:Arial,sans-serif;letter-spacing:0.5px;">RÉCEPTION &amp; CÉLÉBRATION</td>
            <td style="padding:10px 0 10px 16px;vertical-align:top;color:#ffffff;font-size:14px;">Vendredi 26 juin 2026 &nbsp;·&nbsp; 21h00<br><span style="color:#888;font-size:12px;">Lieu à confirmer — Kinshasa, RDC</span></td>
          </tr>
        </table>
      </td></tr>

      <!-- Séparateur -->
      <tr><td style="padding:24px 40px 0;"><div style="border-top:1px solid ${gold}50;"></div></td></tr>

      <!-- Infos pratiques -->
      <tr><td style="padding:24px 40px 0;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${gold};font-family:Arial,sans-serif;">Informations Pratiques</p>
        <p style="margin:0 0 10px;font-size:14px;color:#cccccc;line-height:1.7;">
          <strong style="color:#ffffff;">Confirmation de présence (RSVP) :</strong><br>
          Nous vous prions de confirmer votre présence le plus tôt possible via notre site officiel.<br>
          <a href="https://powerfulweddingoftheuniverse.netlify.app/" style="color:${gold};text-decoration:none;">https://powerfulweddingoftheuniverse.netlify.app/</a>
        </p>
        <p style="margin:0 0 10px;font-size:14px;color:#cccccc;line-height:1.7;">
          <strong style="color:#ffffff;">Tenue vestimentaire :</strong><br>
          Tenue de cérémonie formelle — africaine ou européenne élégante.
        </p>
        <p style="margin:0;font-size:14px;color:#cccccc;line-height:1.7;">
          <strong style="color:#ffffff;">Votre invitation numérique :</strong><br>
          Vous venez de télécharger votre invitation personnelle. Veuillez la conserver précieusement — elle attestera de votre convocation officielle.
        </p>
      </td></tr>

      <!-- Séparateur -->
      <tr><td style="padding:28px 40px 0;"><div style="border-top:1px solid ${gold}50;"></div></td></tr>

      <!-- Version anglaise salutation -->
      <tr><td style="padding:24px 40px 0;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${gold};font-family:Arial,sans-serif;">English Version</p>
        <p style="margin:0;font-size:17px;color:#ffffff;"><strong>Dear ${invitationLabel},</strong></p>
        <p style="margin:14px 0 0;font-size:15px;color:#cccccc;line-height:1.8;">
          It is with deep joy, a heart full of gratitude and a soul moved by faith that we have the immense honor of inviting you to the celebration of our sacred union.
        </p>
        <p style="margin:14px 0 0;font-size:15px;color:#cccccc;line-height:1.8;">
          This wedding is not merely an event — it is a <em>prophetic encounter</em>, ordained by God, sealed in eternity, and celebrated with grandeur before our family, our friends and our beloved ones.
        </p>
        <p style="margin:14px 0 0;font-size:15px;color:#cccccc;line-height:1.8;">
          <strong style="color:#ffffff;">RSVP:</strong> Please confirm your attendance via our official website:<br>
          <a href="https://powerfulweddingoftheuniverse.netlify.app/" style="color:${gold};text-decoration:none;">https://powerfulweddingoftheuniverse.netlify.app/</a>
        </p>
        <p style="margin:14px 0 0;font-size:14px;color:#cccccc;line-height:1.7;">
          <strong style="color:#ffffff;">Dress Code:</strong> Elegant formal ceremony attire — African or European.
        </p>
      </td></tr>

      <!-- Signature -->
      <tr><td style="padding:36px 40px;text-align:center;border-top:1px solid ${gold}40;margin-top:28px;">
        <p style="margin:0 0 16px;font-size:13px;color:#888;font-family:Arial,sans-serif;">Avec tout notre amour &nbsp;·&nbsp; With all our love</p>
        <img src="${jmImageUrl}" alt="Jonathan &amp; Maria" width="100" height="100" style="display:inline-block;border-radius:50%;border:1px solid ${gold};margin-bottom:12px;"/>
        <p style="margin:0;font-size:20px;color:${gold};">Jonathan &amp; Maria</p>
        <p style="margin:8px 0 0;font-size:12px;color:#555;font-family:Arial,sans-serif;">
          <a href="https://powerfulweddingoftheuniverse.netlify.app/" style="color:#555;text-decoration:none;">powerfulweddingoftheuniverse.netlify.app</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    const sendSms = async (to: string, body: string): Promise<string | null> => {
      if (!africastalkingApiKey || !africastalkingUsername) return 'Africastalking non configuré';

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
          Recipients?: Array<{ number?: string; status?: string; statusCode?: number | string; messageId?: string }>;
        };
      } | null = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        const providerMessage = parsed?.SMSMessageData?.Message;
        return `AT HTTP ${res.status}: ${providerMessage ?? raw}`;
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

    const sendEmail = async (to: string, subject: string, text: string, html?: string): Promise<string | null> => {
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
          ...(html ? { html } : {}),
        }),
      });
      if (res.ok) return null;
      return await res.text();
    };

    await logDispatch({
      source_function: 'notify-download',
      event_type: 'invitation_download',
      channel: 'sms',
      recipient_type: 'host',
      guest_id: payload.guest_id,
      guest_name: invitationLabel,
      target: notifyPhone,
      status: 'eligible',
      provider: 'africastalking',
      metadata: { audience: 'host_primary' },
    });

    const hostSmsErr = await sendSms(notifyPhone, hostSmsBody);
    if (hostSmsErr) {
      results.errors.push(`SMS hôte principal: ${hostSmsErr}`);
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'sms',
        recipient_type: 'host',
        guest_id: payload.guest_id,
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
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'sms',
        recipient_type: 'host',
        guest_id: payload.guest_id,
        guest_name: invitationLabel,
        target: notifyPhone,
        status: 'sent',
        provider: 'africastalking',
        metadata: { audience: 'host_primary' },
      });
    }

    await logDispatch({
      source_function: 'notify-download',
      event_type: 'invitation_download',
      channel: 'sms',
      recipient_type: 'host',
      guest_id: payload.guest_id,
      guest_name: invitationLabel,
      target: notifyPhoneWife,
      status: 'eligible',
      provider: 'africastalking',
      metadata: { audience: 'host_secondary' },
    });

    const hostSmsWifeErr = await sendSms(notifyPhoneWife, hostSmsBody);
    if (hostSmsWifeErr) {
      results.errors.push(`Host secondary SMS failed: ${hostSmsWifeErr}`);
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'sms',
        recipient_type: 'host',
        guest_id: payload.guest_id,
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
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'sms',
        recipient_type: 'host',
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
        target: notifyPhoneWife,
        status: 'sent',
        provider: 'africastalking',
        metadata: { audience: 'host_secondary' },
      });
    }

    let hostEmailSuccess = 0;
    for (const recipient of hostEmailRecipients) {
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'email',
        recipient_type: 'host',
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
        target: recipient,
        status: 'eligible',
        provider: 'resend',
        metadata: { audience: 'host' },
      });

      const hostEmailErr = await sendEmail(recipient, hostEmailSubject, hostEmailText);
      if (hostEmailErr) {
        results.errors.push(`Email hôte ${recipient}: ${hostEmailErr}`);
        await logDispatch({
          source_function: 'notify-download',
          event_type: 'invitation_download',
          channel: 'email',
          recipient_type: 'host',
          guest_id: payload.guest_id,
          guest_name: payload.guest_name,
          target: recipient,
          status: 'failed',
          provider: 'resend',
          error_message: hostEmailErr,
          metadata: { audience: 'host' },
        });
      } else {
        hostEmailSuccess += 1;
        await logDispatch({
          source_function: 'notify-download',
          event_type: 'invitation_download',
          channel: 'email',
          recipient_type: 'host',
          guest_id: payload.guest_id,
          guest_name: payload.guest_name,
          target: recipient,
          status: 'sent',
          provider: 'resend',
          metadata: { audience: 'host' },
        });
      }
    }
    results.hostEmailSent = hostEmailSuccess > 0;

    const guestSmsTargets = Array.from(
      new Set([payload.contact_phone, payload.partner_contact_phone].map((phone) => phone?.trim()).filter(Boolean))
    ) as string[];

    if (guestSmsTargets.length > 0) {
      let guestSmsSuccessCount = 0;

      for (const guestSmsTarget of guestSmsTargets) {
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'sms',
        recipient_type: 'guest',
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
          target: guestSmsTarget,
        status: 'eligible',
        provider: 'africastalking',
        metadata: { audience: 'guest' },
      });

        const guestSmsErr = await sendSms(guestSmsTarget, guestSmsBody);
      if (guestSmsErr) {
          results.errors.push(`SMS invité ${guestSmsTarget}: ${guestSmsErr}`);
        await logDispatch({
          source_function: 'notify-download',
          event_type: 'invitation_download',
          channel: 'sms',
          recipient_type: 'guest',
          guest_id: payload.guest_id,
          guest_name: payload.guest_name,
            target: guestSmsTarget,
          status: 'failed',
          provider: 'africastalking',
          error_message: guestSmsErr,
          metadata: { audience: 'guest' },
        });
      } else {
          guestSmsSuccessCount += 1;
        await logDispatch({
          source_function: 'notify-download',
          event_type: 'invitation_download',
          channel: 'sms',
          recipient_type: 'guest',
          guest_id: payload.guest_id,
          guest_name: payload.guest_name,
            target: guestSmsTarget,
          status: 'sent',
          provider: 'africastalking',
          metadata: { audience: 'guest' },
        });
      }
      }

      results.guestSmsSent = guestSmsSuccessCount > 0;
    } else {
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'sms',
        recipient_type: 'guest',
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
        target: null,
        status: 'skipped',
        provider: 'africastalking',
        error_message: 'No guest phone provided',
        metadata: { audience: 'guest' },
      });
    }

    if (payload.contact_email?.trim()) {
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'email',
        recipient_type: 'guest',
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
        target: payload.contact_email.trim(),
        status: 'eligible',
        provider: 'resend',
        metadata: { audience: 'guest' },
      });

      const guestEmailErr = await sendEmail(payload.contact_email.trim(), guestEmailSubject, guestEmailText, guestEmailHtml);
      if (guestEmailErr) {
        results.errors.push(`Email invité: ${guestEmailErr}`);
        await logDispatch({
          source_function: 'notify-download',
          event_type: 'invitation_download',
          channel: 'email',
          recipient_type: 'guest',
          guest_id: payload.guest_id,
          guest_name: payload.guest_name,
          target: payload.contact_email.trim(),
          status: 'failed',
          provider: 'resend',
          error_message: guestEmailErr,
          metadata: { audience: 'guest' },
        });
      } else {
        results.guestEmailSent = true;
        await logDispatch({
          source_function: 'notify-download',
          event_type: 'invitation_download',
          channel: 'email',
          recipient_type: 'guest',
          guest_id: payload.guest_id,
          guest_name: payload.guest_name,
          target: payload.contact_email.trim(),
          status: 'sent',
          provider: 'resend',
          metadata: { audience: 'guest' },
        });
      }
    } else {
      await logDispatch({
        source_function: 'notify-download',
        event_type: 'invitation_download',
        channel: 'email',
        recipient_type: 'guest',
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
        target: null,
        status: 'skipped',
        provider: 'resend',
        error_message: 'No guest email provided',
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
