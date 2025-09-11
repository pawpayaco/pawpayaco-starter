export const runtime = "edge";

export async function POST(req) {
  const { uid, business_id } = await req.json().catch(() => ({}));
  if (!uid || !business_id) return json({ error: "missing" }, 400);

  const UID = uid.toUpperCase().replace(/[^0-9A-F]/g,"");
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" };

  const [uidCheck, bizCheck] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/uids?uid=eq.${UID}&select=uid`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${business_id}&select=is_claimed,affiliate_url`, { headers })
  ]);
  const uidRows = uidCheck.ok ? await uidCheck.json() : [];
  const bizRows = bizCheck.ok ? await bizCheck.json() : [];
  const biz = bizRows[0];
  if (uidRows.length) return json({ error: "uid_already_claimed" }, 409);
  if (!biz || biz.is_claimed) return json({ error: "business_already_claimed" }, 409);

  const bind = await fetch(`${SUPABASE_URL}/rest/v1/uids`, {
    method: "POST", headers,
    body: JSON.stringify({ uid: UID, business_id, claimed_at: new Date().toISOString() })
  });
  if (!bind.ok) return json({ error: "bind_fail" }, 500);

  await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${business_id}`, {
    method: "PATCH", headers, body: JSON.stringify({ is_claimed: true })
  });

  const to = withUTM(biz.affiliate_url, UID);
  return json({ to });
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