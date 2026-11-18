#!/usr/bin/env python3
"""Pull sold comps around a property with HomeHarvest and write a CSV for REI Deal Lab.

HomeHarvest (https://github.com/ZacharyHampton/HomeHarvest, MIT) reads Realtor.com, which
reports actual sold prices. Run this on your own computer; Realtor.com tends to block servers.

Setup (once):
    pip install homeharvest

Examples:
    python tools/pull_comps.py "1418 Larkspur Ave, Kansas City, MO 64131"
    python tools/pull_comps.py "1418 Larkspur Ave, Kansas City, MO 64131" --radius 0.75 --months 9
    python tools/pull_comps.py "300 N Main St, Memphis, TN 38103" --include sold --out memphis.csv

Then open REI Deal Lab → Comp Analyzer → Upload CSV, and press "Pick best 5".
"""
import argparse
import csv
import datetime as dt
import math
import re
import statistics
import sys

COLUMNS = ["Address", "City", "State", "Zip", "Status", "Sale Type", "Price", "Sold Date", "Square Feet", "Beds", "Baths",
           "Year Built", "Lot Size", "Garage", "Latitude", "Longitude", "Days on Market", "URL"]


def blank(v):
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    s = str(v).strip()
    return s == "" or s.lower() in ("nan", "none", "nat", "<na>")


def pick(row, *names):
    for n in names:
        if n in row and not blank(row[n]):
            return row[n]
    return ""


def num(v):
    if blank(v):
        return ""
    try:
        x = float(re.sub(r"[^0-9.\-]", "", str(v)))
    except ValueError:
        return ""
    return int(x) if x == int(x) else round(x, 2)


def day(v):
    if blank(v):
        return ""
    s = str(v)
    m = re.match(r"(\d{4}-\d{2}-\d{2})", s)
    return m.group(1) if m else s[:10]


def to_row(r, status):
    street = pick(r, "formatted_address", "full_street_line", "street", "address")
    unit = pick(r, "unit")
    if street and unit and str(unit) not in str(street):
        street = f"{street} {unit}"
    full, half = num(pick(r, "full_baths")), num(pick(r, "half_baths"))
    baths = (full or 0) + 0.5 * (half or 0) if (full != "" or half != "") else num(pick(r, "baths"))
    if status == "Sold":
        price = num(pick(r, "sold_price", "last_sold_price", "list_price"))
    else:
        price = num(pick(r, "list_price", "price"))
    sale_type = "REO" if str(pick(r, "is_foreclosure", "foreclosure")).lower() in ("true", "1") else ""
    return {
        "Address": street, "City": pick(r, "city"), "State": pick(r, "state"), "Zip": pick(r, "zip_code", "postal_code"),
        "Status": status, "Sale Type": sale_type, "Price": price,
        "Sold Date": day(pick(r, "last_sold_date", "sold_date")) if status == "Sold" else "",
        "Square Feet": num(pick(r, "sqft", "square_feet")), "Beds": num(pick(r, "beds", "bedrooms")), "Baths": baths,
        "Year Built": num(pick(r, "year_built")), "Lot Size": num(pick(r, "lot_sqft", "lot_size")),
        "Garage": num(pick(r, "parking_garage", "garage")),
        "Latitude": pick(r, "latitude"), "Longitude": pick(r, "longitude"),
        "Days on Market": num(pick(r, "days_on_mls", "days_on_market")), "URL": pick(r, "property_url", "url"),
    }


def fetch(scrape, address, listing_type, radius, past_days, ptype):
    kw = dict(location=address, listing_type=listing_type, radius=radius)
    if past_days:
        kw["past_days"] = past_days
    if ptype:
        kw["property_type"] = [ptype]
    try:
        df = scrape(**kw)
    except TypeError:
        kw.pop("property_type", None)          # older HomeHarvest versions
        df = scrape(**kw)
    return [] if df is None else df.to_dict("records")


def main():
    ap = argparse.ArgumentParser(description="Pull comps around an address into a REI Deal Lab CSV.")
    ap.add_argument("address", help='Full address, e.g. "1418 Larkspur Ave, Kansas City, MO 64131"')
    ap.add_argument("--radius", type=float, default=1.0, help="Miles around the subject (default 1; use 0.5 urban, 3 rural)")
    ap.add_argument("--months", type=float, default=6, help="Sold within this many months (default 6)")
    ap.add_argument("--include", choices=["sold", "sold+pending", "all"], default="all",
                    help="sold only; plus pending; or plus active listings as a price ceiling (default all)")
    ap.add_argument("--type", default="single_family",
                    help="HomeHarvest property type: single_family, townhomes, condos, multi_family, duplex_triplex, any")
    ap.add_argument("--out", help="Output CSV path (default comps_<street>_<date>.csv)")
    ap.add_argument("--show-columns", action="store_true", help="Print the columns HomeHarvest returned (for debugging)")
    a = ap.parse_args()

    try:
        from homeharvest import scrape_property
    except ImportError:
        sys.exit("HomeHarvest isn't installed. Run:  pip install homeharvest")

    ptype = None if a.type == "any" else a.type
    plan = [("sold", "Sold", int(round(a.months * 30.4)))]
    if a.include in ("sold+pending", "all"):
        plan.append(("pending", "Pending", None))
    if a.include == "all":
        plan.append(("for_sale", "Active", None))

    rows, cols = [], set()
    for lt, status, days in plan:
        print(f"Pulling {status.lower()} within {a.radius} mi" + (f", last {days} days" if days else "") + " ...", flush=True)
        try:
            recs = fetch(scrape_property, a.address, lt, a.radius, days, ptype)
        except Exception as e:  # network blocks, bad address, library changes
            msg = str(e)
            hint = " Realtor.com is blocking requests; wait a few minutes, try again from home Wi-Fi, or use the CSV from Redfin." if "403" in msg else ""
            print(f"  ! {status} pull failed: {msg[:200]}{hint}", file=sys.stderr)
            continue
        for r in recs:
            cols.update(r.keys())
            row = to_row(r, status)
            if row["Price"]:
                rows.append(row)
        print(f"  {sum(1 for r in rows if r['Status'] == status)} {status.lower()} found")

    if a.show_columns:
        print("Columns returned:", ", ".join(sorted(cols)))
    if not rows:
        sys.exit("No comps found. Check the address, widen --radius or --months, or run with --show-columns.")

    seen, uniq = set(), []
    for r in rows:
        k = (str(r["Address"]).lower(), r["Status"], r["Price"])
        if k not in seen:
            seen.add(k)
            uniq.append(r)

    slug = re.sub(r"[^a-z0-9]+", "-", a.address.split(",")[0].lower()).strip("-")[:40] or "comps"
    out = a.out or f"comps_{slug}_{dt.date.today().isoformat()}.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(uniq)

    sold = [r for r in uniq if r["Status"] == "Sold" and r["Price"] and r["Square Feet"]]
    print(f"\nWrote {len(uniq)} rows to {out}")
    if sold:
        psf = statistics.median(r["Price"] / r["Square Feet"] for r in sold)
        print(f"{len(sold)} sold comps | median ${psf:,.0f}/sq ft | median price ${statistics.median(r['Price'] for r in sold):,.0f}")
    print("Next: REI Deal Lab -> Comp Analyzer -> Upload CSV -> Pick best 5. Mark each comp's condition after checking its photos.")


if __name__ == "__main__":
    main()
