declare namespace Deno {
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
  namespace env { function get(name: string): string | undefined; }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Delivery = { delivery_id: string; recipient_phone: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const templateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME');
  const templateLanguage = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';
  const graphVersion = Deno.env.get('WHATSAPP_GRAPH_API_VERSION');
  if (!supabaseUrl || !serviceRoleKey || !accessToken || !phoneNumberId || !templateName || !graphVersion) {
    return json({ error: 'WhatsApp Business notifications are not configured on the server.' }, 503);
  }
  if (!/^v\d+\.\d+$/.test(graphVersion)) return json({ error: 'Invalid WhatsApp Graph API version configuration.' }, 500);

  const authorization = request.headers.get('Authorization');
  const publishableKey = request.headers.get('apikey');
  if (!authorization || !publishableKey) return json({ error: 'Authentication required.' }, 401);

  let userResponse: Response;
  try {
    userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
  } catch {
    return json({ error: 'Could not verify your Supabase session.' }, 502);
  }
  if (!userResponse.ok) return json({ error: 'Invalid Supabase session.' }, 401);
  const user = await userResponse.json();
  if (typeof user.id !== 'string') return json({ error: 'Invalid Supabase user.' }, 401);

  let body: { request_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON request body.' }, 400);
  }
  if (typeof body.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)) {
    return json({ error: 'A valid request_id is required.' }, 400);
  }

  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
  let claimsResponse: Response;
  try {
    claimsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_whatsapp_alerts`, {
      method: 'POST', headers: adminHeaders,
      body: JSON.stringify({ p_request_id: body.request_id, p_owner_id: user.id }),
    });
  } catch {
    return json({ error: 'Could not load eligible alert recipients.' }, 502);
  }
  if (!claimsResponse.ok) return json({ error: 'Could not load eligible alert recipients.' }, 502);

  const deliveries = await claimsResponse.json() as Delivery[];
  let accepted = 0;
  let failed = 0;
  const sendDelivery = async (delivery: Delivery) => {
    let sent = false;
    let messageId: string | null = null;
    let errorMessage = 'WhatsApp did not accept this alert.';
    try {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: delivery.recipient_phone.replace(/\D/g, ''),
          type: 'template',
          template: { name: templateName, language: { code: templateLanguage } },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      sent = response.ok && typeof result?.messages?.[0]?.id === 'string';
      messageId = sent ? result.messages[0].id : null;
      if (!sent) errorMessage = typeof result?.error?.code === 'number' ? `WhatsApp API error ${result.error.code}.` : errorMessage;
    } catch {
      errorMessage = 'Could not reach the WhatsApp API.';
    }

    try {
      const finished = await fetch(`${supabaseUrl}/rest/v1/rpc/finish_whatsapp_alert`, {
        method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ p_delivery_id: delivery.delivery_id, p_sent: sent, p_message_id: messageId, p_error: errorMessage }),
      });
      if (!finished.ok) sent = false;
    } catch {
      sent = false;
    }
    return sent;
  };

  // Send in small concurrent batches so a busy radius does not serialize 50 network calls.
  for (let start = 0; start < deliveries.length; start += 5) {
    const results = await Promise.all(deliveries.slice(start, start + 5).map(sendDelivery));
    accepted += results.filter(Boolean).length;
    failed += results.filter((sent) => !sent).length;
  }

  return json({ accepted, failed, attempted: deliveries.length });
});
