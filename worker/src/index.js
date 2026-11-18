/* REI Deal Lab — comps proxy (Cloudflare Worker)
 *
 * Keeps your RentCast API key off the public website. The site calls this Worker;
 * the Worker adds the key, calls RentCast, caches the answer, and returns it.
 *
 *   GET /health                      → is the Worker configured?
 *   GET /value?address=...&...       → RentCast /avm/value (value estimate + sale comparables)
 *   GET /rent?address=...&...        → RentCast /avm/rent/long-term (rent estimate + rent comparables)
 *
 * Settings (wrangler.toml [vars] or `wrangler secret put`):
 *   RENTCAST_API_KEY  (secret, required)  your RentCast key
 *   ACCESS_CODE       (secret, optional)  if set, callers must send it in the X-Access-Code header,
 *                                         so strangers can't spend your monthly lookups
 *   ALLOWED_ORIGINS   (var)               comma-separated sites allowed to call this from a browser
 *   CACHE_SECONDS     (var)               how long to reuse an answer for the same address (default 7 days)
 *   COMPS_CACHE       (KV binding, optional) cache store; without it, the edge cache is used where available
 */
const ROUTES = { "/value": "/avm/value", "/rent": "/avm/rent/long-term" };
const PARAMS = ["address", "latitude", "longitude", "propertyType", "bedrooms", "bathrooms", "squareFootage",
  "maxRadius", "daysOld", "compCount", "lookupSubjectAttributes"];

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "https://jxn25-ui.github.io,http://localhost:8765")
      .split(",").map(s => s.trim()).filter(Boolean);
    const originOk = !origin || allowed.includes("*") || allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": origin && originOk ? origin : allowed[0] || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "X-Access-Code, Content-Type",
      "Access-Control-Expose-Headers": "X-Cache",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    const json = (obj, status = 200, extra = {}) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return json({ error: "method_not_allowed", message: "Use GET." }, 405);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "rei-deal-lab-comps", rentcastKey: !!env.RENTCAST_API_KEY,
        accessCodeRequired: !!env.ACCESS_CODE, cache: env.COMPS_CACHE ? "kv" : "edge" });
    }
    if (!originOk) return json({ error: "origin_not_allowed", message: `This site (${origin}) isn't in ALLOWED_ORIGINS.` }, 403);
    if (env.ACCESS_CODE && req.headers.get("X-Access-Code") !== env.ACCESS_CODE) {
      return json({ error: "access_code", message: "Wrong or missing access code." }, 401);
    }
    const route = ROUTES[url.pathname];
    if (!route) return json({ error: "not_found", message: "Use /value or /rent." }, 404);
    if (!env.RENTCAST_API_KEY) {
      return json({ error: "not_configured", message: "Run: npx wrangler secret put RENTCAST_API_KEY" }, 500);
    }

    const up = new URL("https://api.rentcast.io/v1" + route);
    for (const k of PARAMS) {
      const v = url.searchParams.get(k);
      if (v != null && v !== "") up.searchParams.set(k, v.slice(0, 200));
    }
    if (!up.searchParams.get("address") && !(up.searchParams.get("latitude") && up.searchParams.get("longitude"))) {
      return json({ error: "missing_address", message: "Send address=Street, City, State Zip." }, 400);
    }

    /* cache by the upstream query, so repeat lookups don't spend your monthly quota */
    const ttl = Math.max(60, parseInt(env.CACHE_SECONDS || "604800", 10) || 604800);
    const key = up.toString().toLowerCase();
    const fresh = url.searchParams.get("fresh") === "1";
    if (!fresh) {
      const hit = env.COMPS_CACHE ? await env.COMPS_CACHE.get(key) : await caches.default.match(new Request(key)).then(r => r && r.text());
      if (hit) return new Response(hit, { status: 200, headers: { ...cors, "Content-Type": "application/json", "X-Cache": "HIT" } });
    }

    let r;
    try {
      r = await fetch(up.toString(), { headers: { "X-Api-Key": env.RENTCAST_API_KEY, "Accept": "application/json" } });
    } catch (e) {
      return json({ error: "upstream_unreachable", message: "Couldn't reach RentCast. Try again in a minute." }, 502);
    }
    const body = await r.text();
    if (r.ok) {
      const put = env.COMPS_CACHE
        ? env.COMPS_CACHE.put(key, body, { expirationTtl: ttl })
        : caches.default.put(new Request(key), new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` } }));
      ctx.waitUntil(put.catch(() => {}));
    }
    return new Response(body, { status: r.status, headers: { ...cors, "Content-Type": "application/json", "X-Cache": "MISS" } });
  }
};
