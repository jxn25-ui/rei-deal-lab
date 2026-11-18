/* REI Deal Lab — one-bar address entry: parse a pasted US address into street / city / state / ZIP,
   apply it to the deal (market, city preset), and look up coordinates for comp distances. */
(function (G) {
  const A = G.Addr = {};
  /* ZIP prefix (first 3 digits) → state, used when an address has a ZIP but no state */
  const Z3 = [[5, 5, "NY"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"], [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"],
    [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"], [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"],
    [290, 299, "SC"], [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 458, "OH"], [460, 479, "IN"],
    [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"], [569, 569, "DC"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"],
    [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"],
    [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"]];
  A.zipState = z => { const p = parseInt(String(z).slice(0, 3), 10); const hit = Z3.find(r => p >= r[0] && p <= r[1]); return hit ? hit[2] : ""; };

  const SUFFIX = "st|street|ave|avenue|av|rd|road|dr|drive|ln|lane|ct|court|blvd|boulevard|way|ter|terrace|terr|pl|place|cir|circle|pkwy|parkway|hwy|highway|trl|trail|loop|sq|square|run|path|pike|xing|crossing|cv|cove|pt|point|aly|alley|bnd|bend|hts|heights|walk|expy|fwy|plz|plaza|row|pass|ridge|rdg|vw|view|grv|grove|mnr|manor";
  const DIR = "n|s|e|w|ne|nw|se|sw|north|south|east|west";
  const UNIT = "(?:apt|apartment|unit|ste|suite|lot|bldg|building|fl|floor|rm|room|#)\\.?\\s*#?\\s*[\\w-]+";
  const RX_SPLIT = new RegExp(`^(.*?\\b(?:${SUFFIX})\\.?(?:\\s+(?:${DIR})\\.?)?(?:\\s*,?\\s*${UNIT})?)\\s+([A-Za-z][A-Za-z .'-]+)$`, "i");
  const norm = s => s.toLowerCase().replace(/\./g, "").replace(/\bsaint\b/g, "st").replace(/\s+/g, " ").trim();
  const ALIAS = { nyc: "New York City", "new york": "New York City", manhattan: "New York City", brooklyn: "New York City", queens: "New York City", bronx: "New York City", "washington dc": "Washington", "st louis": "St. Louis", okc: "Oklahoma City" };
  A.preset = (city, st) => {
    if (!city) return "";
    const n = norm(city), al = ALIAS[n];
    const hit = REI.cities.find(c => c.s === st && (norm(c.n) === n || (al && c.n === al)));
    return hit ? hit.n : "";
  };
  const STATE_NAMES = () => Object.values(REI.states).map(s => [s.name.toLowerCase(), s.code]).sort((a, b) => b[0].length - a[0].length);

  A.parse = raw => {
    let s = String(raw || "").replace(/[\r\n\t]+/g, ", ").replace(/\s+/g, " ").trim();
    s = s.replace(/,?\s*(usa|u\.s\.a\.|united states( of america)?|us)\.?$/i, "").trim();
    const out = { street: "", city: "", state: "", zip: "", raw: s };
    if (!s) return out;
    let m = /(?:^|[\s,])(\d{5})(?:-\d{4})?\s*$/.exec(s);
    if (m) { out.zip = m[1]; s = s.slice(0, m.index).trim(); }
    s = s.replace(/[,\s]+$/, "");
    m = /(?:^|[\s,])([A-Za-z]{2})\.?$/.exec(s);
    if (m && REI.states[m[1].toUpperCase()]) { out.state = m[1].toUpperCase(); s = s.slice(0, m.index).trim(); }
    else {
      const low = s.toLowerCase();
      for (const [name, code] of STATE_NAMES()) {
        if (low === name || low.endsWith(" " + name) || low.endsWith("," + name)) { out.state = code; s = s.slice(0, s.length - name.length).trim(); break; }
      }
    }
    s = s.replace(/[,\s]+$/, "");
    const parts = s.split(",").map(x => x.trim()).filter(Boolean);
    if (parts.length >= 2) { out.city = parts.pop(); out.street = parts.join(", "); }
    else if (parts.length === 1) {
      const one = parts[0];
      /* try a known preset city at the end first ("... Kansas City") */
      const cands = REI.cities.filter(c => !out.state || c.s === out.state).sort((a, b) => b.n.length - a.n.length);
      const cityRx = c => new RegExp("\\s(" + c.n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^St\\\./, "(?:St\\.?|Saint)").replace(/\s+/g, "\\s+") + ")$", "i");
      const hit = /^\d/.test(one) ? cands.find(c => cityRx(c).test(one)) : null;
      if (hit) { const mm = cityRx(hit).exec(one); out.city = hit.n; out.street = one.slice(0, mm.index).trim(); }
      else if ((m = RX_SPLIT.exec(one)) && /^\d/.test(one)) { out.street = m[1].trim(); out.city = m[2].trim(); }
      else if (/^\d/.test(one)) out.street = one;
      else out.city = one;
    }
    if (!out.state && out.zip) out.state = A.zipState(out.zip);
    if (!out.state && out.city) { const c = REI.cities.filter(x => norm(x.n) === norm(out.city)); if (c.length === 1) out.state = c[0].s; }
    out.street = out.street.replace(/\s+,/g, ",").replace(/,\s*$/, "");
    if (out.city && (out.city === out.city.toLowerCase() || out.city === out.city.toUpperCase())) out.city = out.city.toLowerCase().replace(/(^|[\s-])\w/g, ch => ch.toUpperCase());
    return out;
  };
  A.full = D => [D.addr, D.cityName || (D.city || ""), [D.state, D.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  /* apply parsed parts to a deal; returns what changed */
  A.apply = (D, p) => {
    const before = A.full(D), oldAddr = D.addr;
    if (p.street) D.addr = p.street;
    if (p.state && REI.states[p.state]) D.state = p.state;
    if (p.city) D.cityName = p.city;
    D.city = A.preset(D.cityName, D.state);
    if (p.zip) D.zip = p.zip;
    const changed = A.full(D) !== before;
    if (changed) { D.lat = 0; D.lng = 0; }
    if (p.street && (!D.name || /^(sample deal|new deal|linked property)/i.test(D.name) || D.name === oldAddr)) D.name = p.street;
    let removedSamples = 0;
    if (changed && D.comps && D.comps.some(c => c.sample)) { removedSamples = D.comps.filter(c => c.sample).length; D.comps = D.comps.filter(c => !c.sample); }
    return { changed, removedSamples, staleComps: changed && D.comps && D.comps.length > 0 };
  };

  /* coordinates via OpenStreetMap Nominatim (works on the hosted site; sandboxed pages block it) */
  A.locate = async D => {
    const q = A.full(D); if (!q || !D.addr) return { ok: false, msg: "Enter a street address first." };
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`, { signal: ctl.signal, headers: { "Accept": "application/json" } });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      if (!j.length) return { ok: false, msg: "Couldn't find that address on the map. Check the spelling, or enter latitude and longitude on the Comp Analyzer." };
      const h = j[0], ad = h.address || {};
      D.lat = +(+h.lat).toFixed(6); D.lng = +(+h.lon).toFixed(6);
      if (!D.zip && ad.postcode) D.zip = String(ad.postcode).slice(0, 5);
      const iso = (ad["ISO3166-2-lvl4"] || "").replace("US-", "");
      if (iso && REI.states[iso] && iso !== D.state) { D.state = iso; D.city = A.preset(D.cityName, D.state); }
      const c = ad.city || ad.town || ad.village || ad.hamlet;
      if (!D.cityName && c) { D.cityName = c; D.city = A.preset(c, D.state); }
      return { ok: true, msg: `Located at ${D.lat}, ${D.lng}. Comp distances will use these coordinates.` };
    } catch (e) { return { ok: false, offline: true, msg: "Map lookup isn't available here. On the hosted site it runs automatically; here you can enter coordinates on the Comp Analyzer." }; }
  };

  /* ---------- the bar (used by Deal Hub and Comp Analyzer) ---------- */
  A.bar = D => `<div class="addrbar">
      <label for="addrIn">Property address</label>
      <form class="ab-row" id="addrForm" autocomplete="off">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
        <input id="addrIn" type="text" spellcheck="false" placeholder="Paste a full address: 1418 Larkspur Ave, Kansas City, MO 64131" value="${G.U.esc(A.full(D))}">
        <button type="submit" class="btn sm">Fill in</button>
      </form>
      <div class="ab-out" id="addrOut"></div></div>`;
  A.paint = D => {
    const el = document.getElementById("addrOut"); if (!el) return;
    const st = REI.states[D.state], U = G.U;
    const chip = (l, v, ok) => `<span class="ab-c ${ok ? "ok" : "miss"}"><em>${l}</em>${v ? U.esc(v) : "missing"}</span>`;
    el.innerHTML = chip("Street", D.addr, !!D.addr) + chip("City", D.cityName || D.city, !!(D.cityName || D.city)) + chip("State", st ? st.code : "", !!st) + chip("ZIP", D.zip, /^\d{5}$/.test(D.zip || "")) +
      `<span class="ab-c ${D.lat && D.lng ? "ok" : "miss"}"><em>Map</em>${D.lat && D.lng ? `${(+D.lat).toFixed(4)}, ${(+D.lng).toFixed(4)}` : `<button type="button" class="link" id="addrLoc">Locate</button>`}</span>` +
      `<span class="ab-m">Market: <b>${U.esc(G.F.market(D).label)}</b>${D.city ? " preset" : D.cityName ? " (state averages; no preset for this city)" : ""}</span>`;
    const lb = document.getElementById("addrLoc");
    if (lb) lb.onclick = async () => { lb.textContent = "Locating…"; const r = await A.locate(D); G.App.toast(r.msg); A.after(); };
  };
  A.after = () => { const App = G.App; App.persistDraft(); App.show(App.cur); };
  A.bind = root => {
    const App = G.App, D = () => App.D, inp = root.querySelector("#addrIn"), form = root.querySelector("#addrForm");
    if (!inp) return;
    A.paint(D());
    const run = async () => {
      const p = A.parse(inp.value);
      if (!p.street && !p.city && !p.zip) { App.toast("Paste an address like: 1418 Larkspur Ave, Kansas City, MO 64131"); return; }
      const r = A.apply(D(), p);
      const missing = [!p.street && "street", !p.state && "state", !p.zip && "ZIP"].filter(Boolean);
      App.toast(missing.length ? `Filled what I could. Still missing: ${missing.join(", ")}.` : r.removedSamples ? "Address filled in. Example comps for the sample house were removed." : r.staleComps ? "Address filled in. Your comps are from the previous address: review them on the Comp Analyzer." : "Address filled in");
      App.show(App.cur);
      if (D().addr && !(D().lat && D().lng)) { const g = await A.locate(D()); if (g.ok) { App.persistDraft(); if (App.cur === "hub" || App.cur === "comps") App.show(App.cur); } else A.paint(D()); }
    };
    form.addEventListener("submit", e => { e.preventDefault(); run(); });
    inp.addEventListener("paste", () => setTimeout(run, 0));
  };
})(window);
