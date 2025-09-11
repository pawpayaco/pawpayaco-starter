export const runtime = "edge";

export async function GET(req) {
  const url = new URL(req.url);
  const uidRaw = url.searchParams.get("u") || "";
  const uid = uidRaw.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (!uid) return redirect("/claim"); // still shows manual box

  // set short-lived cookie so iPhone clicks can POST without JS passing UID
  const cookie = `puid=${uid}; Path=/; Max-Age=600; SameSite=Lax; HttpOnly`;

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

  // Is this UID already mapped?
  const q = `${SUPABASE_URL}/rest/v1/uids?uid=eq.${uid}&select=businesses(affiliate_url)`;
  const r = await fetch(q, { headers });
  let dest = null;
  if (r.ok) {
    const rows = await r.json();
    dest = rows?.[0]?.businesses?.affiliate_url || null;
  }

  if (dest) {
    return new Response(null, { status: 302, headers: { "Location": withUTM(dest, uid), "Set-Cookie": cookie }});
  }
  return new Response(null, { status: 302, headers: { "Location": `/claim`, "Set-Cookie": cookie } });
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

function redirect(to) {
  return new Response(null, { status: 302, headers: { Location: to } });
}
