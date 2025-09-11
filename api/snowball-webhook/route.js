export const runtime = "edge";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  // Change keys if your webhook differs
  const name = (body.business_name || body.affiliate_name || "").trim();
  const affiliate_url = (body.affiliate_link || body.tracking_link || "").trim();
  if (!name || !affiliate_url) return new Response("missing fields", { status: 400 });

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };

  // Upsert
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/businesses`, {
    method: "POST", headers, body: JSON.stringify([{ name, affiliate_url }])
  });
  if (!ins.ok) {
    await fetch(`${SUPABASE_URL}/rest/v1/businesses?name=eq.${encodeURIComponent(name)}`, {
      method: "PATCH", headers, body: JSON.stringify({ affiliate_url, is_claimed: false })
    });
  }
  return new Response("ok", { status: 200 });
}
