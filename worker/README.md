# Comps Worker (RentCast proxy)

A tiny Cloudflare Worker that lets the hosted REI Deal Lab pull comps and rent estimates from
[RentCast](https://www.rentcast.io/api) without putting your API key on the public website.

```
browser (REI Deal Lab)  →  this Worker (adds your key, caches)  →  api.rentcast.io
```

- `GET /value?address=…` returns RentCast's value estimate plus up to 25 comparable sale listings
- `GET /rent?address=…` returns a long-term rent estimate plus rental comps
- `GET /health` shows whether the key and access code are set

Both Cloudflare Workers (100,000 requests/day) and RentCast's developer plan (50 lookups/month) are free.
Answers are cached for 7 days per address, so re-opening the same deal doesn't use another lookup.

## Deploy (about 5 minutes, once)

You need Node.js (already installed if you can run `npx`), a free [Cloudflare account](https://dash.cloudflare.com/sign-up)
and a RentCast API key ([getting started guide](https://developers.rentcast.io/reference/getting-started-guide)).

```
cd worker
npx wrangler login
npx wrangler secret put RENTCAST_API_KEY
npx wrangler deploy
```

`wrangler login` opens Cloudflare in your browser. `secret put` asks you to paste the RentCast key; it is stored
encrypted in Cloudflare, never in this repo. `deploy` prints your Worker's address, something like
`https://rei-deal-lab-comps.<your-subdomain>.workers.dev`.

Then in REI Deal Lab, open **Comp Analyzer → Find & import comps → Connection settings**, paste that address,
and click **Test connection**. To make it the default for everyone who uses your site, put the address in
`js/config.js` (`compsApi: "https://…"`) and push.

## Recommended: an access code

The Worker's address is public once it's in your site, so anyone could use up your 50 monthly lookups.
Set a code that the app must send:

```
npx wrangler secret put ACCESS_CODE
```

Enter the same code in **Connection settings** in each browser you use. Leave `js/config.js` holding only the
address, never the code.

## Optional: a reliable cache

The built-in edge cache only works on custom domains. On a `*.workers.dev` address, add a free KV store so
repeat lookups are always cached:

```
npx wrangler kv namespace create COMPS_CACHE
```

Paste the `id` it prints into `wrangler.toml` (uncomment the `[[kv_namespaces]]` block) and run `npx wrangler deploy` again.

## Settings

| Name | Kind | Purpose |
|---|---|---|
| `RENTCAST_API_KEY` | secret | Your RentCast key (required) |
| `ACCESS_CODE` | secret | If set, requests must send it in `X-Access-Code` |
| `ALLOWED_ORIGINS` | var in `wrangler.toml` | Sites allowed to call the Worker from a browser. Add your own domain if you host the app elsewhere |
| `CACHE_SECONDS` | var in `wrangler.toml` | How long to reuse an answer (default 604800 = 7 days) |
| `COMPS_CACHE` | KV binding | Optional cache store (see above) |

## About RentCast comps

RentCast's comparables are **sale listings**: the price is the last list price, and "Inactive" means the listing
came off the market (usually sold). The Comp Analyzer imports them as sales but flags each one until you confirm the
actual sold price from county records, Redfin, or an agent. For true sold prices for free, use the HomeHarvest
script in `tools/pull_comps.py`.
