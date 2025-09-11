export const runtime = "edge";

export async function GET(req) {
  const url = new URL(req.url);
  const uid = (url.searchParams.get("u") || "").toUpperCase().replace(/[^0-9A-F]/g, "");
  if (!uid) return redirect("/not-found");

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };

  const q = `${SUPABASE_URL}/rest/v1/uids?uid=eq.${uid}&select=businesses(affiliate_url)`;
  const r = await fetch(q, { headers });
  const rows = r.ok ? await r.json() : [];
  const dest = rows?.[0]?.businesses?.affiliate_url;

  if (dest) return redirect(withUTM(dest, uid));
  return redirect(`/claim?u=${uid}`);
}

function redirect(to) {
  return new Response(null, { status: 302, headers: { Location: to } });
}
function withUTM(dest, uid) {
  const u = new URL(dest);
  u.searchParams.set("utm_source","display");
  u.searchParams.set("utm_medium","nfc");
  u.searchParams.set("utm_campaign", uid);
  return u.toString();
}