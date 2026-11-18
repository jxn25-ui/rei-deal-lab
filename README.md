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

Add query parameters to prefill a fresh deal, and a hash to open a specific tab:

```
https://jxn25-ui.github.io/rei-deal-lab/?addr=742%20Evergreen%20Ter&city=Memphis&state=TN&zip=38104&price=95000&arv=185000&rent=1550&repairs=32000&sqft=1300&beds=3&baths=1.5#comps
```

| Parameter | Meaning |
|---|---|
| `addr`, `name` | Address and deal name |
| `city`, `state`, `zip` | Market. `state` is the 2-letter code; `city` must match a preset (e.g. Memphis, Houston) or is ignored |
| `price`, `asis`, `arv`, `rent`, `repairs`, `hoa` | Dollar amounts (rent and HOA monthly) |
| `sqft`, `beds`, `baths`, `year`, `lot`, `stories`, `garage` | Property facts |

Tabs: `#hub` `#comps` `#repairs` `#wholesale` `#wholetail` `#novation` `#flip` `#rental` `#brrrr` `#sub2` `#sellerfin` `#leaseoption` `#glossary` `#toolbelt` `#motion` `#drills` `#library`

The parameters are removed from the address bar after loading, so a refresh keeps the visitor's edits.
Saved deals and drill progress live in the visitor's browser (localStorage).

## Development

Plain HTML, CSS and JavaScript with no build step and no dependencies. Serve the folder with any static server:

```
python -m http.server 8765
```

`python scripts/build_artifact.py` writes `.artifact/index.html`, the version used for the claude.ai Artifact
(Artifacts supply their own document wrapper).
