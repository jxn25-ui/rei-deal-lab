# REI Deal Lab

Underwrite and train on real estate deals in the browser. One property, run through every exit:
wholesale, wholetail, novation, fix & flip, buy & hold, BRRRR, subject-to, seller finance and rent-to-own.

**Live:** https://jxn25-ui.github.io/rei-deal-lab/

## What's inside

- **Deal Hub**: property, market and the numbers every tab shares, plus a strategy scoreboard
- **Comp Analyzer**: sales comparison approach with an appraiser-style adjustment grid, guideline checks (15% net / 25% gross), bracketing, weighted reconciliation, Redfin CSV import
- **Repair Estimator**: about 40 line items scaled by a regional construction cost index, with permits, GC margin and contingency
- **Strategy tabs**: full cost models, animated cash-flow and capital-curve visuals, and a playbook for each method
- **Learn & train**: 180-term glossary with hover definitions, 25-calculator Tool Belt, Motion Lab and graded drills

Property taxes (owner vs. investor rates for all 50 states + DC and 55 city presets) and insurance estimates
are planning defaults. Verify with the county assessor and a real insurance quote.

## Link a property into the tool

Add query parameters to prefill a fresh deal, and a hash to open a specific tab. A full address on its own
is enough: it's split into street, city, state and ZIP, and the tax and insurance market is set to match.

```
https://jxn25-ui.github.io/rei-deal-lab/?address=1418%20Larkspur%20Ave%2C%20Kansas%20City%2C%20MO%2064131
https://jxn25-ui.github.io/rei-deal-lab/?address=742%20Evergreen%20Ter%2C%20Memphis%2C%20TN%2038104&price=95000&arv=185000&rent=1550&repairs=32000#comps
```

In the app, paste any full address into the **Property address** bar on the Deal Hub or Comp Analyzer to do the same.
On the hosted site it also looks up map coordinates (OpenStreetMap) so comp distances are calculated automatically.

| Parameter | Meaning |
|---|---|
| `address` (or `addr`) | Full address, e.g. `1418 Larkspur Ave, Kansas City, MO 64131`, or just the street |
| `name` | Deal name (defaults to the street) |
| `city`, `state`, `zip` | Optional overrides. `state` is the 2-letter code; cities with a preset (e.g. Memphis, Houston) use local tax and insurance rates, others use state averages |
| `price`, `asis`, `arv`, `rent`, `repairs`, `hoa` | Dollar amounts (rent and HOA monthly) |
| `sqft`, `beds`, `baths`, `year`, `lot`, `stories`, `garage` | Property facts |

Tabs: `#hub` `#comps` `#repairs` `#wholesale` `#wholetail` `#novation` `#flip` `#rental` `#brrrr` `#sub2` `#sellerfin` `#leaseoption` `#glossary` `#toolbelt` `#motion` `#drills` `#library`

The parameters are removed from the address bar after loading, so a refresh keeps the visitor's edits.
Saved deals and drill progress live in the visitor's browser (localStorage).

## Pull comps automatically

The Comp Analyzer can pull comps and rent estimates from [RentCast](https://www.rentcast.io/api) with one click.
Your API key lives in a free Cloudflare Worker (in `worker/`), never in this public site.

1. Get a RentCast API key (the developer plan includes 50 lookups a month for free).
2. Deploy the Worker: `cd worker`, `npx wrangler login`, `npx wrangler secret put RENTCAST_API_KEY`, `npx wrangler deploy`.
3. In the app: **Comp Analyzer → Connection settings**, paste the Worker address, **Test connection**.
4. Paste the property address in the address bar, then **Pull sale comps** and **Pull rent comps**.

Full steps, the recommended access code, and caching are in [worker/README.md](worker/README.md).
RentCast comps carry the last list price, so each one is flagged until you confirm its sold price.

## Free sold comps with HomeHarvest

[HomeHarvest](https://github.com/ZacharyHampton/HomeHarvest) (MIT) reads actual sold prices from Realtor.com.
Run it on your own computer:

```
pip install homeharvest
python tools/pull_comps.py "1418 Larkspur Ave, Kansas City, MO 64131"
```

It writes `comps_<street>_<date>.csv` with sold homes within 1 mile from the last 6 months, plus pending and active
listings as a price ceiling. Upload that file in the Comp Analyzer and press **Pick best 5**. Options: `--radius 0.5`,
`--months 9`, `--include sold`, `--type condos`, `--out file.csv`. Realtor.com sometimes blocks automated requests
(HTTP 403); wait a few minutes and retry from home Wi-Fi. Scraping may conflict with Realtor.com's terms, so keep it
to personal research.

## Development

Plain HTML, CSS and JavaScript with no build step and no dependencies. Serve the folder with any static server:

```
python -m http.server 8765
```

`python scripts/build_artifact.py` writes `.artifact/index.html`, the version used for the claude.ai Artifact
(Artifacts supply their own document wrapper).
