/* REI Deal Lab — app shell: state, routing, storage, events */
(function (G) {
  const U = G.U;
  const App = { mods: {}, order: [], cur: null };
  G.App = App;

  /* ---------------- defaults ---------------- */
  App.defaults = () => ({
    v: 1, id: null, name: "Sample deal · 3/2 brick ranch", addr: "1418 Larkspur Ave",
    state: "MO", city: "Kansas City", beds: 3, baths: 2, sqft: 1450, stories: 1, year: 1958,
    price: 112000, asIs: 142000, arv: 232000, rent: 1950, repairs: 45000, repairsLinked: true, hoa: 0,
    owner: false, taxAuto: true, taxRate: 1.4, insAuto: true, insAnnual: 2500, rate: 6.875,
    zip: "64131", lot: 7200, garage: 1, bsmt: 0, pool: false, cond: 5, condAfter: 3, qual: 4, loc: "N", lat: 0, lng: 0,
    comps: [],
    compSet: { mode: "arv", area: "suburban", maxMonths: 6, maxDist: 1, glaTol: 20, ageTol: 15, autoRates: true, trendMo: 0.25, glaPct: 35,
      glaRate: 55, bedAdj: 3500, bathAdj: 6000, halfAdj: 3000, garageAdj: 5000, bsmtRate: 25, lotRate: 1.5, ageRate: 700, condPct: 6, qualPct: 7, locPct: 5, pool: 9000, distressPct: 0 },
    rehab: { mode: "itemized", band: "moderate", bandPos: 50,
      lv: { gutters: 1, landscape: 1, hvac: 1, wh: 1, elec: 1, plumb: 1, paint: 2, drywall: 1, floor: 3, kitchen: 1, bath: 1, appl: 1, light: 1, safety: 1, trash: 1, dumpster: 1, permits: 1, cont: 2 },
      qty: { windows: 13, extdoors: 2, intdoors: 8, dumpsters: 1 }, scan: {} },
    s: {
      wholesale: { buyerPct: 70, fee: 12000, marketing: 1500, dcCosts: 3500, useTF: true, tfPct: 1.5 },
      flip: { buyClosing: 2, finance: "hml", ltc: 90, rehabPct: 100, maxArv: 70, rate: 11.5, points: 2, lenderFees: 1500, months: 6, dutch: false,
        utilities: 250, misc: 100, commission: 5.5, sellClosing: 1.5, concessions: 0, targetProfit: 30000 },
      wholetail: { salePct: 86, repairs: 7500, buyClosing: 2, finance: "cash", ltc: 90, rate: 11.5, points: 2, months: 2.5, utilities: 225,
        commission: 5.5, sellClosing: 1.5, concessions: 0 },
      novation: { salePrice: 199000, payoff: 61000, sellerCash: 62000, repairs: 9500, months: 3, holdM: 450, commission: 5.5, closing: 2, concessions: 2500, marketing: 600 },
      rental: { type: "conv", down: 25, rate: 7.25, term: 30, points: 0, pmi: 0.6, mip: 0.55, ufmip: 1.75, closingPct: 2.5, useDealRepairs: true, rehab: 6000,
        vac: 6, maint: 6, capex: 6, mgmt: 9, util: 0, otherExp: 40, otherInc: 0, hold: 10, appr: 3, rentGrowth: 3, expGrowth: 3, sellCost: 7, landPct: 20, bracket: 24 },
      brrrr: { acq: "hml", closingPct: 2, ltc: 90, rehabPct: 100, rate: 11.5, points: 2, lenderFees: 1500, rehabMonths: 3, leaseUp: 1, monthsToRefi: 6, utilities: 225,
        taxBasis: "arv", vac: 6, maint: 6, capex: 6, mgmt: 9, util: 0, refiLtv: 75, refiCostPct: 2.5, refiRate: 7.25, refiTerm: 30,
        sbStart: 60000, sbSave: 1500, sbYears: 6, sbReinvest: true },
      sub2: { balance: 104000, exRate: 3.375, exYears: 24, manualPI: false, exPI: 520, escrowAuto: true, escrow: 450, arrears: 5400, sellerCash: 4000, closing: 2200,
        useDealRepairs: false, repairs: 9000, vac: 6, maint: 6, capex: 6, mgmt: 9, exit: "rent", wrapPrice: 215000, wrapDown: 15000, wrapRate: 8.5, wrapTerm: 30, wrapHold: 5 },
      sellerfin: { price: 135000, downPct: 10, rate: 4.5, amort: 30, balloon: 7, io: false, closing: 2500, useDealRepairs: false, vac: 6, maint: 6, capex: 6, mgmt: 9,
        altPrice: 120000, altDownPct: 10, altRate: 7.5, discount: 8 },
      leaseoption: { mode: "sandwich", tbFee: 8000, tbRent: 2050, credit: 150, tbStrike: 239000, term: 24, feeCredit: true, closePct: 1.5,
        sRent: 1650, sFee: 1000, sStrike: 205000, reserve: 50, ownDown: 20, marketing: 600 }
    }
  });
  const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { if (!a[k] || typeof a[k] !== "object") a[k] = {}; deepMerge(a[k], b[k]); } else a[k] = b[k]; } return a; };
  App.normalize = d => deepMerge(App.defaults(), d || {});

  /* ---------------- local convenience storage ---------------- */
  const LS = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
  };
  App.LS = LS;

  /* ---------------- durable storage: db when available, else browser ---------------- */
  const Store = App.Store = {
    mode: "local", db: null, uid: null, deals: [], stats: null, listeners: new Set(),
    async init() {
      this.deals = LS.get("rdl.deals", []); this.stats = LS.get("rdl.stats", null); this.emit();
      try {
        if (!G.claude || !G.claude.use) return;
        const [db, user] = await Promise.all([G.claude.use("db"), G.claude.use("user")]);
        if (!db || !user) return;
        const uid = await user.id(); if (!uid) return;
        this.db = db; this.uid = uid; this.mode = "cloud";
        const base = db.doc("data/users/" + uid + "/profile");
        this.dealsCol = base.collection("deals");
        this.statsDoc = db.doc("data/users/" + uid + "/stats");
        this.dealsCol.onSnapshot(snap => {
          this.deals = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
          this.emit();
        }, () => { this.mode = "local"; this.emit(); });
        this.statsDoc.get().then(s => { if (s.exists) { this.stats = s.data(); this.emit(); } }).catch(() => { });
        this.emit();
      } catch (e) { this.mode = "local"; }
    },
    emit() { this.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },
    async saveDeal(deal) {
      const id = deal.id || ("d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      deal.id = id;
      const body = { name: deal.name || "Untitled deal", savedAt: Date.now(), city: (deal.city || "") , state: deal.state, price: deal.price, arv: deal.arv, rent: deal.rent, deal: JSON.parse(JSON.stringify(deal)) };
      if (this.mode === "cloud") { await this.dealsCol.doc(id).set(body); }
      else { this.deals = [{ id, ...body }, ...this.deals.filter(d => d.id !== id)]; LS.set("rdl.deals", this.deals); this.emit(); }
      return id;
    },
    async deleteDeal(id) {
      if (this.mode === "cloud") await this.dealsCol.doc(id).delete();
      else { this.deals = this.deals.filter(d => d.id !== id); LS.set("rdl.deals", this.deals); this.emit(); }
    },
    _statsTimer: null,
    saveStats(stats) {
      this.stats = stats; LS.set("rdl.stats", stats);
      if (this.mode !== "cloud") return;
      clearTimeout(this._statsTimer);
      this._statsTimer = setTimeout(() => this.statsDoc.set(JSON.parse(JSON.stringify(stats))).catch(() => { }), 1200);
    }
  };

  /* ---------------- state ---------------- */
  App.D = App.normalize(LS.get("rdl.draft", null));
  /* Deep-link prefill: ?addr=..&price=..&arv=..#comps opens a fresh deal with those numbers (works when hosted; artifact links drop query strings) */
  try {
    const q = new URLSearchParams(location.search), num = ["price", "arv", "asIs", "rent", "repairs", "sqft", "beds", "baths", "year", "lot", "hoa", "stories", "garage"];
    const alias = { asis: "asIs", value: "asIs", sf: "sqft", sqft: "sqft", address: "addr", rehab: "repairs" };
    const keys = [...q.keys()].map(k => alias[k.toLowerCase()] || k);
    if (keys.some(k => num.includes(k) || ["addr", "zip", "state", "city", "name"].includes(k))) {
      const d = App.defaults(); d.comps = [];
      q.forEach((v, k) => { k = alias[k.toLowerCase()] || k; v = v.trim();
        if (num.includes(k)) { const x = parseFloat(v.replace(/[^0-9.\-]/g, "")); if (isFinite(x)) d[k] = x; }
        else if (k === "state") { if (REI.states[v.toUpperCase()]) d.state = v.toUpperCase(); }
        else if (k === "city") d.city = v; else if (["addr", "zip", "name"].includes(k)) d[k] = v.slice(0, 200); });
      if (d.city && !REI.cities.some(c => c.n === d.city && c.s === d.state)) d.city = "";
      if (q.has("repairs") || q.has("rehab")) d.repairsLinked = false;
      d.name = q.get("name") || d.addr || "Linked property";
      App.D = d; App.fromLink = true;
      history.replaceState(null, "", location.pathname + location.hash);
    }
  } catch (e) { }
  App.S = id => App.D.s[id];
  App.M = () => G.F.market(App.D);
  let draftTimer;
  App.persistDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(() => LS.set("rdl.draft", App.D), 400); };

  /* ---------------- module registry ---------------- */
  App.reg = mod => { App.mods[mod.id] = mod; App.order.push(mod.id); };
  App.groups = [
    ["Analyze", ["hub", "comps", "repairs"]],
    ["Quick exits", ["wholesale", "wholetail", "novation", "flip"]],
    ["Hold", ["rental", "brrrr"]],
    ["Creative finance", ["sub2", "sellerfin", "leaseoption"]],
    ["Learn & train", ["glossary", "toolbelt", "motion", "drills"]],
    ["Saved", ["library"]]
  ];

  /* ---------------- shared layout helpers ---------------- */
  App.basics = keys => {
    const D = App.D, m = (v, base) => Math.max(base, Math.ceil((+v || 0) * 2 / 10000) * 10000);
    const all = {
      price: { k: "price", l: "Purchase price", t: "money", s: 1, min: 0, max: m(D.price, 300000), step: 1000 },
      asIs: { k: "asIs", l: "As-is value", t: "money", s: 1, min: 0, max: m(D.asIs, 300000), step: 1000, hint: "What it would sell for today, unrepaired, to a retail or investor buyer." },
      arv: { k: "arv", l: "ARV (after repair value)", t: "money", s: 1, min: 0, max: m(D.arv, 400000), step: 1000, hint: "Supported by renovated SOLD comps: same subdivision, ±20% sq ft, last 6 months, within 0.5–1 mile." },
      rent: { k: "rent", l: "Market rent", t: "money", s: 1, min: 0, max: m(D.rent, 4000), step: 25 },
      repairs: { k: "repairs", l: "Repair budget" + (D.repairsLinked ? " · linked to estimator" : ""), t: "money", s: 1, min: 0, max: m(D.repairs, 120000), step: 500, hint: "Linked to the Repair Estimator while the link is on. Typing a number here unlinks it." },
      hoa: { k: "hoa", l: "HOA dues", t: "money", hint: "Monthly." }
    };
    return keys.map(k => all[k]);
  };
  App.marketStrip = () => {
    const M = App.M();
    return `<div class="mstrip"><button type="button" class="chip" data-go="hub" title="Change market in Deal Hub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${U.esc(M.label)}</button>
      <span class="chip ghost">Tax ${U.pct(M.taxRate, 2)}${App.D.taxAuto ? "" : " · custom"}</span><span class="chip ghost">Ins ${U.$(M.insAnnual)}/yr</span><span class="chip ghost">Rate ${U.pct(App.D.rate, 3)}</span></div>`;
  };
  App.layout = o => `
    <header class="mh">
      <div class="mh-txt"><p class="eyebrow">${U.esc(o.eyebrow)}</p><h1>${U.esc(o.title)}</h1><p class="lede">${o.lede}</p>${o.noStrip ? "" : App.marketStrip()}</div>
      ${o.playbook ? `<div class="mh-tabs" role="tablist"><button role="tab" aria-selected="true" data-pane="num" class="on">Underwrite</button><button role="tab" aria-selected="false" data-pane="pb">Playbook</button></div>` : ""}
    </header>
    <div class="split${o.wide ? " wide" : ""}">
      <aside class="inputs" aria-label="Inputs">${o.inputs}</aside>
      <section class="results" data-panel="num">${o.results}</section>
      ${o.playbook ? `<section class="results" data-panel="pb" hidden>${U.playbook(o.playbook)}</section>` : ""}
    </div>`;
  App.slot = (name, html) => { const el = App.root.querySelector(`[data-slot="${name}"]`); if (el) el.innerHTML = html; G.Gloss && G.Gloss.schedule(); };
  App.card = (title, slot, extra = "", cls = "") => `<div class="card ${cls}">${title ? `<div class="card-h"><h3>${title}</h3>${extra}</div>` : ""}<div data-slot="${slot}"></div></div>`;
  App.vizCard = (title, canvasId, sub, h = 300, extra = "") => `<div class="card viz"><div class="card-h"><h3>${title}</h3><span class="sub">${sub || ""}</span>${extra}</div><canvas id="${canvasId}" style="height:${h}px" aria-label="${U.esc(title)} animation"></canvas></div>`;

  /* ---------------- rehab totals feed every module ---------------- */
  App.rehab = () => G.Rehab ? G.Rehab.calc(App.D) : null;

  /* ---------------- recalc ---------------- */
  let raf = 0;
  App.recalc = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; App.doRecalc(); }); };
  App.doRecalc = () => {
    if (App.D.repairsLinked && G.Rehab) App.D.repairs = Math.round(G.Rehab.calc(App.D).total / 100) * 100;
    const m = App.mods[App.cur];
    try { m && m.update && m.update(); } catch (e) { console.error(e); }
    if (App.root) U.sync(App.root, App.D);
    App.renderTop();
    App.persistDraft();
    G.Gloss && G.Gloss.schedule();
  };

  /* ---------------- top bar ---------------- */
  App.renderTop = () => {
    const el = document.getElementById("dealName"); if (el && document.activeElement !== el) el.value = App.D.name;
    const st = document.getElementById("storeState");
    if (st) st.textContent = Store.mode === "cloud" ? "Library syncs to your account" : "Library saves in this browser";
  };

  /* ---------------- routing ---------------- */
  App.go = id => { if (location.hash !== "#" + id) location.hash = id; else App.show(id); };
  App.show = id => {
    if (!App.mods[id]) id = "hub";
    G.V && G.V.clear();
    G.Gloss && G.Gloss.hide(true);
    App.cur = id;
    document.querySelectorAll(".nav a").forEach(a => { const on = a.dataset.id === id; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const root = App.root = document.getElementById("view");
    root.innerHTML = "";
    root.className = "view mod-" + id;
    App.mods[id].render(root);
    App.doRecalc();
    root.querySelectorAll(".kpis, .card, .fs").forEach((el, i) => el.style.setProperty("--i", i));
    document.getElementById("main").scrollTop = 0; window.scrollTo(0, 0);
    LS.set("rdl.tab", id);
    const navItem = document.querySelector(`.nav a[data-id="${id}"]`); if (navItem && navItem.scrollIntoView && innerWidth < 900) navItem.scrollIntoView({ inline: "center", block: "nearest" });
  };

  /* ---------------- events ---------------- */
  const coerce = v => v === "true" ? true : v === "false" ? false : /^-?\d+(\.\d+)?$/.test(v) ? +v : v;
  App.changed = (path, val) => {
    const D = App.D;
    if (path === "repairs") D.repairsLinked = false;
    if (path === "taxRate") D.taxAuto = false;
    if (path === "insAnnual") D.insAuto = false;
    const m = App.mods[App.cur];
    if (m && m.onChange) m.onChange(path, val);
    App.recalc();
  };
  App.bind = () => {
    const main = document.getElementById("main");
    main.addEventListener("input", e => {
      const el = e.target, path = el.dataset && el.dataset.path; if (!path) return;
      if (el.type === "range") { U.set(App.D, path, +el.value); const txt = App.root.querySelector(`input[type=text][data-path="${path}"]`); if (txt) txt.value = U.fmtField(txt.dataset.t, +el.value); App.changed(path, +el.value); return; }
      if (el.type === "checkbox" || el.tagName === "SELECT") return;
      const v = el.dataset.t === "text" ? el.value : U.parse(el.value);
      U.set(App.D, path, v);
      const rng = App.root.querySelector(`input[type=range][data-path="${path}"]`); if (rng) rng.value = v;
      App.changed(path, v);
    });
    main.addEventListener("change", e => {
      const el = e.target, path = el.dataset && el.dataset.path; if (!path) return;
      if (el.type === "checkbox") { U.set(App.D, path, el.checked); App.changed(path, el.checked); }
      else if (el.tagName === "SELECT") { const v = coerce(el.value); U.set(App.D, path, v); App.changed(path, v); }
      else if (el.type === "text" && el.dataset.t !== "text") el.value = U.fmtField(el.dataset.t, U.get(App.D, path));
    });
    main.addEventListener("click", e => {
      const seg = e.target.closest(".seg button");
      if (seg) { const path = seg.parentElement.dataset.path, v = coerce(seg.dataset.val); U.set(App.D, path, v); App.changed(path, v); U.sync(App.root, App.D); return; }
      const k = e.target.closest(".kpi"); if (k && k.querySelector(".kpi-m")) { const o = k.classList.toggle("open"); k.setAttribute("aria-expanded", o); return; }
      const tab = e.target.closest(".mh-tabs button");
      if (tab) { App.root.querySelectorAll(".mh-tabs button").forEach(b => { const on = b === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); }); App.root.querySelectorAll("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== tab.dataset.pane); return; }
      const go = e.target.closest("[data-go]"); if (go) { App.go(go.dataset.go); return; }
    });
    document.getElementById("dealName").addEventListener("input", e => { App.D.name = e.target.value; App.persistDraft(); });
    document.getElementById("saveBtn").addEventListener("click", App.saveCurrent);
    document.getElementById("newBtn").addEventListener("click", () => App.confirmBar("Start a blank deal? Unsaved changes to the current deal are dropped.", "Start blank", () => { const d = App.defaults(); d.name = "New deal"; App.D = d; App.show(App.cur); App.toast("Started a new deal from defaults"); }));
    document.getElementById("themeBtn").addEventListener("click", App.toggleTheme);
    addEventListener("hashchange", () => App.show(location.hash.slice(1)));
  };
  App.saveCurrent = async () => {
    try { await Store.saveDeal(App.D); App.persistDraft(); App.toast(`Saved “${App.D.name}” to your library`); }
    catch (e) { App.toast(e && e.code === "quota_exceeded" ? "Library is full. Delete an old deal and save again." : "Couldn't save. Check your connection and try again."); }
  };

  /* ---------------- toast + inline confirm ---------------- */
  App.toast = msg => { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(App._tt); App._tt = setTimeout(() => t.classList.remove("on"), 2600); };
  App.confirmBar = (msg, label, fn) => {
    const t = document.getElementById("confirm"); t.querySelector("p").textContent = msg; t.querySelector(".yes").textContent = label; t.hidden = false;
    t.querySelector(".yes").onclick = () => { t.hidden = true; fn(); }; t.querySelector(".no").onclick = () => t.hidden = true;
    t.querySelector(".yes").focus();
  };

  /* ---------------- theme ---------------- */
  App.toggleTheme = () => {
    const r = document.documentElement, cur = r.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    r.dataset.theme = cur === "dark" ? "light" : "dark"; LS.set("rdl.theme", r.dataset.theme);
    setTimeout(() => G.V && G.V.readColors(), 30);
  };

  /* ---------------- nav ---------------- */
  App.icons = {
    hub: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6", repairs: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
    wholesale: "M4 7h16M4 7l2 12h12l2-12M9 7V4h6v3M9 12h6", wholetail: "M3 12h13M12 6l6 6-6 6M20 5v14", novation: "M7 7h10v10H7zM3 3l4 4M21 3l-4 4M3 21l4-4M21 21l-4-4",
    flip: "M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.3 1.8M18.5 9A7 7 0 0 0 6.2 7.2", rental: "M4 21V9l8-6 8 6v12M9 21v-7h6v7M4 21h16",
    brrrr: "M12 3a9 9 0 1 0 9 9M21 3v6h-6M12 8v4l3 2", sub2: "M4 17h16M7 17V9l5-4 5 4v8M2 21h20M10 13h4", sellerfin: "M3 7h18v10H3zM7 12h.01M17 12h.01M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5",
    leaseoption: "M8 11V7a4 4 0 0 1 8 0M5 11h14v10H5zM12 15v2", toolbelt: "M4 4h16v16H4zM8 8h3M8 12h8M8 16h5M15 7v3M13.5 8.5h3",
    motion: "M3 12c3-6 6-6 9 0s6 6 9 0M3 18c3-3 6-3 9 0s6 3 9 0M3 6c3-3 6-3 9 0s6 3 9 0", drills: "M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    library: "M5 3h11l3 3v15H5zM9 3v6h6V3M8 14h8M8 17h6",
    comps: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3v3M12 18v3M3 12h3M18 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10",
    glossary: "M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3M8 7h8M8 10.5h5"
  };
  App.renderNav = () => {
    document.getElementById("nav").innerHTML = App.groups.map(([g, ids]) => `<div class="ng"><p>${g}</p>${ids.filter(id => App.mods[id]).map(id =>
      `<a href="#${id}" data-id="${id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${App.icons[id]}"/></svg><span>${App.mods[id].nav}</span></a>`).join("")}</div>`).join("");
  };

  App.init = () => {
    const th = LS.get("rdl.theme", null); if (th) document.documentElement.dataset.theme = th;
    G.V.readColors();
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => setTimeout(G.V.readColors, 30));
    App.renderNav(); App.bind();
    Store.listeners.add(() => { App.renderTop(); if (App.cur === "library" || App.cur === "drills") { const m = App.mods[App.cur]; m.onStore && m.onStore(); } });
    Store.init();
    App.show((location.hash || "").slice(1) || LS.get("rdl.tab", "hub"));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => G.V.readColors());
  };
  document.addEventListener("DOMContentLoaded", App.init);
})(window);
