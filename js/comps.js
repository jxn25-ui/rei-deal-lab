/* REI Deal Lab — Comp Analyzer: sales comparison approach with an appraiser-style adjustment grid.
   Selection → adjustment (toward the subject) → guideline checks → weighted reconciliation. */
(function (G) {
  const { U, F, V, App } = G, $ = U.$, P = U.pct;
  const C = G.Comps = {};
  const MO = 30.4375 * 864e5;
  const num = v => (v === "" || v == null || !isFinite(+v)) ? null : +v;

  /* ---------- helpers ---------- */
  C.iso = s => {
    if (!s) return "";
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
    if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`; }
    m = /^([A-Za-z]+)[-\s]+(\d{1,2})[-,\s]+(\d{4})$/.exec(s);              // Redfin: "September-15-2026"
    const t = Date.parse(m ? `${m[1]} ${m[2]}, ${m[3]}` : s);
    return isFinite(t) ? new Date(t).toISOString().slice(0, 10) : "";
  };
  C.months = d => { const t = Date.parse(d); return isFinite(t) ? Math.max(0, (Date.now() - t) / MO) : null; };
  C.split = b => { b = +b || 0; const f = Math.floor(b + 1e-9); return [f, (b - f) >= 0.25 ? 1 : 0]; };
  C.hav = (a1, o1, a2, o2) => { const r = Math.PI / 180, dA = (a2 - a1) * r, dO = (o2 - o1) * r, x = Math.sin(dA / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(x)); };
  const med = a => { const s = a.filter(x => isFinite(x)).sort((x, y) => x - y); if (!s.length) return 0; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const r500 = v => Math.round(v / 500) * 500;
  C.newComp = o => Object.assign({ id: "c" + Math.random().toString(36).slice(2, 9), addr: "", status: "Sold", price: 0, date: "", conc: 0, sale: "Arms", dist: null, sqft: 0, beds: 3, baths: 2,
    year: 0, lot: 0, garage: 0, bsmt: 0, pool: false, cond: 4, qual: 4, loc: "N", dom: null, lat: null, lng: null, grid: false, primary: false, condChecked: false }, o || {});

  /* ---------- auto adjustment rates (market-derived from the sold pool) ---------- */
  C.autoRates = D => {
    const S = D.compSet, sold = D.comps.filter(c => c.status === "Sold" && c.price > 0);
    const mp = med(sold.map(c => c.price)) || +D.arv || 200000, mpsf = med(sold.filter(c => c.sqft > 0).map(c => c.price / c.sqft)) || mp / Math.max(1, +D.sqft);
    Object.assign(S, {
      glaRate: Math.round(mpsf * S.glaPct / 100), bedAdj: r500(mp * 0.015), bathAdj: r500(mp * 0.025), halfAdj: r500(mp * 0.0125),
      garageAdj: r500(mp * 0.02), bsmtRate: Math.round(mpsf * S.glaPct / 100 * 0.5), lotRate: +(Math.min(4, Math.max(0.5, mp / 150000))).toFixed(2),
      ageRate: Math.round(mp * 0.003 / 50) * 50, pool: r500(mp * 0.035)
    });
  };

  /* ---------- core analysis ---------- */
  C.analyze = D => {
    const S = D.compSet, arv = S.mode === "arv";
    const sub = { sqft: +D.sqft || 0, beds: +D.beds || 0, baths: +D.baths || 0, year: +D.year || 0, lot: +D.lot || 0, garage: +D.garage || 0, bsmt: +D.bsmt || 0,
      pool: D.pool === true || D.pool === "true", cond: +(arv ? D.condAfter : D.cond) || 3, qual: +D.qual || 4, loc: D.loc || "N" };
    const [sF, sH] = C.split(sub.baths);
    const L = { B: 1, N: 0, A: -1 };
    const hasGeo = num(D.lat) && num(D.lng);
    const rows = D.comps.map((c, i) => {
      const price = +c.price || 0, base = Math.max(0, price - (+c.conc || 0));
      const months = c.status === "Sold" ? C.months(c.date) : 0;
      const dist = hasGeo && num(c.lat) && num(c.lng) ? C.hav(+D.lat, +D.lng, +c.lat, +c.lng) : num(c.dist);
      const [cF, cH] = C.split(c.baths);
      const A = {
        conc: -(+c.conc || 0),
        time: c.status === "Sold" && months != null ? base * S.trendMo / 100 * months : 0,
        sale: c.sale !== "Arms" ? base * (+S.distressPct || 0) / 100 : 0,
        gla: c.sqft ? (sub.sqft - c.sqft) * S.glaRate : 0,
        bed: (sub.beds - (+c.beds || 0)) * S.bedAdj,
        bath: (sF - cF) * S.bathAdj + (sH - cH) * S.halfAdj,
        year: c.year && sub.year ? (sub.year - c.year) * S.ageRate : 0,
        lot: c.lot && sub.lot ? (sub.lot - c.lot) * S.lotRate : 0,
        garage: (sub.garage - (+c.garage || 0)) * S.garageAdj,
        bsmt: (sub.bsmt - (+c.bsmt || 0)) * S.bsmtRate,
        pool: ((sub.pool ? 1 : 0) - ((c.pool === true || c.pool === "true") ? 1 : 0)) * S.pool,
        cond: ((+c.cond || 4) - sub.cond) * S.condPct / 100 * base,
        qual: ((+c.qual || 4) - sub.qual) * S.qualPct / 100 * base,
        loc: (L[sub.loc] - L[c.loc || "N"]) * S.locPct / 100 * base
      };
      const keys = Object.keys(A).filter(k => k !== "conc");
      const net = keys.reduce((s, k) => s + A[k], 0), gross = keys.reduce((s, k) => s + Math.abs(A[k]), 0);
      const adjusted = base + net, netPct = base ? net / base * 100 : 0, grossPct = base ? gross / base * 100 : 0;
      /* similarity score + flags (best-practice selection criteria) */
      let sim = 100; const flags = [];
      const glaD = sub.sqft && c.sqft ? (c.sqft - sub.sqft) / sub.sqft * 100 : 0;
      if (c.status === "Active") { sim -= 22; flags.push(["info", "Active listing: an asking price, not a sale. Use it as a ceiling, not for value."]); }
      if (c.status === "Pending") { sim -= 10; flags.push(["info", "Pending: final price unknown until it closes."]); }
      if (c.status === "Sold" && months == null) { sim -= 10; flags.push(["warn", "No sale date."]); }
      if (months != null && months > S.maxMonths) { sim -= Math.min(30, (months - S.maxMonths) * 4); flags.push([months > 12 ? "bad" : "warn", `Sold ${months.toFixed(1)} months ago (target ≤ ${S.maxMonths}).`]); }
      if (dist == null) { sim -= 5; flags.push(["info", "Distance unknown."]); }
      else if (dist > S.maxDist) { sim -= Math.min(30, (dist / S.maxDist - 1) * 25); flags.push([dist > S.maxDist * 2 ? "bad" : "warn", `${dist.toFixed(2)} mi away (target ≤ ${S.maxDist} mi).`]); }
      if (Math.abs(glaD) > S.glaTol) { sim -= Math.min(25, (Math.abs(glaD) - S.glaTol) * 1.2); flags.push(["warn", `GLA ${Math.abs(glaD).toFixed(0)}% ${glaD > 0 ? "larger" : "smaller"} (target ±${S.glaTol}%).`]); }
      sim -= Math.abs(glaD) * 0.25;
      const yrD = c.year && sub.year ? Math.abs(c.year - sub.year) : 0;
      if (yrD > S.ageTol) { sim -= Math.min(15, yrD - S.ageTol); flags.push(["warn", `Built ${yrD} years apart (target ±${S.ageTol}).`]); }
      const bd = Math.abs(sub.beds - (+c.beds || 0)); if (bd > 1) { sim -= 8 * (bd - 1); flags.push(["warn", `${bd} bedroom difference.`]); }
      const ba = Math.abs(sub.baths - (+c.baths || 0)); if (ba > 1) { sim -= 6; flags.push(["warn", `${ba} bath difference.`]); }
      const cd = Math.abs((+c.cond || 4) - sub.cond); sim -= cd * 5;
      if (cd >= 2) flags.push(["warn", `Condition C${c.cond} vs subject C${sub.cond}: ${arv ? "for ARV, use renovated comps" : "for as-is, use comps in similar condition"}.`]);
      if (c.sale !== "Arms") { sim -= 15; flags.push(["bad", `${({ REO: "REO / bank-owned", Short: "Short sale", Auction: "Auction", Other: "Non-arm's-length" })[c.sale] || c.sale} sale. Exclude unless distressed sales dominate the area.`]); }
      if (L[c.loc || "N"] !== L[sub.loc]) flags.push(["info", "Different location influence (busy road, park, commercial)."]);
      if (grossPct > 25) { sim -= 10; flags.push(["bad", `Gross adjustment ${grossPct.toFixed(0)}% (guideline ≤ 25%).`]); }
      if (Math.abs(netPct) > 15) { sim -= 8; flags.push(["bad", `Net adjustment ${netPct.toFixed(0)}% (guideline ≤ 15%).`]); }
      if (!c.condChecked) flags.push(["info", "Condition not verified. Check listing photos or drive by."]);
      if (c.listPrice && c.status === "Sold") { sim -= 5; flags.push(["warn", `${c.src || "Imported"} gives the last list price, not a confirmed sale. Check the sold price (county records, Redfin, or an agent) and edit it.`]); }
      if (!price) { sim = 0; flags.push(["bad", "No price."]); }
      sim = Math.max(0, Math.min(100, Math.round(sim)));
      return { c, i, base, months, dist, A, net, gross, adjusted, netPct, grossPct, sim, flags, glaD, psf: c.sqft ? base / c.sqft : 0, tAdj: base + A.time };
    });
    /* reconciliation: closed sales in the grid, weighted by similarity² (primary comps ×2) */
    const used = rows.filter(r => r.c.grid && r.c.status === "Sold" && r.base > 0);
    used.forEach(r => r.w = Math.pow(Math.max(5, r.sim) / 100, 2) * (r.c.primary ? 2 : 1));
    const W = used.reduce((s, r) => s + r.w, 0);
    used.forEach(r => r.wp = W ? r.w / W * 100 : 0);
    const raw = W ? used.reduce((s, r) => s + r.w * r.adjusted, 0) / W : 0;
    const value = Math.round(raw / 1000) * 1000;
    const adjVals = used.map(r => r.adjusted);
    const mean = adjVals.length ? adjVals.reduce((a, b) => a + b, 0) / adjVals.length : 0;
    const sd = adjVals.length > 1 ? Math.sqrt(adjVals.reduce((s, v) => s + (v - mean) ** 2, 0) / (adjVals.length - 1)) : 0;
    const cv = mean ? sd / mean * 100 : 0;
    const avgGross = used.length ? used.reduce((s, r) => s + r.grossPct, 0) / used.length : 0;
    const avgSim = used.length ? used.reduce((s, r) => s + r.sim, 0) / used.length : 0;
    /* confidence */
    let score = 0; const why = [];
    if (used.length >= 3) score += 2; else why.push(`Only ${used.length} closed sale${used.length === 1 ? "" : "s"} in the grid; use at least 3.`);
    if (used.length >= 4) score += 1;
    if (cv && cv < 4) score += 2; else if (cv < 8) { score += 1; if (used.length > 1) why.push(`Adjusted values spread ${cv.toFixed(1)}% (tight is under 4%).`); } else if (used.length > 1) why.push(`Adjusted values disagree by ${cv.toFixed(1)}%: check conditions and outliers.`);
    if (avgGross < 15) score += 2; else if (avgGross < 25) score += 1; else why.push(`Average gross adjustment ${avgGross.toFixed(0)}%: comps aren't similar enough.`);
    if (avgSim >= 75) score += 1;
    const conf = !used.length ? "None" : score >= 7 && cv < 5 ? "High" : score >= 4 ? "Moderate" : "Low";
    /* bracketing */
    const br = (lbl, sv, get) => { const vs = used.map(r => get(r.c)).filter(v => v > 0); if (!vs.length || !sv) return null; const lo = Math.min(...vs), hi = Math.max(...vs); return { lbl, ok: sv >= lo && sv <= hi, lo, hi }; };
    const bracket = [br("GLA", sub.sqft, c => +c.sqft), br("Year built", sub.year, c => +c.year), br("Lot", sub.lot, c => +c.lot), br("Beds", sub.beds, c => +c.beds), br("Baths", sub.baths, c => +c.baths), br("Sale price vs value", value, c => +c.price)].filter(Boolean);
    /* cross-checks: $/sf and regression on similar-condition closed sales */
    const psfVal = used.length ? med(used.map(r => r.tAdj / Math.max(1, r.c.sqft))) * sub.sqft : 0;
    const pool = rows.filter(r => r.c.status === "Sold" && r.c.sqft > 0 && r.base > 0 && r.c.sale === "Arms" && Math.abs((+r.c.cond || 4) - sub.cond) <= 1);
    let reg = null;
    if (pool.length >= 4) {
      const xs = pool.map(r => +r.c.sqft), ys = pool.map(r => r.tAdj), n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
      const sxy = xs.reduce((s, x, k) => s + (x - mx) * (ys[k] - my), 0), sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
      const b = sxx ? sxy / sxx : 0, a = my - b * mx, ssr = ys.reduce((s, y, k) => s + (y - (a + b * xs[k])) ** 2, 0), sst = ys.reduce((s, y) => s + (y - my) ** 2, 0);
      reg = { a, b, n, r2: sst ? 1 - ssr / sst : 0, pred: a + b * sub.sqft };
    }
    const actives = rows.filter(r => r.c.status === "Active" && Math.abs((+r.c.cond || 4) - sub.cond) <= 1 && r.base > 0);
    const ceiling = actives.length ? Math.min(...actives.map(r => r.adjusted)) : null;
    return { S, sub, rows, used, value, raw, lo: adjVals.length ? Math.min(...adjVals) : 0, hi: adjVals.length ? Math.max(...adjVals) : 0, cv, sd, avgGross, avgSim, conf, why, bracket, psfVal, reg, pool, actives, ceiling, hasGeo };
  };
  C.pickBest = (D, n = 5) => {
    const a = C.analyze(D);
    const ranked = a.rows.filter(r => r.c.status === "Sold" && r.base > 0 && r.c.sale === "Arms").sort((x, y) => y.sim - x.sim);
    D.comps.forEach(c => c.grid = false);
    ranked.slice(0, n).forEach(r => r.c.grid = true);
    a.rows.filter(r => r.c.status !== "Sold").sort((x, y) => y.sim - x.sim).slice(0, 2).forEach(r => r.c.grid = true);
    return ranked.slice(0, n).length;
  };

  /* ---------- CSV import (Redfin "Download All", PropStream, MLS exports, any sheet) ---------- */
  C.parseCSV = txt => {
    const rows = []; let row = [], f = "", q = false;
    txt = txt.replace(/^﻿/, "");
    const delim = (txt.split("\n")[0].match(/\t/g) || []).length > (txt.split("\n")[0].match(/,/g) || []).length ? "\t" : ",";
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true; else if (ch === delim) { row.push(f); f = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += ch;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  };
  const SYN = {
    addr: ["address", "streetaddress", "propertyaddress", "fulladdress", "street", "siteaddress"], city: ["city"], zip: ["zip", "zipcode", "ziporpostalcode", "postalcode"],
    status: ["status", "listingstatus", "salestatus", "mlsstatus"], saletype: ["saletype", "transactiontype"],
    price: ["soldprice", "saleprice", "closeprice", "closedprice", "lastsaleprice", "price", "listprice", "salesprice", "lastsoldprice"],
    date: ["solddate", "saledate", "closedate", "closingdate", "lastsaledate", "datesold", "closeddate", "recordingdate", "lastsolddate"],
    sqft: ["squarefeet", "sqft", "livingarea", "gla", "buildingsqft", "livingsqft", "abovegradesqft", "livingareasqft", "squarefootage", "buildingsize", "sqftliving"],
    beds: ["beds", "bedrooms", "bd", "br", "bedroomstotal", "totalbedrooms"], baths: ["baths", "bathrooms", "ba", "totalbaths", "bathroomstotal", "bathstotal"],
    fullb: ["fullbaths", "bathsfull", "fullbathrooms"], halfb: ["halfbaths", "bathshalf", "halfbathrooms"],
    year: ["yearbuilt", "yrbuilt", "built", "effectiveyearbuilt"], lot: ["lotsize", "lotsqft", "lotsizesqft", "lotarea", "lotsquarefeet", "lotsizesquarefeet"], lotac: ["lotacres", "acres", "lotsizeacres"],
    lat: ["latitude", "lat"], lng: ["longitude", "lng", "lon", "long"], dom: ["daysonmarket", "dom", "cdom", "cumulativedaysonmarket"],
    garage: ["garage", "garagespaces", "garagestalls", "parkingspaces"], pool: ["pool", "poolyn", "privatepool"], dist: ["distance", "distancemi", "proximity", "miles"],
    conc: ["concessions", "sellerconcessions", "concession"]
  };
  C.importRows = (D, rows) => {
    if (rows.length < 2) return { added: 0, msg: "Couldn't find a header row and at least one data row." };
    const H = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const col = {}; for (const [k, syn] of Object.entries(SYN)) { const idx = syn.map(s => H.indexOf(s)).find(i => i >= 0); if (idx != null) col[k] = idx; }
    if (col.price == null || (col.sqft == null && col.addr == null)) return { added: 0, msg: "Couldn't find price and square-footage or address columns. Check that the first row holds column names." };
    const n = v => { const x = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isFinite(x) ? x : 0; };
    let added = 0;
    rows.slice(1).forEach(r => {
      const g = k => col[k] != null ? (r[col[k]] ?? "").trim() : "";
      const price = n(g("price")); if (!price) return;
      const stTxt = (g("status") + " " + g("saletype")).toLowerCase();
      const status = /pend|contingent|under contract|ucb/.test(stTxt) ? "Pending" : /active|for sale|coming soon|new listing/.test(stTxt) ? "Active" : /sold|closed|past sale/.test(stTxt) || g("date") ? "Sold" : "Active";
      const sale = /reo|bank|foreclos/.test(stTxt) ? "REO" : /short/.test(stTxt) ? "Short" : /auction/.test(stTxt) ? "Auction" : "Arms";
      let baths = n(g("baths")); if (!baths && col.fullb != null) baths = n(g("fullb")) + 0.5 * n(g("halfb"));
      let lot = n(g("lot")); if (!lot && col.lotac != null) lot = n(g("lotac")) * 43560; if (lot && lot < 50) lot *= 43560;
      const addr = [g("addr"), g("city")].filter(Boolean).join(", ");
      if (D.comps.some(c => c.addr && c.addr.toLowerCase() === addr.toLowerCase() && c.price === price)) return;
      if (D.comps.length >= 250) return;
      D.comps.push(C.newComp({ addr, status, sale, price, date: C.iso(g("date")), sqft: n(g("sqft")), beds: n(g("beds")), baths, year: n(g("year")), lot: Math.round(lot),
        lat: num(n(g("lat"))) || null, lng: num(n(g("lng"))) || null, dom: col.dom != null ? n(g("dom")) : null, garage: n(g("garage")), pool: /^(y|yes|true|1|pool)/i.test(g("pool")),
        dist: col.dist != null ? n(g("dist")) : null, conc: n(g("conc")) }));
      added++;
    });
    return { added, msg: added ? `Imported ${added} propert${added === 1 ? "y" : "ies"}.` : "No new rows with a price were found." };
  };

  /* ---------- automatic pulls through the comps Worker (RentCast) ---------- */
  C.api = () => { const c = App.LS.get("rdl.api", {}) || {}; return { url: String(c.url || (G.REI_CONFIG || {}).compsApi || "").trim().replace(/\/+$/, ""), code: c.code || "" }; };
  C.call = async (path, params) => {
    const { url, code } = C.api();
    if (!url) throw { msg: "Add your comps Worker address in Connection settings first." };
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null && !(typeof v === "number" && !isFinite(v))));
    let r;
    try { r = await fetch(`${url}/${path}?${q}`, { headers: code ? { "X-Access-Code": code } : {} }); }
    catch (e) { throw { msg: location.hostname.includes("claude") ? "This copy can't reach outside services. Use the hosted site to pull comps." : "Couldn't reach your comps Worker. Check the address in Connection settings." }; }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok) {
      const m = j && (j.message || j.error) || `HTTP ${r.status}`;
      throw { msg: r.status === 401 ? (j && j.error === "access_code" ? "Wrong access code. Fix it in Connection settings." : "RentCast rejected the API key. Re-run: npx wrangler secret put RENTCAST_API_KEY") :
        r.status === 404 ? "RentCast couldn't find that address. Check street, city, state and ZIP." : r.status === 429 ? "RentCast rate limit or monthly quota reached." : m };
    }
    return { j, cached: r.headers.get("X-Cache") === "HIT" };
  };
  C.subjectParams = D => ({ address: G.Addr ? G.Addr.full(D) : D.addr, propertyType: D.compSet.ptype || "Single Family" });
  C.mapRC = x => {
    const sold = /inactive/i.test(x.status || "");
    return C.newComp({
      addr: x.formattedAddress || [x.addressLine1, x.city, x.state].filter(Boolean).join(", "), status: sold ? "Sold" : "Active",
      price: +x.price || 0, date: sold ? C.iso(x.removedDate || x.lastSeenDate) : "", sqft: +x.squareFootage || 0, beds: +x.bedrooms || 0, baths: +x.bathrooms || 0,
      year: +x.yearBuilt || 0, lot: +x.lotSize || 0, lat: num(x.latitude), lng: num(x.longitude), dist: x.distance != null ? +(+x.distance).toFixed(2) : null,
      dom: x.daysOnMarket != null ? +x.daysOnMarket : null, src: "RentCast", listPrice: sold
    });
  };
  C.pullValue = async D => {
    const S = D.compSet;
    const { j, cached } = await C.call("value", { ...C.subjectParams(D), compCount: 25, maxRadius: Math.max(0.5, +S.maxDist || 1) * 1.5, daysOld: Math.min(730, Math.round((+S.maxMonths || 6) * 30.4 * 1.5)) });
    const seen = new Set(D.comps.map(c => (c.addr || "").toLowerCase()));
    let added = 0;
    (j.comparables || []).forEach(x => { const c = C.mapRC(x); if (!c.price || seen.has(c.addr.toLowerCase()) || D.comps.length >= 250) return; seen.add(c.addr.toLowerCase()); D.comps.push(c); added++; });
    if (added && D.comps.some(c => c.sample)) D.comps = D.comps.filter(c => !c.sample);
    S.rcValue = j.price ? { price: +j.price, lo: +j.priceRangeLow || 0, hi: +j.priceRangeHigh || 0, at: Date.now() } : null;
    S.rcSubject = j.subjectProperty || null;
    if (j.subjectProperty && !(+D.lat && +D.lng) && j.subjectProperty.latitude) { D.lat = +j.subjectProperty.latitude; D.lng = +j.subjectProperty.longitude; }
    return { added, total: (j.comparables || []).length, cached };
  };
  C.pullRent = async D => {
    const { j, cached } = await C.call("rent", { ...C.subjectParams(D), compCount: 15, maxRadius: Math.max(0.5, +D.compSet.maxDist || 1) * 2, daysOld: 270 });
    D.compSet.rcRent = { rent: +j.rent || 0, lo: +j.rentRangeLow || 0, hi: +j.rentRangeHigh || 0, at: Date.now(),
      comps: (j.comparables || []).slice(0, 6).map(x => ({ a: x.formattedAddress || x.addressLine1, p: +x.price || 0, b: x.bedrooms, ba: x.bathrooms, sf: x.squareFootage, d: x.distance })) };
    if (!D.compSet.rcSubject && j.subjectProperty) D.compSet.rcSubject = j.subjectProperty;
    return { cached };
  };

  /* ---------- sample comps for the sample deal (clearly marked) ---------- */
  const sample = () => [
    { addr: "1502 Larkspur Ave", price: 236500, date: "2026-09-22", conc: 3000, dist: 0.1, sqft: 1480, beds: 3, baths: 2, year: 1956, lot: 7000, garage: 1, cond: 2, dom: 9, grid: true },
    { addr: "9214 Wornall Ter", price: 229000, date: "2026-08-05", dist: 0.4, sqft: 1390, beds: 3, baths: 1.5, year: 1960, lot: 7500, garage: 1, cond: 3, dom: 21, grid: true },
    { addr: "1207 E 88th St", price: 244900, date: "2026-10-14", dist: 0.6, sqft: 1610, beds: 3, baths: 2, year: 1962, lot: 8100, garage: 2, cond: 2, dom: 6, grid: true },
    { addr: "1630 Holmes Ct", price: 218000, date: "2026-06-11", dist: 0.3, sqft: 1350, beds: 3, baths: 2, year: 1955, lot: 6800, garage: 0, cond: 3, loc: "A", dom: 33, grid: true },
    { addr: "8820 Linden Dr", price: 252000, date: "2026-03-02", dist: 1.3, sqft: 1820, beds: 4, baths: 2.5, year: 1968, lot: 9000, garage: 2, bsmt: 400, cond: 2, dom: 14 },
    { addr: "1455 Larkspur Ave", price: 141000, date: "2026-07-28", dist: 0.05, sqft: 1440, beds: 3, baths: 2, year: 1958, lot: 7100, garage: 1, cond: 5, sale: "REO", dom: 47 },
    { addr: "1320 E 90th Ter", status: "Pending", price: 239000, dist: 0.35, sqft: 1470, beds: 3, baths: 2, year: 1961, lot: 7300, garage: 1, cond: 3, dom: 12, grid: true },
    { addr: "9031 Charlotte St", status: "Active", price: 249900, dist: 0.5, sqft: 1500, beds: 3, baths: 2, year: 1959, lot: 7400, garage: 1, cond: 2, dom: 34 }
  ].map(o => C.newComp({ ...o, condChecked: true, sample: true }));
  if (!App.fromLink && !App.LS.get("rdl.draft", null) && !App.D.comps.length) App.D.comps = sample();

  /* ---------- UI ---------- */
  const C_OPTS = [[1, "C1 · new, never lived in"], [2, "C2 · fully renovated / like new"], [3, "C3 · updated, well kept"], [4, "C4 · dated but maintained"], [5, "C5 · needs repairs"], [6, "C6 · major damage"]];
  const Q_OPTS = [[1, "Q1 · custom luxury"], [2, "Q2 · high-end"], [3, "Q3 · above-average"], [4, "Q4 · standard builder"], [5, "Q5 · economy"], [6, "Q6 · substandard"]];
  const L_OPTS = [["B", "Beneficial"], ["N", "Neutral"], ["A", "Adverse"]];
  const FEAT = [
    { k: "addr", l: "Address", t: "text", s: "addr" },
    { k: "status", l: "Status", t: "sel", opts: [["Sold", "Sold"], ["Pending", "Pending"], ["Active", "Active"]] },
    { k: "price", l: "Sale / list price", t: "money" },
    { k: "conc", l: "Seller concessions", t: "money", a: "conc" },
    { k: "date", l: "Sale date (YYYY-MM-DD)", t: "text", a: "time" },
    { k: "sale", l: "Sale type", t: "sel", opts: [["Arms", "Arm's length"], ["REO", "REO / bank"], ["Short", "Short sale"], ["Auction", "Auction"], ["Other", "Non-arm's length"]], a: "sale" },
    { k: "dist", l: "Distance (mi)", t: "num" },
    { k: "sqft", l: "GLA (sq ft)", t: "sqft", s: "sqft", a: "gla" },
    { k: "beds", l: "Bedrooms", t: "num", s: "beds", a: "bed" },
    { k: "baths", l: "Baths (2.5 = 2 full + half)", t: "num", s: "baths", a: "bath" },
    { k: "year", l: "Year built", t: "num", s: "year", a: "year" },
    { k: "lot", l: "Lot (sq ft)", t: "num", s: "lot", a: "lot" },
    { k: "garage", l: "Garage stalls", t: "num", s: "garage", a: "garage" },
    { k: "bsmt", l: "Finished basement (sq ft)", t: "num", s: "bsmt", a: "bsmt" },
    { k: "pool", l: "Pool", t: "sel", opts: [[false, "No"], [true, "Yes"]], s: "pool", a: "pool" },
    { k: "cond", l: "Condition", t: "sel", opts: C_OPTS, s: "COND", a: "cond" },
    { k: "qual", l: "Quality of construction", t: "sel", opts: Q_OPTS, s: "qual", a: "qual" },
    { k: "loc", l: "Location influence", t: "sel", opts: L_OPTS, s: "loc", a: "loc" },
    { k: "dom", l: "Days on market", t: "num" }
  ];
  const cell = (path, f, val) => {
    if (f.t === "sel") return `<select class="gc" data-path="${path}" data-t="sel" aria-label="${U.esc(f.l)}">${f.opts.map(o => `<option value="${o[0]}"${String(o[0]) === String(val) ? " selected" : ""}>${U.esc(o[1])}</option>`).join("")}</select>`;
    return `<input class="gc${f.t === "text" ? " gc-t" : ""}" data-path="${path}" data-t="${f.t}" inputmode="${f.t === "text" ? "text" : "decimal"}" autocomplete="off" aria-label="${U.esc(f.l)}" value="${U.esc(U.fmtField(f.t, val))}">`;
  };
  const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
  const zipLinks = z => z ? [
    ["Redfin · sold, last 6 mo", `https://www.redfin.com/zipcode/${encodeURIComponent(z)}/filter/include=sold-6mo`],
    ["Zillow · recently sold", `https://www.zillow.com/homes/recently_sold/${encodeURIComponent(z)}_rb/`],
    ["Realtor.com · sold", `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(z)}/show-recently-sold`]
  ] : [];

  App.reg({
    id: "comps", nav: "Comp Analyzer",
    render(root) {
      const D = App.D, S = D.compSet, arv = S.mode === "arv";
      if (S.autoRates) C.autoRates(D);
      const inputs =
        U.fieldset("What are you valuing?", [{ k: "compSet.mode", l: "Value", t: "seg", opts: [["arv", "ARV (after repairs)"], ["asis", "As-is value"]] },
          { k: "compSet.area", l: "Area type (sets search radius)", t: "seg", opts: [["urban", "Urban"], ["suburban", "Suburban"], ["rural", "Rural"]] },
          { k: "compSet.ptype", l: "Property type (for automatic pulls)", t: "sel", opts: [["Single Family", "Single family"], ["Townhouse", "Townhouse"], ["Condo", "Condo"], ["Multi-Family", "Multi-family (2–4)"], ["Manufactured", "Manufactured"]] }], D) +
        U.fieldset("Subject property", [
          { k: "zip", l: "ZIP code", t: "text" }, { k: "sqft", l: "GLA (above-grade sq ft)", t: "sqft", hint: "Gross living area: finished, heated, above-grade space. Basements are counted separately." },
          { k: "beds", l: "Beds", t: "num" }, { k: "baths", l: "Baths", t: "num", hint: "2.5 = two full baths and one half bath." }, { k: "year", l: "Year built", t: "num" }, { k: "lot", l: "Lot (sq ft)", t: "num" },
          { k: "garage", l: "Garage stalls", t: "num" }, { k: "bsmt", l: "Finished bsmt sq ft", t: "num" }, { k: "pool", l: "Has a pool", t: "tog" },
          { k: "cond", l: "Condition today", t: "sel", opts: C_OPTS }, { k: "condAfter", l: "Condition after rehab (ARV)", t: "sel", opts: C_OPTS },
          { k: "qual", l: "Quality", t: "sel", opts: Q_OPTS }, { k: "loc", l: "Location influence", t: "sel", opts: L_OPTS, hint: "Adverse: backs to a busy road, railroad, commercial or power lines. Beneficial: park, water, golf course or a quiet cul-de-sac." },
          { k: "lat", l: "Latitude (optional)", t: "num", hint: "Right-click the house in Google Maps and click the coordinates to copy them. With these, distances to imported comps are computed for you." }, { k: "lng", l: "Longitude (optional)", t: "num" }
        ], D) +
        U.fieldset("Selection criteria", [{ k: "compSet.maxMonths", l: "Sold within (months)", t: "mo", s: 1, min: 3, max: 18, step: 1 }, { k: "compSet.maxDist", l: "Within (miles)", t: "num", s: 1, min: 0.25, max: 5, step: 0.25 },
          { k: "compSet.glaTol", l: "GLA within ±", t: "pct" }, { k: "compSet.ageTol", l: "Year built within ± (yrs)", t: "num" }], D) +
        U.fieldset("Adjustment rates", [
          { k: "compSet.autoRates", l: "Derive rates from these comps", t: "tog", hint: "Sets each rate from the median price and $/sq ft of your closed sales. Turn off and type your own (or a paired-sales result) to override." },
          { k: "compSet.trendMo", l: "Market trend / month", t: "pct", hint: "Time adjustment. Find it from the area's median-price trend, or from the same house selling twice. Negative in a falling market." },
          { k: "compSet.glaPct", l: "GLA rate as % of median $/sf", t: "pct", hint: "Appraisers adjust square footage at roughly 25–50% of the average $/sf, because land and the base house don't scale with size." },
          { k: "compSet.glaRate", l: "GLA $ per sq ft", t: "money" }, { k: "compSet.bedAdj", l: "Per bedroom", t: "money" }, { k: "compSet.bathAdj", l: "Per full bath", t: "money" }, { k: "compSet.halfAdj", l: "Per half bath", t: "money" },
          { k: "compSet.garageAdj", l: "Per garage stall", t: "money" }, { k: "compSet.bsmtRate", l: "Finished bsmt $/sf", t: "money" }, { k: "compSet.lotRate", l: "Lot $/sf", t: "money" },
          { k: "compSet.ageRate", l: "Per year of age", t: "money" }, { k: "compSet.pool", l: "Pool", t: "money" },
          { k: "compSet.condPct", l: "Per condition step", t: "pct" }, { k: "compSet.qualPct", l: "Per quality step", t: "pct" }, { k: "compSet.locPct", l: "Location influence", t: "pct" },
          { k: "compSet.distressPct", l: "Distressed-sale uplift", t: "pct", hint: "Adds this % to REO / short / auction sales to make them retail-equivalent. Leave at 0 and exclude them unless you have market support." }
        ], D);
      const links = zipLinks(D.zip), apiCfg = C.api();
      root.innerHTML = App.layout({
        eyebrow: "Analyze", title: "Comp Analyzer", wide: true, top: G.Addr ? G.Addr.bar(D) : "",
        lede: `Value the property the way an appraiser does: pick truly comparable closed sales, adjust each one toward the subject, check the guidelines, and reconcile a weighted value for ${arv ? "ARV" : "as-is value"}.`,
        inputs,
        results: `${D.comps.some(c => c.sample) ? `<div class="verdict warn"><span class="vd-dot"></span><div><b>Example comps</b><p>These ${D.comps.filter(c => c.sample).length} sales are made-up examples for the sample deal. Import or enter real sold comps for your property, then remove these.</p></div><button type="button" class="btn ghost sm" id="cpClearSample">Remove examples</button></div>` : ""}
          <div data-slot="cp-kpis"></div><div data-slot="cp-verdict"></div>
          <div class="card"><div class="card-h"><h3>Find & import comps</h3><span class="sub">Real sold data comes from the MLS or listing sites; this tool does the analysis</span></div>
            <div class="cp-find">
              <div><h4>Pull automatically · RentCast</h4>${apiCfg.url ? `<div class="row"><button type="button" class="btn sm" id="cpPullV">Pull sale comps</button><button type="button" class="btn ghost sm" id="cpPullR">Pull rent comps</button></div>
                <p class="fine">Uses the subject address above. Each new address uses one RentCast lookup per button; repeats are cached for a week.</p>`
                : `<p class="fine">Connect your RentCast Worker once and comps arrive with one click. <a href="https://github.com/jxn25-ui/rei-deal-lab#pull-comps-automatically" target="_blank" rel="noopener">Setup guide ↗</a></p>`}
                <details class="cp-conn"${apiCfg.url ? "" : " open"}><summary>Connection settings</summary>
                  <label for="cpApiUrl">Worker address</label><input id="cpApiUrl" class="gc gc-t" placeholder="https://rei-deal-lab-comps.you.workers.dev" value="${U.esc(apiCfg.url)}" autocomplete="off" spellcheck="false">
                  <label for="cpApiCode">Access code (if you set one)</label><input id="cpApiCode" class="gc gc-t" type="password" value="${U.esc(apiCfg.code)}" autocomplete="off">
                  <div class="row"><button type="button" class="btn sm" id="cpApiSave">Save</button><button type="button" class="btn ghost sm" id="cpApiTest">Test connection</button></div>
                  <p class="fine">Saved in this browser only. Your RentCast key stays inside the Worker, never on this page.</p></details>
                <div data-slot="cp-rc"></div></div>
              <div><h4>Search listing sites</h4>${links.length ? `<div class="row">${links.map(l => `<a class="btn ghost sm" href="${l[1]}" target="_blank" rel="noopener">${l[0]} ↗</a>`).join("")}</div>` : `<p class="fine">Enter the subject's ZIP code to get search links.</p>`}
                <p class="fine">On Redfin: filter to Sold · last 6 months, draw a tight boundary around the subject, then scroll below the results and click <b>Download All</b> for a CSV. Investor tools (PropStream, Privy, MLS) export CSVs that import the same way.</p></div>
              <div><h4>Import a file</h4><div class="row"><label class="btn sm" for="cpFile">Upload CSV</label><input type="file" id="cpFile" accept=".csv,.tsv,.txt,text/csv" hidden><button type="button" class="btn ghost sm" id="cpAdd">Add a comp by hand</button><button type="button" class="btn ghost sm" id="cpBest">Pick best 5</button></div>
                <label for="cpPaste" class="sr">Paste comps</label><textarea id="cpPaste" rows="3" placeholder="…or paste rows from a spreadsheet with a header row (Address, Sold Price, Sold Date, Sq Ft, Beds, Baths, Year Built…)"></textarea>
                <div class="row"><button type="button" class="btn ghost sm" id="cpPasteGo">Import pasted rows</button>${D.comps.length ? `<button type="button" class="btn ghost sm danger" id="cpClear">Remove all comps</button>` : ""}<span class="fine" id="cpMsg"></span></div>
                <p class="fine">Free true sold prices: run the HomeHarvest script on your computer and upload the CSV it writes. <a href="https://github.com/jxn25-ui/rei-deal-lab#free-sold-comps-with-homeharvest" target="_blank" rel="noopener">How ↗</a></p></div>
            </div></div>
          <div class="two">${App.vizCard("Comp radar", "cpRadar", "Distance rings from the subject · size = weight", 300)}${App.card("Price vs. size", "cp-scatter", `<span class="sub">Closed sales, time-adjusted</span>`)}</div>
          <div class="card"><div class="card-h"><h3>Adjustment grid</h3><span class="sub">Adjust the comp toward the subject: comp better → subtract, comp worse → add. Edit any cell.</span></div><div class="gridwrap" data-grid></div></div>
          ${App.card("Three ways to the number", "cp-methods", `<span class="sub">If these disagree, find out why</span>`)}
          <div class="card"><div class="card-h"><h3>Comp pool</h3><span class="sub" data-slot="cp-poolsub"></span></div><div data-slot="cp-pool"></div></div>`,
        playbook: {
          what: "Comping is the sales comparison approach: the value of a house is what buyers recently paid for similar houses nearby, adjusted for the differences. ARV mistakes are the most expensive mistakes in investing, so pros comp like appraisers: strict selection, adjustments supported by the market, and a weighted reconciliation instead of an average of whatever sold.",
          when: ["Before every offer: ARV sets your MAO, flip profit and BRRRR refi", "As-is value for wholesale, Subject-To equity and novation pricing", "Again before you list or refinance, because the appraiser will do exactly this"],
          steps: ["Define the subject: GLA, beds/baths, year, lot, garage, basement, condition and location influences", "Search closed sales: same subdivision first, then ≤ 0.5 mi urban / 1 mi suburban / 3 mi rural, last 6 months (12 with time adjustment)", "Match condition to the question: renovated (C2–C3) comps for ARV, similar-condition comps for as-is", "Throw out non-arm's-length sales (REO, short sale, family transfers) and anything across a major boundary such as a highway, school district or railroad", "Adjust each comp toward the subject; keep net ≤ 15% and gross ≤ 25%", "Check bracketing: the subject's size, age and features should fall between your comps", "Reconcile: weight the most similar, least-adjusted comps most. Check against $/sf, a regression, and active listings as a ceiling"],
          fx: [["Adjusted price = comp price − concessions ± adjustments", "Adjust the comp, never the subject"], ["GLA adj = (subject sf − comp sf) × GLA rate", "GLA rate ≈ 25–50% of the average $/sf"], ["Time adj = price × monthly trend × months since sale", ""], ["Net % = Σ adjustments ÷ price · Gross % = Σ |adjustments| ÷ price", "Fannie Mae guidelines: ≤ 15% net, ≤ 25% gross"], ["Value = Σ (weight × adjusted price) ÷ Σ weight", "Weight here = similarity² (primary comps ×2)"]],
          flags: ["Never use active listings as value. They're what sellers hope for; use them as a ceiling", "Don't comp a flip against flips that haven't sold yet", "One extra bedroom made from a dining room isn't worth a full bedroom adjustment", "Check every comp's photos: listing condition is often overstated. Mark condition as verified once you look", "A perfect-looking $/sf average can hide a bad comp. Read the grid"]
        }
      });
      this.bind(root);
      G.Addr && G.Addr.bind(root);
      V.radar(root.querySelector("#cpRadar"), () => App._cpRadar);
    },
    bind(root) {
      const D = App.D, msg = t => { const m = root.querySelector("#cpMsg"); if (m) m.textContent = t; App.toast(t); };
      const after = r => { if (r.added) { C.pickBest(D); App.show("comps"); } msg(r.msg); };
      root.querySelector("#cpFile").addEventListener("change", e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => after(C.importRows(D, C.parseCSV(String(rd.result)))); rd.onerror = () => msg("Couldn't read that file. Try saving it as CSV."); rd.readAsText(f); });
      root.querySelector("#cpPasteGo").addEventListener("click", () => { const t = root.querySelector("#cpPaste").value; if (!t.trim()) return msg("Paste rows with a header row first."); after(C.importRows(D, C.parseCSV(t))); });
      root.querySelector("#cpAdd").addEventListener("click", () => { D.comps.push(C.newComp({ grid: true, sqft: +D.sqft, beds: +D.beds, baths: +D.baths, year: +D.year, lot: +D.lot, garage: +D.garage, cond: +D.condAfter, date: new Date().toISOString().slice(0, 10) })); App.show("comps"); App.toast("Added a comp column. Fill in its details in the grid."); });
      root.querySelector("#cpBest").addEventListener("click", () => { const n = C.pickBest(D); App.show("comps"); App.toast(n ? `Put the ${n} most similar closed sales in the grid` : "No arm's-length closed sales to pick from yet"); });
      const clr = root.querySelector("#cpClear"); clr && clr.addEventListener("click", () => App.confirmBar(`Remove all ${D.comps.length} comps from this deal?`, "Remove comps", () => { D.comps = []; App.show("comps"); }));
      /* automatic pulls */
      const busy = (b, on, txt) => { if (!b) return; if (on) { b.dataset.t = b.textContent; b.textContent = txt; b.disabled = true; } else { b.textContent = b.dataset.t || b.textContent; b.disabled = false; } };
      const needAddr = () => { if (!D.addr || !(D.zip || D.state)) { App.toast("Enter the full subject address in the address bar first."); return true; } return false; };
      const pv = root.querySelector("#cpPullV");
      pv && pv.addEventListener("click", async () => { if (needAddr()) return; busy(pv, true, "Pulling…");
        try { const r = await C.pullValue(D); if (r.added) C.pickBest(D); App.persistDraft(); App.show("comps");
          App.toast(r.total ? `Added ${r.added} of ${r.total} RentCast comps${r.cached ? " (cached, no lookup used)" : ""}. Confirm sold prices before relying on them.` : "RentCast returned no comps. Widen the radius or months and try again."); }
        catch (e) { busy(pv, false); App.toast(e.msg || "Couldn't pull comps."); } });
      const pr = root.querySelector("#cpPullR");
      pr && pr.addEventListener("click", async () => { if (needAddr()) return; busy(pr, true, "Pulling…");
        try { const r = await C.pullRent(D); App.persistDraft(); App.show("comps"); App.toast(`Rent estimate ${$(D.compSet.rcRent.rent)}/mo${r.cached ? " (cached)" : ""}`); }
        catch (e) { busy(pr, false); App.toast(e.msg || "Couldn't pull rent comps."); } });
      const saveCfg = () => { const url = root.querySelector("#cpApiUrl").value.trim().replace(/\/+$/, ""), code = root.querySelector("#cpApiCode").value.trim();
        if (url && !/^https:\/\/[^\s/]+/.test(url) && !/^http:\/\/localhost/.test(url)) { App.toast("The Worker address should start with https://"); return false; }
        App.LS.set("rdl.api", { url, code }); return true; };
      const sv = root.querySelector("#cpApiSave"); sv && sv.addEventListener("click", () => { if (saveCfg()) { App.toast("Connection saved in this browser"); App.show("comps"); } });
      const ts = root.querySelector("#cpApiTest");
      ts && ts.addEventListener("click", async () => { if (!saveCfg()) return; const { url } = C.api(); if (!url) return App.toast("Enter the Worker address first.");
        busy(ts, true, "Testing…");
        try { const r = await fetch(url + "/health"); const j = await r.json(); busy(ts, false);
          App.toast(!j.ok ? "That address answered, but it isn't the comps Worker." : !j.rentcastKey ? "Worker is up, but the RentCast key isn't set yet: npx wrangler secret put RENTCAST_API_KEY" : `Connected. RentCast key is set${j.accessCodeRequired ? "; access code required" : ""}.`); }
        catch (e) { busy(ts, false); App.toast("Couldn't reach that address. Check it and that the Worker is deployed."); } });
      root.querySelector(".cp-find").addEventListener("click", e => {
        const b = e.target.closest("[data-rcuse]"); if (!b) return;
        const S = D.compSet;
        if (b.dataset.rcuse === "rent" && S.rcRent) { D.rent = Math.round(S.rcRent.rent / 25) * 25; App.toast(`Market rent set to ${$(D.rent)}/mo on every tab`); }
        if (b.dataset.rcuse === "facts" && S.rcSubject) { const s = S.rcSubject;
          if (s.bedrooms) D.beds = +s.bedrooms; if (s.bathrooms) D.baths = +s.bathrooms; if (s.squareFootage) D.sqft = +s.squareFootage; if (s.yearBuilt) D.year = +s.yearBuilt; if (s.lotSize) D.lot = +s.lotSize;
          App.toast("Subject facts updated from public records"); }
        App.persistDraft(); App.show("comps");
      });
      const cs = root.querySelector("#cpClearSample"); cs && cs.addEventListener("click", () => { D.comps = D.comps.filter(c => !c.sample); App.show("comps"); App.toast("Example comps removed"); });
      root.querySelector(".split").addEventListener("click", e => {
        const b = e.target.closest("[data-cact]"); if (!b) return; const c = D.comps.find(x => x.id === b.dataset.cid); if (!c) return;
        if (b.dataset.cact === "grid") c.grid = !c.grid;
        if (b.dataset.cact === "primary") c.primary = !c.primary;
        if (b.dataset.cact === "del") D.comps = D.comps.filter(x => x !== c);
        App.show("comps");
      });
    },
    onChange(path) {
      const S = App.D.compSet;
      if (/^compSet\.(glaRate|bedAdj|bathAdj|halfAdj|garageAdj|bsmtRate|lotRate|ageRate|pool)$/.test(path)) S.autoRates = false;
      if (/^comps\.\d+\.cond$/.test(path)) { const i = +path.split(".")[1]; App.D.comps[i].condChecked = true; }
      if (path === "compSet.area") { S.maxDist = { urban: 0.5, suburban: 1, rural: 3 }[S.area]; }
      if (path === "compSet.mode" || path === "compSet.autoRates" || /^comps\.\d+\.status$/.test(path) || path === "compSet.area") { if (S.autoRates) C.autoRates(App.D); App.show("comps"); return; }
      if (S.autoRates && (/^comps\.\d+\.(price|sqft)$/.test(path) || path === "compSet.glaPct")) C.autoRates(App.D);
    },
    update() {
      const D = App.D, S = D.compSet, a = C.analyze(D), arv = S.mode === "arv", target = arv ? D.arv : D.asIs;
      const gridComps = a.rows.filter(r => r.c.grid);
      /* KPIs */
      App.slot("cp-kpis", a.used.length ? U.kpis([
        { l: arv ? "Indicated ARV" : "Indicated as-is value", v: $(a.value), big: 1, tone: a.conf === "High" ? "good" : a.conf === "Moderate" ? "warn" : "bad", sub: `${a.used.length} closed sales · weighted by similarity`, m: U.math(a.used.map(r => `${r.wp.toFixed(0)}% × ${$(r.adjusted)}`).join(" + "), $(a.raw)) },
        { l: "Adjusted range", v: `${U.$k(a.lo)} – ${U.$k(a.hi)}`, sub: `spread ${P(a.cv)}` },
        { l: "Confidence", v: a.conf, tone: a.conf === "High" ? "good" : a.conf === "Moderate" ? "warn" : "bad", sub: `avg similarity ${Math.round(a.avgSim)}` },
        { l: "Avg gross adjustment", v: P(a.avgGross), tone: a.avgGross <= 15 ? "good" : a.avgGross <= 25 ? "warn" : "bad", sub: "guideline ≤ 25%" },
        { l: "Value per sq ft", v: $(a.value / Math.max(1, a.sub.sqft)), sub: `${U.num(a.sub.sqft)} sf GLA` },
        { l: `Deal's current ${arv ? "ARV" : "as-is"}`, v: $(target), tone: Math.abs(target - a.value) / Math.max(1, a.value) <= 0.03 ? "good" : "warn", sub: `${target >= a.value ? "+" : "−"}${$(Math.abs(target - a.value))} vs comps` }
      ]) + `<div class="row"><button type="button" class="btn" id="cpUse">Use ${$(a.value)} as ${arv ? "ARV" : "as-is value"} on every tab</button></div>`
        : `<div class="empty card"><h3>No closed sales in the grid yet</h3><p>Import a sold-comps CSV, paste rows, or add comps by hand. Then press <b>Pick best 5</b> to move the most similar closed sales into the adjustment grid.</p></div>`);
      const use = App.root.querySelector("#cpUse");
      if (use) use.onclick = () => { if (arv) D.arv = a.value; else D.asIs = a.value; App.toast(`${arv ? "ARV" : "As-is value"} set to ${$(a.value)}. Every strategy updates.`); App.recalc(); };
      App.slot("cp-verdict", a.used.length ? `${U.verdict(a.conf === "High" ? "good" : a.conf === "Moderate" ? "warn" : "bad", `${a.conf} confidence`, a.why.length ? a.why.join(" ") : "At least three similar closed sales, light adjustments, and adjusted values that agree.")}
        <div class="rules">${a.bracket.map(b => U.pill(`${b.ok ? "✓" : "✕"} Bracketed: ${b.lbl} <b>${b.lbl === "Sale price vs value" ? U.$k(b.lo) + "–" + U.$k(b.hi) : U.num(b.lo, b.lbl === "Baths" ? 1 : 0) + "–" + U.num(b.hi, b.lbl === "Baths" ? 1 : 0)}</b>`, b.ok ? "good" : "bad")).join("")}
        ${a.ceiling ? U.pill(`${a.value <= a.ceiling ? "✓" : "✕"} Below cheapest similar active <b>${U.$k(a.ceiling)}</b>`, a.value <= a.ceiling ? "good" : "bad") : ""}</div>` : "");
      /* grid */
      const wrap = App.root.querySelector("[data-grid]");
      const sig = gridComps.map(r => r.c.id).join(",") + S.mode;
      if (wrap.dataset.sig !== sig) {
        wrap.dataset.sig = sig;
        wrap.innerHTML = gridComps.length ? `<table class="cgrid"><thead><tr><th class="fh">Feature</th><th class="sh">Subject</th>${gridComps.map((r, n) => `<th><div class="ch"><b>Comp ${n + 1}</b><span data-cpsim="${r.c.id}"></span>
          <button type="button" class="ic${r.c.primary ? " on" : ""}" data-cact="primary" data-cid="${r.c.id}" title="Primary comp (double weight)" aria-label="Mark comp ${n + 1} primary">★</button><button type="button" class="ic" data-cact="grid" data-cid="${r.c.id}" title="Move back to pool" aria-label="Remove comp ${n + 1} from grid">✕</button></div></th>`).join("")}</tr></thead>
          <tbody>${FEAT.map(f => `<tr><th class="fh">${U.esc(f.l)}</th><td class="sv">${f.s ? cell(f.s === "COND" ? (arv ? "condAfter" : "cond") : f.s, f, f.s === "COND" ? (arv ? D.condAfter : D.cond) : D[f.s]) : `<span class="na">—</span>`}</td>
            ${gridComps.map(r => `<td>${cell(`comps.${r.i}.${f.k}`, f, r.c[f.k])}${f.a ? `<span class="adj" data-adj="${r.c.id}:${f.a}"></span>` : ""}</td>`).join("")}</tr>`).join("")}
            ${["Net adjustment", "Gross adjustment", "Adjusted price", "Weight"].map((l, k) => `<tr class="sum s${k}"><th class="fh">${l}</th><td class="sv"><span class="na">${k === 2 ? "Indicated" : ""}</span>${k === 2 ? `<b data-cpval></b>` : ""}</td>${gridComps.map(r => `<td data-sum="${r.c.id}:${k}"></td>`).join("")}</tr>`).join("")}
            <tr class="flg"><th class="fh">Flags</th><td class="sv"></td>${gridComps.map(r => `<td data-flags="${r.c.id}"></td>`).join("")}</tr></tbody></table>`
          : `<p class="fine">The grid is empty. Use <b>Pick best 5</b> or click <b>Add to grid</b> on comps in the pool below.</p>`;
      }
      gridComps.forEach(r => {
        Object.entries(r.A).forEach(([k, v]) => { const el = wrap.querySelector(`[data-adj="${r.c.id}:${k}"]`); if (el) { el.textContent = Math.abs(v) >= 1 ? sgn(v) : ""; el.className = "adj " + (v > 0 ? "up" : v < 0 ? "dn" : ""); } });
        const sims = wrap.querySelector(`[data-cpsim="${r.c.id}"]`); if (sims) sims.innerHTML = `<i class="simbar" style="--s:${r.sim}%"></i>${r.sim}`;
        const sv = [sgn(r.net) + ` <small>${P(r.netPct)}</small>`, `${$(r.gross)} <small class="${r.grossPct > 25 ? "neg" : ""}">${P(r.grossPct)}</small>`, `<b>${$(r.adjusted)}</b>`, r.wp != null && r.c.grid && r.c.status === "Sold" ? `${r.wp.toFixed(0)}%` : `<small>not weighted (${r.c.status.toLowerCase()})</small>`];
        sv.forEach((h, k) => { const el = wrap.querySelector(`[data-sum="${r.c.id}:${k}"]`); if (el) el.innerHTML = h; });
        const fl = wrap.querySelector(`[data-flags="${r.c.id}"]`); if (fl) fl.innerHTML = r.flags.length ? r.flags.map(f => `<span class="fl ${f[0]}">${U.esc(f[1])}</span>`).join("") : `<span class="fl good">Meets every guideline</span>`;
      });
      const vb = wrap.querySelector("[data-cpval]"); if (vb) vb.textContent = a.used.length ? $(a.value) : "—";
      /* pool table */
      App.slot("cp-poolsub", `${D.comps.length} properties · ${a.rows.filter(r => r.c.status === "Sold").length} closed · sorted by similarity`);
      const ord = a.rows.slice().sort((x, y) => (y.c.grid - x.c.grid) || (y.sim - x.sim));
      App.slot("cp-pool", D.comps.length ? `<table class="tbl pool"><thead><tr><th>Property</th><th>Status</th><th>Price</th><th>$/sf</th><th>Sf</th><th>Bd/Ba</th><th>Built</th><th>Sold</th><th>Dist</th><th>Cond</th><th>Similarity</th><th></th></tr></thead><tbody>${ord.map(r => {
        const c = r.c; return `<tr class="${c.grid ? "hl" : ""}"><td class="pa">${U.esc(c.addr || "Unnamed comp")}${c.sale !== "Arms" ? ` <span class="fl bad">${c.sale}</span>` : ""}</td><td>${c.status}</td><td>${$(c.price)}</td><td>${r.psf ? $(r.psf) : "—"}</td><td>${U.num(c.sqft)}</td><td>${c.beds}/${c.baths}</td><td>${c.year || "—"}</td>
          <td>${r.months != null && c.status === "Sold" ? r.months.toFixed(1) + " mo" : "—"}</td><td>${r.dist != null ? r.dist.toFixed(2) : "—"}</td><td>C${c.cond}</td><td><span class="simcell"><i class="simbar" style="--s:${r.sim}%"></i>${r.sim}</span></td>
          <td class="pact"><button type="button" class="btn sm ${c.grid ? "ghost" : ""}" data-cact="grid" data-cid="${c.id}">${c.grid ? "In grid" : "Add to grid"}</button><button type="button" class="btn ghost sm danger" data-cact="del" data-cid="${c.id}" aria-label="Delete ${U.esc(c.addr || "comp")}">Delete</button></td></tr>`; }).join("")}</tbody></table>` : `<p class="fine">No comps yet.</p>`);
      /* methods */
      const meth = [{ l: "Adjustment grid (primary)", v: a.value, c: "var(--accent)" }, { l: "Median $/sf × subject GLA", v: a.psfVal, c: "var(--c2)" }];
      if (a.reg) meth.push({ l: `Regression on size (${a.reg.n} sales, R² ${a.reg.r2.toFixed(2)})`, v: a.reg.pred, c: "var(--c3)" });
      if (a.ceiling) meth.push({ l: "Cheapest similar active (ceiling)", v: a.ceiling, c: "var(--c6)" });
      if (S.rcValue && S.rcValue.price && S.mode !== "arv") meth.push({ l: "RentCast automated estimate (as-is)", v: S.rcValue.price, c: "var(--c9)" });
      /* RentCast panel */
      const rc = [], sp = S.rcSubject;
      if (S.rcValue && S.rcValue.price) rc.push(`<div class="rc-r"><span>RentCast estimate</span><b>${$(S.rcValue.price)}</b><small>${U.$k(S.rcValue.lo)}–${U.$k(S.rcValue.hi)} · an automated as-is value, not ARV</small></div>`);
      if (sp && (sp.bedrooms || sp.squareFootage)) { const diff = (+sp.bedrooms && +sp.bedrooms !== +D.beds) || (+sp.bathrooms && +sp.bathrooms !== +D.baths) || (+sp.squareFootage && Math.abs(+sp.squareFootage - D.sqft) > 25) || (+sp.yearBuilt && +sp.yearBuilt !== +D.year);
        rc.push(`<div class="rc-r"><span>Public record</span><b>${sp.bedrooms || "?"} bd · ${sp.bathrooms || "?"} ba · ${sp.squareFootage ? U.num(sp.squareFootage) + " sf" : "? sf"}${sp.yearBuilt ? " · " + sp.yearBuilt : ""}</b>${sp.lastSalePrice ? `<small>Last sold ${$(sp.lastSalePrice)}${sp.lastSaleDate ? " on " + String(sp.lastSaleDate).slice(0, 10) : ""}</small>` : ""}${diff ? `<button type="button" class="link" data-rcuse="facts">Use these facts</button>` : `<small class="pos">Matches the subject</small>`}</div>`); }
      if (S.rcRent && S.rcRent.rent) rc.push(`<div class="rc-r"><span>Rent estimate</span><b>${$(S.rcRent.rent)}/mo</b><small>${$(S.rcRent.lo)}–${$(S.rcRent.hi)} · ${S.rcRent.comps.length} nearby rentals${S.rcRent.comps[0] ? `, e.g. ${U.esc(S.rcRent.comps[0].a)} at ${$(S.rcRent.comps[0].p)}` : ""}</small>${Math.abs(S.rcRent.rent - D.rent) >= 25 ? `<button type="button" class="link" data-rcuse="rent">Use as market rent (now ${$(D.rent)})</button>` : `<small class="pos">Matches your market rent</small>`}</div>`);
      App.slot("cp-rc", rc.length ? `<div class="rc">${rc.join("")}</div>` : "");
      App.slot("cp-methods", a.used.length ? U.barsH(meth.filter(m => m.v > 0), { lw: 230 }) + `<p class="fine">$/sf ignores everything but size, so it overvalues small houses and undervalues big ones. The regression fits price to size across ${a.reg ? a.reg.n : "4+"} similar-condition closed sales${a.reg ? `: each extra sq ft is worth about ${$(a.reg.b)} here, a good check on your GLA rate of ${$(S.glaRate)}` : ""}.</p>` : `<p class="fine">Needs closed sales in the grid.</p>`);
      /* scatter */
      App.slot("cp-scatter", this.scatter(a));
      /* radar data */
      const pts = a.rows.filter(r => r.dist != null).map(r => {
        let dx, dy;
        if (a.hasGeo && r.c.lat && r.c.lng) { dx = (r.c.lng - D.lng) * Math.cos(D.lat * Math.PI / 180) * 69.17; dy = (r.c.lat - D.lat) * 69; }
        else { let h = 0; for (const ch of r.c.id) h = (h * 31 + ch.charCodeAt(0)) % 3600; const ang = h / 10 * Math.PI / 180; dx = Math.cos(ang) * r.dist; dy = Math.sin(ang) * r.dist; }
        return { dx, dy, st: r.c.status, grid: r.c.grid, used: !!r.wp, w: r.wp || 0, n: r.c.grid ? gridComps.indexOf(r) + 1 : null, sim: r.sim, bad: r.c.sale !== "Arms" };
      });
      App._cpRadar = { pts, maxDist: S.maxDist, geo: a.hasGeo };
    },
    scatter(a) {
      const pts = a.rows.filter(r => r.c.status === "Sold" && r.c.sqft > 0 && r.base > 0);
      if (pts.length < 2) return `<p class="fine">Add at least two closed sales with square footage.</p>`;
      const W = 640, H = 300, l = 64, r = 16, t = 14, b = 34, xs = pts.map(p => +p.c.sqft).concat(a.sub.sqft), ys = pts.map(p => p.tAdj).concat(a.value || []);
      let x0 = Math.min(...xs) * 0.92, x1 = Math.max(...xs) * 1.05, y0 = Math.min(...ys) * 0.9, y1 = Math.max(...ys) * 1.06;
      const X = v => l + (v - x0) / (x1 - x0) * (W - l - r), Y = v => t + (y1 - v) / (y1 - y0) * (H - t - b);
      let g = ""; for (let k = 0; k <= 4; k++) { const v = y0 + (y1 - y0) * k / 4; g += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${l - 8}" y="${Y(v) + 4}" text-anchor="end" class="ct sm">${U.$k(v)}</text>`; }
      for (let k = 0; k <= 3; k++) { const v = x0 + (x1 - x0) * k / 3; g += `<text x="${X(v)}" y="${H - 12}" text-anchor="middle" class="ct sm">${U.num(v)} sf</text>`; }
      const reg = a.reg ? `<line x1="${X(x0)}" x2="${X(x1)}" y1="${Y(a.reg.a + a.reg.b * x0)}" y2="${Y(a.reg.a + a.reg.b * x1)}" class="ln dash" style="stroke:var(--c3)"/>` : "";
      const sub = `<line x1="${X(a.sub.sqft)}" x2="${X(a.sub.sqft)}" y1="${t}" y2="${H - b}" class="axis dash"/><text x="${X(a.sub.sqft) + 5}" y="${t + 10}" class="ct sm">Subject ${U.num(a.sub.sqft)} sf</text>`;
      const val = a.value ? `<g class="pulse"><circle cx="${X(a.sub.sqft)}" cy="${Y(a.value)}" r="9" style="fill:var(--accent);opacity:.25"/><circle cx="${X(a.sub.sqft)}" cy="${Y(a.value)}" r="5" style="fill:var(--accent)"/></g><text x="${X(a.sub.sqft) + 10}" y="${Y(a.value) - 8}" class="cv sm">${U.$k(a.value)}</text>` : "";
      const dots = pts.map(p => { const cond = Math.abs((+p.c.cond || 4) - a.sub.cond) <= 1 && p.c.sale === "Arms"; return `<circle cx="${X(+p.c.sqft)}" cy="${Y(p.tAdj)}" r="${p.c.grid ? 6 : 4}" style="fill:${cond ? (p.c.grid ? "var(--c2)" : "var(--c9)") : "var(--c6)"};opacity:${p.c.grid ? 1 : .7}"><title>${U.esc(p.c.addr)}: ${$(p.tAdj)} · ${U.num(p.c.sqft)} sf · C${p.c.cond}</title></circle>`; }).join("");
      return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sale price versus size scatter">${g}${reg}${sub}${dots}${val}</svg>
        <div class="legend row"><span><i style="background:var(--c2)"></i>In grid</span><span><i style="background:var(--c9)"></i>Similar condition</span><span><i style="background:var(--c6)"></i>Different condition / distressed</span>${a.reg ? `<span><i style="background:var(--c3)"></i>Regression line</span>` : ""}<span><i style="background:var(--accent)"></i>Indicated value</span></div>`;
    }
  });

  /* ---------- radar canvas ---------- */
  V.radar = (canvas, get) => V.mount(canvas, (x, w, h, t) => {
    const D = get(); if (!D) return;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 18;
    const far = Math.max(D.maxDist * 1.5, ...D.pts.map(p => Math.hypot(p.dx, p.dy)), 0.5);
    const rings = [0.25, 0.5, 1, 2, 3, 5, 10].filter(v => v <= far * 1.05); if (!rings.length) rings.push(far);
    const k = R / Math.max(...rings, far);
    x.lineWidth = 1;
    rings.forEach(rv => { x.beginPath(); x.arc(cx, cy, rv * k, 0, 7); x.strokeStyle = rv === D.maxDist ? V.alpha(V.col.accent, .6) : V.col.line; x.setLineDash(rv === D.maxDist ? [4, 4] : []); x.stroke(); x.setLineDash([]);
      x.fillStyle = rv === D.maxDist ? V.col.accent : V.col.muted; x.font = '500 10px "JetBrains Mono", monospace'; x.textAlign = "left"; x.fillText(rv + " mi", cx + rv * k * 0.71 + 3, cy - rv * k * 0.71 - 3); });
    x.strokeStyle = V.col.line; x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    const sweep = (t * 0.9) % (Math.PI * 2);
    if (!V.reduced) { const gr = x.createConicGradient ? x.createConicGradient(sweep - 0.9, cx, cy) : null;
      if (gr) { gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.14, V.alpha(V.col.accent, .22)); gr.addColorStop(0.1433, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); } }
    D.pts.forEach(p => {
      const px = cx + p.dx * k, py = cy - p.dy * k;
      let ang = Math.atan2(-p.dy, p.dx); if (ang < 0) ang += Math.PI * 2;
      const since = ((sweep - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), glow = V.reduced ? 0 : Math.max(0, 1 - since / 1.6);
      const col = p.bad ? V.col.bad : p.st === "Active" ? V.col.c6 : p.st === "Pending" ? V.col.c9 : p.grid ? V.col.c2 : V.col.muted;
      const rad = p.grid ? 5 + p.w / 8 : 3.5;
      if (glow > 0) { x.beginPath(); x.arc(px, py, rad + 6 * glow, 0, 7); x.fillStyle = V.alpha(col, .25 * glow); x.fill(); }
      x.beginPath(); x.arc(px, py, rad, 0, 7); x.fillStyle = col; x.globalAlpha = p.grid ? 1 : .6; x.fill(); x.globalAlpha = 1;
      if (p.n) { x.fillStyle = V.col.fg; x.font = '600 11px "JetBrains Mono", monospace'; x.textAlign = "center"; x.fillText(p.n, px, py - rad - 5); }
    });
    const pulse = V.reduced ? 0 : (t % 2) / 2;
    x.beginPath(); x.arc(cx, cy, 6 + pulse * 14, 0, 7); x.strokeStyle = V.alpha(V.col.accent, 1 - pulse); x.lineWidth = 2; x.stroke();
    x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fillStyle = V.col.accent; x.fill();
    x.font = '500 11px "IBM Plex Sans", sans-serif'; x.fillStyle = V.col.muted; x.textAlign = "left";
    x.fillText(D.geo ? "Positions from coordinates" : "Distance is real; direction is illustrative", 8, h - 8);
    const lg = [["Grid", V.col.c2], ["Pending", V.col.c9], ["Active", V.col.c6], ["Distressed", V.col.bad], ["Pool", V.col.muted]];
    lg.forEach((l, i) => { x.fillStyle = l[1]; x.beginPath(); x.arc(14, 14 + i * 16, 4, 0, 7); x.fill(); x.fillStyle = V.col.muted; x.fillText(l[0], 24, 18 + i * 16); });
  });

  /* ---------- glossary additions ---------- */
  const comT = REI.terms.find(t => t.t === "Comps"); if (comT) { comT.tab = "comps"; comT.u = "The Comp Analyzer imports sold comps, adjusts each one toward the subject and reconciles a weighted value. The Tool Belt has a quick 3-comp $/sf version."; }
  REI.terms.push(
    { t: "Sales comparison approach", a: ["sales comparison"], c: "Valuation", d: "The appraisal method for houses: value equals what buyers recently paid for similar nearby properties, adjusted for the differences. Appraisers also use the cost and income approaches, but this one drives residential value.", u: "The method the Comp Analyzer follows step by step.", r: ["Comps", "Adjustment grid", "Reconciliation"], tab: "comps" },
    { t: "Adjustment grid", a: ["comp grid", "adjustments", "adjustment"], c: "Valuation", d: "A table with the subject and each comp side by side, feature by feature, showing the dollar adjustment that makes each comp equivalent to the subject. Always adjust the comp toward the subject: if the comp is better, subtract; if it's worse, add.", u: "The editable grid on the Comp Analyzer. Every cell recalculates live.", r: ["Net adjustment", "Gross adjustment", "Paired sales"], tab: "comps" },
    { t: "GLA", a: ["gross living area"], c: "Valuation", d: "Gross Living Area: finished, heated, above-grade square footage. Basements and garages are not GLA, even if finished; appraisers adjust for them separately.", f: "GLA adj = (subject GLA − comp GLA) × GLA rate", u: "The GLA rate defaults to 35% of the comps' median $/sf, because land and the base house don't scale with size.", r: ["Price per square foot", "Adjustment grid"], tab: "comps" },
    { t: "Net adjustment", a: ["net adjustments"], c: "Valuation", d: "The sum of all adjustments on a comp, positives and negatives netting out, as a percentage of its sale price. Fannie Mae's guideline is 15% or less.", f: "Net % = Σ adjustments ÷ comp price", r: ["Gross adjustment", "Adjustment grid"], tab: "comps" },
    { t: "Gross adjustment", a: ["gross adjustments"], c: "Valuation", d: "The sum of the absolute values of all adjustments on a comp, as a percentage of its price. It measures how different the comp really is. Fannie Mae's guideline is 25% or less.", f: "Gross % = Σ |adjustments| ÷ comp price", r: ["Net adjustment"], tab: "comps" },
    { t: "Bracketing", a: ["bracketed"], c: "Valuation", d: "Choosing comps so the subject's key features (size, age, lot, beds, baths) and its final value fall between the lowest and highest comp. It proves your adjustments aren't all pushing one way.", u: "The Comp Analyzer shows a pass/fail chip for each bracketed feature.", r: ["Adjustment grid", "Reconciliation"], tab: "comps" },
    { t: "Reconciliation", a: ["reconcile", "reconciled"], c: "Valuation", d: "The final step of an appraisal: weighing the adjusted comps into one value, giving the most weight to the most similar, least-adjusted sales. Never just average.", f: "Value = Σ (weight × adjusted price) ÷ Σ weight", u: "Weights here are similarity² (primary comps count double), rounded to the nearest $1,000.", r: ["Adjustment grid", "Bracketing"], tab: "comps" },
    { t: "Paired sales", a: ["paired sales analysis", "paired-sales"], c: "Valuation", d: "How appraisers support an adjustment: find two sales that differ mainly by one feature (a garage, a pool, a bath) and the price difference is that feature's market value.", u: "Turn off 'Derive rates from these comps' and enter your paired-sales results as adjustment rates.", r: ["Adjustment grid"], tab: "comps" },
    { t: "Time adjustment", a: ["market conditions adjustment", "market trend"], c: "Valuation", d: "An adjustment for prices rising or falling since a comp sold. Older comps in a rising market get adjusted up; in a falling market, down.", f: "Time adj = price × monthly trend % × months since sale", r: ["Comps"], tab: "comps" },
    { t: "Arm's-length sale", a: ["arm's length", "arms length", "non-arm's-length", "non-arm's length"], c: "Valuation", d: "A sale between unrelated, informed parties with normal market exposure and no pressure. REO, short sales, auctions and family transfers usually aren't arm's length and shouldn't set ARV unless they dominate the market.", r: ["REO", "Short sale"], tab: "comps" },
    { t: "REO", a: ["bank-owned", "real estate owned"], c: "Market & legal", d: "Real Estate Owned: a property the lender took back through foreclosure and is now selling. Often sold as-is at a discount, so it's a weak comp for retail value.", r: ["Arm's-length sale", "Foreclosure"], tab: "comps" },
    { t: "Short sale", a: [], c: "Market & legal", d: "A sale where the lender agrees to accept less than the loan balance. Slow, often distressed and usually not arm's length.", r: ["REO", "Arm's-length sale"], tab: "comps" },
    { t: "Condition rating", a: ["C1", "C2", "C3", "C4", "C5", "C6"], c: "Valuation", d: "Fannie Mae's UAD condition scale: C1 new, C2 like new or fully renovated, C3 well maintained with some updates, C4 dated but adequate, C5 needs repairs, C6 major damage. Renovated flips are typically C2–C3.", u: "Each step adjusts the comp by the 'Per condition step' %. For ARV, compare against the subject's after-rehab condition.", r: ["Quality rating", "ARV"], tab: "comps" },
    { t: "Quality rating", a: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"], c: "Valuation", d: "Fannie Mae's UAD quality-of-construction scale, from Q1 custom luxury to Q6 substandard. Most tract homes are Q4; it rarely changes with a rehab.", r: ["Condition rating"], tab: "comps" },
    { t: "Location influence", a: ["adverse location", "beneficial location"], c: "Valuation", d: "Whether something near the property raises or lowers its value compared with neighbors: busy roads, railroads, commercial use and power lines (adverse); parks, water, golf or a cul-de-sac (beneficial).", r: ["Adjustment grid"], tab: "comps" },
    { t: "Active listing", a: ["active listings", "actives"], c: "Valuation", d: "A home currently for sale. Its price is what the seller hopes for, not a sale. Never use it for value; use similar actives as a ceiling, since buyers will compare your house to them.", r: ["Pending sale", "Comps"], tab: "comps" },
    { t: "Pending sale", a: ["pending"], c: "Valuation", d: "A listing with an accepted offer that hasn't closed. It shows where the market is heading, but the final price is unknown until it closes.", r: ["Active listing", "Comps"], tab: "comps" },
    { t: "DOM", a: ["days on market"], c: "Valuation", d: "Days on Market: how long a home was listed before going under contract. Short DOM at a price suggests that price is supported; long DOM suggests it was priced too high.", r: ["Comps"], tab: "comps" }
  );
})(window);
