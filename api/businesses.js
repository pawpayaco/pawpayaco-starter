export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const search = (url.searchParams.get('search') || '').trim();

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

  let q = `${SUPABASE_URL}/rest/v1/businesses?select=id,name&is_claimed=eq.false&order=name.asc`;
  if (search) q += `&name=ilike.*${encodeURIComponent(search)}*`;

  const r = await fetch(q, { headers });
  const rows = r.ok ? await r.json() : [];
  return json(rows);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
