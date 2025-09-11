export const runtime = "edge";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  // Prefer JSON body, but fall back to cookie
  let UID = (body.uid || "").toUpperCase().replace(/[^0-9A-F]/g, "");
  if (!UID) {
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/(?:^|;\s*)uid=([0-9A-F]+)/);
    UID = m ? m[1] : "";
  }
  const business_id = body.business_id;

  if (!UID || !business_id) {
    return json({ error: "missing_uid_or_business" }, 400);
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };

  // Already claimed UID?
  const [uidCheck, bizCheck] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/uids?uid=eq.${UID}&select=uid`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${business_id}&select=is_claimed,affiliate_url`, { headers })
  ]);

  const uidRows = uidCheck.ok ? await uidCheck.json() : [];
  const bizRows = bizCheck.ok ? await bizCheck.json() : [];
  const biz = bizRows[0];

  if (uidRows.length) return json({ error: "uid_already_claimed" }, 409);
  if (!biz || biz.is_claimed) return json({ error: "business_already_claimed" }, 409);

  // Bind UID → business
  const bind = await fetch(`${SUPABASE_URL}/rest/v1/uids`, {
    method: "POST", headers,
    body: JSON.stringify({ uid: UID, business_id, claimed_at: new Date().toISOString() })
  });
  if (!bind.ok) return json({ error: "bind_fail" }, 500);

  // Mark business claimed
  await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${business_id}`, {
    method: "PATCH", headers, body: JSON.stringify({ is_claimed: true })
  });

  return json({ to: withUTM(biz.affiliate_url, UID) });
}

function withUTM(dest, uid) {
  const u = new URL(dest);
  u.searchParams.set("utm_source","display");
  u.searchParams.set("utm_medium","nfc");
  u.searchParams.set("utm_campaign", uid);
  return u.toString();
}
function json(obj, status=200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" }});
}
