export const runtime = "edge";

export async function GET(req) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };

  let q = `${SUPABASE_URL}/rest/v1/businesses?select=id,name&is_claimed=eq.false&order=name.asc`;
  if (search) q += `&name=ilike.*${encodeURIComponent(search)}*`;

  const r = await fetch(q, { headers });
  const rows = r.ok ? await r.json() : [];
  return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" }});
}