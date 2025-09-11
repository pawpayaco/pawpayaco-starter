export const runtime = "edge";

export async function POST(req) {
  const { business_id: bodyBizId, uid: bodyUID } = await req.json().catch(() => ({}));

  // Try cookie first (iPhone flow), fall back to body
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieUID = (cookieHeader.match(/(?:^|;\s*)puid=([0-9A-F]+)/)?.[1] || "");
  const UID = (cookieUID || bodyUID || "").toUpperCase().replace(/[^0-9A-F]/g,"");
  const business_id = (bodyBizId || "").trim();
  if (!UID || !business_id) return json({ error: "missing_uid_or_business" }, 400);

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };

  // Already claimed?
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

  const to = withUTM(biz.affiliate_url, UID);
  // clear cookie
  const clear = `puid=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
  return new Response(JSON.stringify({ to }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": clear } });
}

function withUTM(dest, uid) {
  try {
    const u = new URL(dest);
    u.searchParams.set("utm_source","display");
    u.searchParams.set("utm_medium","nfc");
    u.searchParams.set("utm_campaign", uid);
    return u.toString();
  } catch { return dest; }
}
function json(obj, status=200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
