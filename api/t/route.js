export const runtime = "edge";

export async function GET(req) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("u") || "").toUpperCase();
  const UID = raw.replace(/[^0-9A-F]/g, "");

  if (!UID) return redirect("/claim", {});

  // remember the UID for ~10 minutes
  const cookie = [
    `uid=${UID}`,
    "Path=/",
    "Max-Age=600",          // 10 minutes is plenty for claiming
    "SameSite=Lax",
    "HttpOnly",             // server reads it; client JS doesn’t need it
    // omit Secure so it also works on *.vercel.app over HTTPS (Secure is fine too if all HTTPS)
  ].join("; ");

  // If already bound, send them straight through; otherwise go to claim page.
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const q = `${SUPABASE_URL}/rest/v1/uids?uid=eq.${UID}&select=businesses(affiliate_url)`;
  const r = await fetch(q, { headers });
  const rows = r.ok ? await r.json() : [];
  const dest = rows?.[0]?.businesses?.affiliate_url;

  if (dest) return redirect(withUTM(dest, UID), { cookie });
  return redirect(`/claim`, { cookie });
}

function withUTM(dest, uid) {
  const u = new URL(dest);
  u.searchParams.set("utm_source","display");
  u.searchParams.set("utm_medium","nfc");
  u.searchParams.set("utm_campaign", uid);
  return u.toString();
}

function redirect(to, { cookie } = {}) {
  const headers = { Location: to };
  if (cookie) headers["Set-Cookie"] = cookie;
  headers["Cache-Control"] = "no-store";
  return new Response(null, { status: 302, headers });
}
