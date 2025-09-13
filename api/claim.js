export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only

const SB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

const normUID = (s='') => s.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
const json = (obj, status=200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type':'application/json','Cache-Control':'no-store' } });

export default async function handler(req) {
  const url = new URL(req.url);

  // GET: used by the page to auto-redirect if this UID is already linked
  if (req.method === 'GET') {
  const uid = normUID(url.searchParams.get('u') || '');
  if (!uid) return json({ error:'missing uid' }, 400);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/uids?uid=eq.${uid}&select=affiliate_url`,
    { headers: SB_HEADERS }
  );

  if (!r.ok) {
    const details = await r.text();
    return json({
      error: 'supabase_read_failed',
      status: r.status,
      details,
      haveUrl: !!SUPABASE_URL,
      haveKey: !!SERVICE_KEY
    }, 500);
  }

  const [row] = await r.json();
  return row?.affiliate_url ? json({ to: row.affiliate_url }) : json({ status:'unclaimed' });
}

  // POST: link UID -> business (allow MANY UIDs per business)
  if (req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch {}
    const uid = normUID(body.uid || '');
    const business_id = body.business_id || '';
    if (!uid || !business_id) return json({ error:'missing uid or business_id' }, 400);

    // fetch business (we only need the affiliate_url; DO NOT block on is_claimed)
    const bizRes = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?id=eq.${business_id}&select=id,affiliate_url`,
      { headers: SB_HEADERS }
    );
    if (!bizRes.ok) return json({ error:'supabase_read_failed' }, 500);
    const [biz] = await bizRes.json();
    if (!biz) return json({ error:'business_not_found' }, 404);

    // prevent duplicate for the same UID (many UIDs to one business is OK)
    const uRes = await fetch(`${SUPABASE_URL}/rest/v1/uids?uid=eq.${uid}&select=uid`, { headers: SB_HEADERS });
    const uRows = uRes.ok ? await uRes.json() : [];
    if (uRows.length) return json({ error:'uid_already_claimed' }, 409);

    // bind UID -> business and store affiliate_url for instant GET redirects later
    const bindRes = await fetch(`${SUPABASE_URL}/rest/v1/uids`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({
        uid,
        business_id,
        affiliate_url: biz.affiliate_url || null,
        registered_at: new Date().toISOString()
      })
    });
    if (!bindRes.ok) return json({ error:'bind_fail', detail: await bindRes.text() }, 500);

    // IMPORTANT: do NOT set businesses.is_claimed = true anymore
    return json({ to: addUTM(biz.affiliate_url, uid), status:'claimed' });
  }

  return json({ error:'method_not_allowed' }, 405);
}

function addUTM(dest, uid) {
  try {
    const u = new URL(dest);
    u.searchParams.set('utm_source', 'display');
    u.searchParams.set('utm_medium', 'nfc');
    u.searchParams.set('utm_campaign', uid);
    return u.toString();
  } catch { return dest; }
}
