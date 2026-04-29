import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-at-signature',
};

type DeliveryLogStatus = 'sent' | 'delivered' | 'failed';

const normalizePhone = (raw?: string | null): string | null => {
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
  return digits ? `+${digits}` : null;
};

const firstString = (payload: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }

  return null;
};

const normalizeProviderStatus = (rawStatus: string | null): DeliveryLogStatus => {
  const value = (rawStatus ?? '').toLowerCase();

  if (/(deliver|success|complete)/i.test(value)) return 'delivered';
  if (/(fail|reject|undeliver|expire|invalid|error)/i.test(value)) return 'failed';
  return 'sent';
};

const parsePayload = async (req: Request): Promise<Record<string, unknown>> => {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = await req.json();
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }

  const text = await req.text();
  if (!text.trim()) return {};

  try {
    const data = JSON.parse(text);
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }
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
    const webhookSecret = Deno.env.get('AFRICASTALKING_DELIVERY_SECRET')?.trim();
    if (webhookSecret) {
      const providedSecret =
        req.headers.get('x-webhook-secret')?.trim() ??
        req.headers.get('x-at-signature')?.trim() ??
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
        '';

      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
    }

    const payload = await parsePayload(req);
    const providerMessageId = firstString(payload, ['id', 'messageId', 'message_id', 'messageID']);
    const target = normalizePhone(firstString(payload, ['phoneNumber', 'phone_number', 'to', 'recipient', 'destination']));
    const providerStatus = firstString(payload, ['status', 'deliveryStatus', 'delivery_status', 'messageStatus']);
    const providerStatusDetail = firstString(payload, [
      'failureReason',
      'failure_reason',
      'description',
      'statusDescription',
      'status_description',
      'networkCode',
      'network_code',
    ]);
    const normalizedStatus = normalizeProviderStatus(providerStatus);

    if (!providerMessageId && !target) {
      return new Response(JSON.stringify({ error: 'Missing provider message id and target phone.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const admin = createClient(supabaseUrl, serviceRole);
    let matchedLogId: number | null = null;

    if (providerMessageId) {
      const { data } = await admin
        .from('message_dispatch_logs')
        .select('id')
        .eq('provider_message_id', providerMessageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      matchedLogId = data?.id ?? null;
    }

    if (!matchedLogId && target) {
      const { data } = await admin
        .from('message_dispatch_logs')
        .select('id')
        .eq('channel', 'sms')
        .eq('target', target)
        .eq('provider', 'africastalking')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      matchedLogId = data?.id ?? null;
    }

    if (!matchedLogId) {
      return new Response(
        JSON.stringify({ ok: true, matched: false, provider_message_id: providerMessageId, target }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const now = new Date().toISOString();
    const updatePayload = {
      status: normalizedStatus,
      provider_status: providerStatus,
      provider_status_detail: providerStatusDetail,
      provider_updated_at: now,
      delivered_at: normalizedStatus === 'delivered' ? now : null,
      provider_payload: payload,
      error_message: normalizedStatus === 'failed'
        ? providerStatusDetail ?? providerStatus ?? 'Provider reported delivery failure.'
        : null,
    };

    const { error: updateError } = await admin
      .from('message_dispatch_logs')
      .update(updatePayload)
      .eq('id', matchedLogId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, matched: true, id: matchedLogId, status: normalizedStatus }), {
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