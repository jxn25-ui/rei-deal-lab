/* REI Deal Lab — Deal Hub, Repair Estimator, Wholesale, Wholetail, Novation, Fix & Flip */
(function (G) {
  const { U, F, V, App } = G, $ = U.$, P = U.pct;

  /* ================= REHAB ENGINE ================= */
  const Rehab = G.Rehab = {
    basis(D) {
      const sq = +D.sqft || 0, st = Math.max(1, +D.stories || 1), foot = sq / st, per = 4.4 * Math.sqrt(foot);
      return { flat: 1, flatS: Math.sqrt(Math.max(400, sq) / 1500), sqft: sq, bath: Math.max(1, +D.baths || 1), roofsq: foot * 1.15 * 1.10 / 100, perim: per, wall: per * 9 * st, foot };
    },
    lineCost(it, li, D, B, mult) {
      const L = it.lv[li]; if (!li || !L || L[2] === "pctHard") return 0;
      const basis = L[2] === "count" ? (+D.rehab.qty[it.qty] || 0) : B[L[2]];
      return L[1] * basis * mult;
    },
    calc(D) {
      const M = F.market(D), mult = M.costMult, B = Rehab.basis(D), R = D.rehab;
      let hard = 0; const rows = [], byCat = {};
      REI.repairCats.forEach(cat => { byCat[cat.id] = 0; cat.items.forEach(it => {
        const li = Math.min(+R.lv[it.id] || 0, it.lv.length - 1), L = it.lv[li];
        const cost = Rehab.lineCost(it, li, D, B, mult); hard += cost;
        rows.push({ it, cat, li, cost, pct: li && L[2] === "pctHard" ? L[1] : 0 });
      }); });
      let soft = 0;
      rows.forEach(r => { if (r.pct && r.it.id !== "cont") { r.cost = hard * r.pct / 100; soft += r.cost; } });
      const cont = rows.find(r => r.it.id === "cont"); if (cont && cont.pct) { cont.cost = (hard + soft) * cont.pct / 100; soft += cont.cost; }
      rows.forEach(r => byCat[r.cat.id] += r.cost);
      const itemized = hard + soft;
      const band = REI.rehabBands.find(b => b.id === R.band) || REI.rehabBands[2];
      const perSf = band.lo + (band.hi - band.lo) * (+R.bandPos || 0) / 100;
      const quick = (+D.sqft || 0) * perSf * mult;
      const total = R.mode === "quick" ? quick : itemized;
      return { rows, byCat, hard, soft, itemized, quick, band, perSf, total, mult, B, perSqft: D.sqft ? total / D.sqft : 0, lo: total * 0.87, hi: total * 1.15 };
    }
  };

  /* ================= DEAL HUB ================= */
  const stateOpts = Object.values(REI.states).sort((a, b) => a.name.localeCompare(b.name)).map(s => [s.code, s.name]);
  App.reg({
    id: "hub", nav: "Deal Hub",
    render(root) {
      const D = App.D;
      const cities = REI.cities.filter(c => c.s === D.state).map(c => [c.n, c.n]);
      if (D.city && !cities.some(c => c[0] === D.city)) D.city = "";
      const inputs =
        U.fieldset("Property", [
          { k: "addr", l: "Address", t: "text" }, { k: "zip", l: "ZIP code", t: "text" }, { k: "beds", l: "Beds", t: "num" }, { k: "baths", l: "Baths", t: "num" },
          { k: "sqft", l: "Living area", t: "sqft" }, { k: "stories", l: "Stories", t: "num" }, { k: "year", l: "Year built", t: "num", hint: "Pre-1978: lead paint disclosure. Pre-1960: budget for sewer, electrical and plumbing surprises." }
        ], D) +
        U.fieldset("Market · drives taxes & insurance", [
          { k: "state", l: "State", t: "sel", opts: stateOpts },
          { k: "city", l: "City preset", t: "sel", opts: [["", "State average"], ...cities] },
          { k: "owner", l: "Owner-occupied (homestead rates)", t: "tog" },
          { k: "taxAuto", l: "Use market tax rate", t: "tog" },
          { k: "taxRate", l: "Property tax rate", t: "pct", hint: "Annual tax ÷ value. Investor (non-homestead) rates assume the county reassesses at your purchase price." },
          { k: "insAuto", l: "Estimate insurance", t: "tog" },
          { k: "insAnnual", l: "Insurance / year", t: "money" },
          { k: "rate", l: "Today's 30-yr investor rate", t: "pct", s: 1, min: 3, max: 11, step: 0.125, hint: "Non-owner-occupied conventional pricing typically runs ~0.5–0.75% above owner-occupied." }
        ], D) +
        U.fieldset("The numbers", App.basics(["price", "asIs", "arv", "rent", "repairs", "hoa"]), D, `<div class="row"><button type="button" class="btn ghost sm" data-go="comps">Comp this property →</button><button type="button" class="btn ghost sm" data-go="repairs">Estimate repairs →</button></div>`);
      root.innerHTML = App.layout({
        eyebrow: "Analyze", title: "Deal Hub", noStrip: true,
        lede: "Enter the property once. Every strategy tab reads these numbers, so you can run the same house through all nine exits and compare.",
        inputs,
        results: `
          <div class="card hero"><canvas id="hubPulse" class="hero-bg" aria-hidden="true"></canvas><div class="hero-in" data-slot="hero"></div></div>
          ${App.card("Quick screens", "screens", `<span class="sub">The 60-second filter before you underwrite</span>`)}
          ${App.card("Strategy scoreboard", "board", `<span class="sub">Same house, every exit · click a row to open it</span>`)}
          ${App.card("Market & PITI build-up", "market")}`
      });
      V.pulse(root.querySelector("#hubPulse"), () => App._hubCF);
    },
    onChange(path) { if (path === "state") { App.D.city = ""; App.show("hub"); } if (path === "city" || path === "owner") App.show("hub"); },
    update() {
      const D = App.D, M = App.M(), S = D.s;
      if (D.taxAuto) D.taxRate = M.autoTax; if (D.insAuto) D.insAnnual = M.autoIns;
      const rn = F.rental(D, S.rental), fl = F.flip(D, S.flip), ws = F.wholesale(D, S.wholesale, S.flip), wt = F.wholetail(D, S.wholetail),
        nv = F.novation(D, S.novation, ws.yourMAO), br = F.brrrr(D, S.brrrr), s2 = F.sub2(D, S.sub2), sf = F.sellerFin(D, S.sellerfin), lo = F.leaseOption(D, S.leaseoption);
      App._hubCF = { cf: rn.cfM };
      const spread = D.arv - D.price - D.repairs;
      App.slot("hero", `
        <p class="eyebrow">${U.esc(D.addr || "Untitled property")} · ${U.esc(M.label)}</p>
        <div class="hero-row">
          <div><span class="big-l">Gross spread</span><span class="big-v ${spread > 0 ? "pos" : "neg"}">${$(spread)}</span><span class="big-s">ARV − price − repairs</span></div>
          <div><span class="big-l">70% rule MAO</span><span class="big-v">${$(fl.mao70)}</span><span class="big-s">${D.price <= fl.mao70 ? "Price is under MAO" : "Price is " + $(D.price - fl.mao70) + " over"}</span></div>
          <div><span class="big-l">Rental cash flow</span><span class="big-v ${rn.cfM >= 0 ? "pos" : "neg"}">${U.mo(rn.cfM)}</span><span class="big-s">${S.rental.down}% down · ${P(S.rental.rate, 3)}</span></div>
        </div>
        ${U.stack([{ l: "Price", v: D.price, c: "var(--c2)" }, { l: "Repairs", v: D.repairs, c: "var(--c7)" }, { l: "Costs ~", v: fl.total - D.price - D.repairs - fl.selling + fl.selling, c: "var(--c6)" }, { l: "Margin", v: Math.max(0, fl.profit), c: "var(--good)" }], { label: "Where the ARV goes on a flip" })}
        <p class="fine">Bar = ARV ${$(D.arv)} split into price, repairs, flip carrying + selling costs, and what's left.</p>`);
      const ppsf = D.sqft ? D.price / D.sqft : 0, arvsf = D.sqft ? D.arv / D.sqft : 0;
      const scr = [
        ["70% rule", D.price <= fl.mao70, `Price ${$(D.price)} vs MAO ${$(fl.mao70)}`, "ARV × 70% − repairs"],
        ["1% rule", rn.onePct >= 1, `Rent is ${P(rn.onePct, 2)} of all-in`, "Rent ÷ (price + rehab) ≥ 1%"],
        ["50% rule", rn.fiftyCF > 0, `Est. cash flow ${U.mo(rn.fiftyCF)}`, "Rent × 50% − P&I"],
        ["DSCR ≥ 1.25", rn.dscr >= 1.25, `DSCR ${U.x(rn.dscr)}`, "NOI ÷ debt service"],
        ["Cap rate ≥ 7%", rn.cap >= 7, `Cap ${P(rn.cap)}`, "NOI ÷ price"],
        ["Price / sq ft", ppsf <= arvsf * 0.6, `${$(ppsf)} vs ARV ${$(arvsf)}/sf`, "Buy ≤ 60% of ARV $/sf"]
      ];
      App.slot("screens", `<div class="screens">${scr.map(s => `<div class="scr ${s[1] ? "pass" : "fail"}"><span class="scr-i" aria-hidden="true">${s[1] ? "✓" : "✕"}</span><div><b>${s[0]}</b><span>${s[2]}</span><small>${s[3]}</small></div></div>`).join("")}</div>`);
      const rows = [
        { id: "wholesale", n: "Wholesale", v: ws.assignNet, k: "Net fee", sub: `Contract ${$(ws.contract)} · buyer MAO ${$(ws.buyerMAO)}`, time: "~30 days" },
        { id: "wholetail", n: "Wholetail", v: wt.profit, k: "Profit", sub: `ROI ${P(wt.roi)} · cash ${$(wt.cash)}`, time: wt.months + " mo" },
        { id: "novation", n: "Novation", v: nv.profit, k: "Profit", sub: `Seller nets ${$(nv.sellerNet)} · at risk ${$(nv.cash)}`, time: S.novation.months + " mo" },
        { id: "flip", n: "Fix & flip", v: fl.profit, k: "Profit", sub: `ROI ${P(fl.roi)} · cash ${$(fl.cash)}`, time: fl.months + " mo" },
        { id: "rental", n: "Buy & hold", v: rn.cfA, k: "Cash flow / yr", sub: `CoC ${P(rn.coc)} · cash ${$(rn.cash)}`, time: "Hold" },
        { id: "brrrr", n: "BRRRR", v: br.cfA, k: "Cash flow / yr", sub: `Cash left ${$(br.cashLeft)} · CoC ${P(br.coc)}`, time: "Hold" },
        { id: "sub2", n: "Subject-To", v: s2.cfA, k: "Cash flow / yr", sub: `Entry ${$(s2.entry)} · CoC ${P(s2.coc)}`, time: "Hold", note: true },
        { id: "sellerfin", n: "Seller finance", v: sf.cfA, k: "Cash flow / yr", sub: `Down ${$(sf.down)} · balloon ${$(sf.balloon)}`, time: S.sellerfin.balloon + " yr", note: true },
        { id: "leaseoption", n: "Lease option", v: lo.total, k: "Profit over term", sub: `${S.leaseoption.mode === "sandwich" ? "Sandwich" : "You own"} · at risk ${$(lo.atRisk)}`, time: lo.term + " mo", note: true }
      ];
      const mx = Math.max(1, ...rows.map(r => Math.abs(r.v)));
      App.slot("board", `<div class="board">${rows.map((r, i) => `<button type="button" class="brow" data-go="${r.id}" style="--i:${i}">
          <span class="b-n">${r.n}${r.note ? `<small>uses its tab's terms</small>` : ""}</span>
          <span class="b-bar"><i class="${r.v >= 0 ? "pos" : "neg"}" style="width:${Math.abs(r.v) / mx * 100}%"></i></span>
          <span class="b-v ${r.v >= 0 ? "pos" : "neg"}">${$(r.v)}<small>${r.k}</small></span>
          <span class="b-s">${r.sub}</span><span class="b-t">${r.time}</span></button>`).join("")}</div>`);
      const L = F.loanBlock(D.price, S.rental);
      App.slot("market", `<div class="two">
        ${U.ledger([
          { l: "Property tax rate", v: P(M.taxRate, 2), n: D.taxAuto ? (M.city ? `${M.city.n} preset` : `${M.st.name} ${D.owner ? "owner-occupied" : "investor"} avg`) : "Custom" },
          { l: "Annual tax", v: $(D.price * M.taxRate / 100), n: `${P(M.taxRate, 2)} × ${$(D.price)} purchase price` },
          { l: "Insurance estimate", v: $(M.insAnnual) + "/yr", n: D.insAuto ? `${$(M.insBase)} avg @ $300k × ${$(M.coverage)} rebuild cost ÷ 300k${D.owner ? "" : " × 1.15 landlord policy"}` : "Custom" },
          { l: "Rebuild cost basis", v: $(M.coverage), n: `${U.num(D.sqft)} sf × $150 × ${M.costMult.toFixed(2)} regional index` },
          { l: "Construction cost index", v: M.costMult.toFixed(2) + "×", n: "Scales every repair line" },
          { l: "Foreclosure process", v: M.st.fc, n: M.st.fc === "Judicial" ? "Court-supervised: longer runway for pre-foreclosure deals" : "Trustee sale: timelines can be 60–120 days" }
        ], "Market inputs")}
        ${U.ledger([
          { l: "Loan", v: $(L.loan), n: `${S.rental.down}% down on ${$(D.price)}` },
          { l: "Principal & interest", v: U.$c(L.pi), n: `${P(S.rental.rate, 3)}, ${S.rental.term} yrs` },
          { l: "Taxes", v: U.$c(rn.taxM) }, { l: "Insurance", v: U.$c(rn.insM) },
          { l: "Mortgage insurance", v: U.$c(L.mi) }, { l: "HOA", v: U.$c(+D.hoa || 0) },
          { l: "PITI(A)", v: U.$c(rn.piti), c: "total" }
        ], "Monthly payment (Buy & Hold loan)")}</div>
        <p class="fine">Tax and insurance figures are planning estimates. Rates vary by school district and millage; get the county's actual bill and a landlord-policy quote before you close.</p>`);
    }
  });

  /* ================= REPAIR ESTIMATOR ================= */
  App.reg({
    id: "repairs", nav: "Repair Estimator",
    render(root) {
      const D = App.D;
      const scan = REI.scan.map((q, qi) => `<div class="scan-q"><span>${q.q}</span><div class="chips">${q.opts.map((o, oi) =>
        `<button type="button" class="cb${D.rehab.scan[qi] === oi ? " on" : ""}" data-scan="${qi}:${oi}">${o[0]}</button>`).join("")}</div></div>`).join("");
      const inputs =
        U.fieldset("Method", [{ k: "rehab.mode", l: "Estimate by", t: "seg", opts: [["itemized", "Line items"], ["quick", "$ per sq ft"]] },
          { k: "repairsLinked", l: "Feed this total to every strategy", t: "tog" }], D) +
        U.fieldset("Size", [{ k: "sqft", l: "Living area", t: "sqft" }, { k: "baths", l: "Bathrooms", t: "num" }, { k: "stories", l: "Stories", t: "num" },
          { k: "rehab.qty.windows", l: "Windows", t: "num" }, { k: "rehab.qty.extdoors", l: "Exterior doors", t: "num" }, { k: "rehab.qty.intdoors", l: "Interior doors", t: "num" }, { k: "rehab.qty.dumpsters", l: "Dumpsters", t: "num" }], D) +
        `<fieldset class="fs"><legend>Walkthrough scan</legend><p class="fine">Tap what you see on site. Each answer sets the matching line items; fine-tune them on the right.</p><div class="scan">${scan}</div></fieldset>` +
        U.fieldset("Quick $/sq ft band", [{ k: "rehab.band", l: "Scope", t: "seg", opts: REI.rehabBands.map(b => [b.id, b.name]) },
          { k: "rehab.bandPos", l: "Position in band (low → high)", t: "pct", s: 1, min: 0, max: 100, step: 5 }], D, `<div data-slot="band" class="fine"></div>`);
      root.innerHTML = App.layout({
        eyebrow: "Analyze", title: "Repair Estimator", wide: true,
        lede: "Walk the house system by system. Costs are national installed averages scaled by your market's construction index, with permits, GC margin and contingency on top.",
        inputs,
        results: `<div data-slot="kpis"></div>
          <div class="card"><div class="card-h"><h3>Budget by area</h3><span class="sub">Hover a slice for detail</span></div><div data-slot="donut"></div></div>
          <div class="card"><div class="card-h"><h3>Line items</h3><span class="sub">Click a level to price it</span></div><div data-slot="items"></div></div>`,
        playbook: {
          what: "Your repair number is the input most likely to sink a deal. Overestimate and you lose the contract to someone else; underestimate and you eat it. Pros estimate in layers: a $/sq ft sanity band first, then line items, then a contingency sized to the home's age and unknowns.",
          when: ["Every deal, before you make an offer", "On the walkthrough: photograph the roof, electrical panel, water heater label (it shows the year), HVAC data plate, foundation and under sinks", "Again after a contractor bid; reconcile any line that differs by more than 20%"],
          steps: ["Run the $/sq ft band for a ballpark", "Do the walkthrough scan room by room", "Adjust line items and quantities", "Add permits, GC margin if you're not managing subs, and contingency", "Compare the itemized total against the band; investigate big gaps", "Get 2–3 bids before closing; keep the estimate as your negotiation anchor"],
          fx: [["Roof squares = footprint × 1.15 pitch × 1.10 waste ÷ 100", "One roofing square covers 100 sq ft"], ["Contingency = (hard + soft) × 10–20%", "Use 15%+ for pre-1960 homes"], ["Rehab $/sf = total ÷ living area", "Cosmetic $15–25 · moderate $40–60 · gut $85–125"]],
          flags: ["Foundation movement, sewer lateral, knob-and-tube wiring and polybutylene pipe are the big four surprises", "Permits can trigger code upgrades (egress windows, GFCI/AFCI, smoke detectors)", "Mold and asbestos remediation need licensed contractors in most states", "Material prices and labor vary widely; verify with local bids"]
        }
      });
      root.querySelector(".split").addEventListener("click", e => {
        const s = e.target.closest("[data-scan]");
        if (s) { const [qi, oi] = s.dataset.scan.split(":").map(Number); D.rehab.scan[qi] = oi; Object.assign(D.rehab.lv, REI.scan[qi].opts[oi][1]); D.rehab.mode = "itemized";
          s.parentElement.querySelectorAll(".cb").forEach(b => b.classList.toggle("on", b === s)); App.recalc(); return; }
        const l = e.target.closest("[data-lv]");
        if (l) { const [id, li] = l.dataset.lv.split(":"); D.rehab.lv[id] = +li; D.rehab.mode = "itemized"; App.recalc(); }
      });
    },
    update() {
      const D = App.D, R = Rehab.calc(D), cols = { ext: "var(--c2)", sys: "var(--c1)", int: "var(--c7)", soft: "var(--c6)" };
      const top = REI.repairCats.map(c => [c.name, R.byCat[c.id]]).sort((a, b) => b[1] - a[1])[0];
      App.slot("kpis", U.kpis([
        { l: R.byCat && D.rehab.mode === "quick" ? "Quick estimate" : "Itemized total", v: $(R.total), tone: "", big: 1, sub: `Range ${U.$k(R.lo)} – ${U.$k(R.hi)}`, m: U.math(D.rehab.mode === "quick" ? `${U.num(D.sqft)} sf × ${$(R.perSf)}/sf × ${R.mult.toFixed(2)}` : `hard ${$(R.hard)} + soft ${$(R.soft)}`, $(R.total)) },
        { l: "Per sq ft", v: $(R.perSqft), sub: REI.rehabBands.find(b => R.perSqft / R.mult < b.hi)?.name || "Full gut+" },
        { l: "Biggest bucket", v: U.$k(top[1]), sub: top[0] },
        { l: D.rehab.mode === "quick" ? "Line-item check" : "$/sf band check", v: $(D.rehab.mode === "quick" ? R.itemized : R.quick), sub: D.rehab.mode === "quick" ? "Itemized total" : `${R.band.name} band @ ${$(R.perSf)}/sf` },
        { l: "Feeding strategies", v: D.repairsLinked ? "Linked" : $(D.repairs), tone: D.repairsLinked ? "good" : "warn", sub: D.repairsLinked ? "All tabs use this total" : "Manual number in use" }
      ]));
      App.slot("donut", U.donut(REI.repairCats.map(c => ({ l: c.name, v: R.byCat[c.id], c: cols[c.id] })), U.$k(R.itemized), "itemized"));
      App.slot("band", `${R.band.d} → ${$(R.perSf)}/sf × ${R.mult.toFixed(2)} index = <b>${$(R.quick)}</b>`);
      const B = R.B;
      App.slot("items", REI.repairCats.map(cat => `<div class="ri-cat"><h4>${cat.name}<span>${$(R.byCat[cat.id])}</span></h4>${cat.items.map(it => {
        const row = R.rows.find(r => r.it.id === it.id);
        return `<div class="ri${row.li ? " on" : ""}"><div class="ri-n"><b>${it.name}</b>${it.note ? `<small>${it.note}</small>` : ""}</div>
          <div class="ri-lv">${it.lv.map((L, li) => {
            const c = L[2] === "pctHard" ? null : Rehab.lineCost(it, li, D, B, R.mult);
            return `<button type="button" class="cb${row.li === li ? " on" : ""}" data-lv="${it.id}:${li}">${L[0]}${li && c != null ? `<em>${U.$k(c)}</em>` : ""}</button>`; }).join("")}</div>
          <div class="ri-c">${row.cost ? $(row.cost) : "—"}</div></div>`; }).join("")}</div>`).join(""));
    }
  });

  /* ================= WHOLESALE ================= */
  App.reg({
    id: "wholesale", nav: "Wholesale",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Quick exits", title: "Wholesale",
        lede: "Lock the property under contract, then assign the contract (or double close) to a cash buyer. Your fee is the gap between your contract price and what the buyer will pay.",
        inputs: U.fieldset("Deal", [{ ...App.basics(["price"])[0], l: "Your contract price with seller" }, ...App.basics(["arv", "repairs"])], D) +
          U.fieldset("Buyer's formula", [
            { k: "s.wholesale.buyerPct", l: "Buyer pays % of ARV", t: "seg", opts: [[65, "65%"], [70, "70%"], [75, "75%"], [80, "80%"]], hint: "Rehabbers in hot markets pay 75–80%; slower or lower-priced markets 60–70%. Ask your buyers." },
            { k: "s.wholesale.buyerPct", l: "Custom %", t: "pct", s: 1, min: 50, max: 90, step: 1 },
            { k: "s.wholesale.fee", l: "Your target assignment fee", t: "money", s: 1, min: 0, max: 60000, step: 500 }
          ], D) +
          U.fieldset("Your costs", [
            { k: "s.wholesale.marketing", l: "Marketing / acquisition cost", t: "money", hint: "Cost to find this deal: mail, ads, skip tracing, driving for dollars." },
            { k: "s.wholesale.dcCosts", l: "Double-close title costs (both sides)", t: "money" },
            { k: "s.wholesale.useTF", l: "Use transactional funding", t: "tog" },
            { k: "s.wholesale.tfPct", l: "Transactional funding fee", t: "pct" }
          ], D),
        results: `<div data-slot="kpis"></div><div data-slot="verdict"></div>
          ${App.card("Where the ARV goes", "stack", `<span class="sub">From the cash buyer's side</span>`)}
          <div class="two">${App.card("Offer ladder", "ladder", `<span class="sub">Open low, walk away at MAO</span>`)}${App.card("ARV sensitivity", "sens", `<span class="sub">Your MAO if comps come in different</span>`)}</div>
          ${App.card("Assignment vs double close", "ledger")}
          ${App.card("Sanity check: the buyer's flip at their MAO", "buyer")}`,
        playbook: {
          what: "Wholesaling is contract arbitrage. You find a motivated seller, sign a purchase agreement with an assignment clause, and sell your position to an investor buyer for a fee. You never take title on an assignment. On a double close you buy and resell the same day, usually with transactional funding.",
          when: ["Seller needs speed and certainty more than price", "Heavy rehab that retail buyers won't finance", "You have no capital (or want to keep it) but have a strong buyers list", "Building cash to fund your first flips or rentals"],
          steps: ["Find the lead (direct mail, cold call, D4D, PPC)", "Pull comps and estimate repairs", "Offer at or below your MAO; sign with 'and/or assigns' and an inspection period", "Deposit EMD with title", "Market to your buyers list; collect their non-refundable EMD", "Assign the contract or double close; get paid at closing"],
          fx: [["Buyer MAO = ARV × 70% − repairs", "The 70% covers buyer profit + holding + selling costs"], ["Your MAO = Buyer MAO − your fee", "Your maximum offer to the seller"], ["Spread = Buyer MAO − contract price", "What a buyer at their max leaves for you"]],
          flags: ["Several states regulate wholesaling (licensing or disclosure laws, e.g., IL, OK, PA, SC). Check your state", "Large assignment fees show on the HUD; some sellers or buyers push back. Double close keeps the fee private", "Inflated ARVs burn your buyers list. Use renovated sold comps only", "Never market a property you don't have under contract"]
        }
      });
    },
    update() {
      const D = App.D, S = App.S("wholesale"), r = F.wholesale(D, S, App.S("flip"));
      App.slot("kpis", U.kpis([
        { l: "Your max offer (MAO)", v: $(r.yourMAO), big: 1, tone: D.price <= r.yourMAO ? "good" : "bad", m: U.math(`${$(r.arv)} × ${S.buyerPct}% − ${$(r.rehab)} − ${$(S.fee)} fee`, $(r.yourMAO)) },
        { l: "Buyer's MAO", v: $(r.buyerMAO), m: U.math(`${$(r.arv)} × ${S.buyerPct}% − ${$(r.rehab)}`, $(r.buyerMAO)) },
        { l: "Spread at your contract", v: $(r.spread), tone: r.spread >= S.fee ? "good" : r.spread > 0 ? "warn" : "bad", m: U.math(`${$(r.buyerMAO)} − ${$(r.contract)}`, $(r.spread)) },
        { l: "Net · assignment", v: $(r.assignNet), tone: r.assignNet > 0 ? "good" : "bad", sub: "after marketing" },
        { l: "Net · double close", v: $(r.dcNet), tone: r.dcNet > 0 ? "good" : "bad", sub: `title ${$(S.dcCosts)}${S.useTF ? " + TF " + $(r.tf) : ""}` },
        { l: "Contract % of ARV", v: P(r.pctOfArv), sub: "Under 60% is typical for strong wholesale deals" }
      ]));
      App.slot("verdict", r.spread >= S.fee ? U.verdict("good", "Deal works", `At ${$(r.contract)} you leave a ${$(r.spread)} spread, above your ${$(S.fee)} target. A buyer paying ${S.buyerPct}% of ARV can take this.`)
        : r.spread > 0 ? U.verdict("warn", "Thin", `Only ${$(r.spread)} of spread. Renegotiate toward ${$(r.yourMAO)} or accept a smaller fee.`)
        : U.verdict("bad", "No spread", `Your contract is ${$(-r.spread)} above what a ${S.buyerPct}% buyer pays. You'd need the seller at ${$(r.yourMAO)} or a higher-paying buyer.`));
      const bf = r.buyerFlip;
      App.slot("stack", U.stack([{ l: "Your contract", v: r.contract, c: "var(--c2)" }, { l: "Your fee", v: Math.max(0, r.spread), c: "var(--accent)" }, { l: "Repairs", v: r.rehab, c: "var(--c7)" }, { l: "Buyer's costs + profit", v: Math.max(0, r.arv - r.buyerMAO - r.rehab), c: "var(--c6)" }]) +
        `<p class="fine">The ${100 - S.buyerPct}% the buyer keeps is not all profit: it pays their loan, holding, and ~7% in selling costs.</p>`);
      const lad = [["Opening offer", r.yourMAO * 0.85, "Anchor ~15% under MAO, justify with the repair list"], ["Target", r.yourMAO * 0.93, "Where most deals land"], ["Walk-away", r.yourMAO, "Your MAO. Above this, pass or restructure"]];
      App.slot("ladder", `<div class="ladder">${lad.map((x, i) => `<div class="lad" style="--h:${60 + i * 20}%"><b>${$(x[1])}</b><span>${x[0]}</span><small>${x[2]}</small></div>`).join("")}</div>`);
      const sens = [-10, -5, 0, 5].map(d => { const a = r.arv * (1 + d / 100); return [d, a, a * S.buyerPct / 100 - r.rehab - S.fee]; });
      App.slot("sens", `<table class="tbl"><thead><tr><th>ARV</th><th>Value</th><th>Your MAO</th></tr></thead><tbody>${sens.map(s => `<tr class="${s[0] === 0 ? "hl" : ""}"><td>${s[0] > 0 ? "+" : ""}${s[0]}%</td><td>${$(s[1])}</td><td>${$(s[2])}</td></tr>`).join("")}</tbody></table>`);
      App.slot("ledger", `<div class="two">${U.ledger([{ l: "Buyer pays", v: $(r.buyerMAO) }, { l: "Your contract", v: "−" + $(r.contract) }, { l: "Marketing", v: "−" + $(S.marketing) }, { l: "Net to you", v: $(r.assignNet), c: "total" }], "Assignment")}
        ${U.ledger([{ l: "Resale to buyer", v: $(r.buyerMAO) }, { l: "Purchase from seller", v: "−" + $(r.contract) }, { l: "Title / closing (A–B and B–C)", v: "−" + $(S.dcCosts) }, { l: "Transactional funding", v: "−" + $(r.tf) }, { l: "Marketing", v: "−" + $(S.marketing) }, { l: "Net to you", v: $(r.dcNet), c: "total" }], "Double close")}</div>`);
      App.slot("buyer", bf ? `<p class="fine">If your buyer pays ${$(r.buyerMAO)} and flips it with the Fix & Flip tab's financing:</p>` + U.kpis([
        { l: "Buyer's profit", v: $(bf.profit), tone: bf.profit > 20000 ? "good" : bf.profit > 0 ? "warn" : "bad" },
        { l: "Buyer's ROI", v: P(bf.roi) }, { l: "Buyer's margin", v: P(bf.margin), sub: "of ARV" }]) + `<p class="fine">Buyers want roughly 10–15% of ARV as profit. Below that, expect them to pass or renegotiate.</p>` : "");
    }
  });

  /* ================= WHOLETAIL ================= */
  App.reg({
    id: "wholetail", nav: "Wholetail",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Quick exits", title: "Wholetail",
        lede: "Buy it, clean it, list it. Skip the full rehab and sell close to retail on the MLS to owner-occupants and investors who will finish it themselves.",
        inputs: U.fieldset("Deal", App.basics(["price", "arv"]), D) +
          U.fieldset("Sale & scope", [
            { k: "s.wholetail.salePct", l: "Sale price as % of ARV", t: "pct", s: 1, min: 60, max: 100, step: 1, hint: "Lightly-touched homes typically sell 80–92% of fully-renovated ARV." },
            { k: "s.wholetail.repairs", l: "Light work (cleanout, paint, carpet)", t: "money", s: 1, min: 0, max: 40000, step: 250 },
            { k: "s.wholetail.months", l: "Hold time", t: "mo", s: 1, min: 1, max: 9, step: 0.5 }
          ], D) +
          U.fieldset("Financing & costs", [
            { k: "s.wholetail.finance", l: "Purchase with", t: "seg", opts: [["cash", "Cash"], ["hml", "Hard money"]] },
            { k: "s.wholetail.ltc", l: "Loan-to-cost", t: "pct" }, { k: "s.wholetail.rate", l: "Rate", t: "pct" }, { k: "s.wholetail.points", l: "Points", t: "pct" },
            { k: "s.wholetail.buyClosing", l: "Buy closing costs", t: "pct" }, { k: "s.wholetail.utilities", l: "Utilities / mo", t: "money" },
            { k: "s.wholetail.commission", l: "Agent commissions", t: "pct" }, { k: "s.wholetail.sellClosing", l: "Seller closing costs", t: "pct" }, { k: "s.wholetail.concessions", l: "Concessions", t: "money" }
          ], D),
        results: `<div data-slot="kpis"></div>${App.card("Profit waterfall", "wf")}${App.card("Same house, three quick exits", "cmp", `<span class="sub">Profit, time and cash compared</span>`)}${App.card("Ledger", "ledger")}`,
        playbook: {
          what: "Wholetailing sits between wholesaling and flipping. You close on the property (taking title), do only what's needed to make it presentable and financeable, and list it. You capture more than a wholesale fee without a flip's time, budget and construction risk.",
          when: ["The gap between as-is and renovated value is small", "Hot retail market with buyers willing to do their own updates", "You bought below market (auction, probate, tax sale) and want a fast turn", "The house is livable: no major systems failures that block FHA/conventional financing"],
          steps: ["Buy at a wholesale-level price", "Trash-out, deep clean, paint, flooring, curb appeal", "Professional photos and list on MLS", "Accept the best offer; prefer cash or conventional buyers", "Close in 60–120 days total"],
          fx: [["Profit = sale − purchase − light work − holding − financing − selling", "Selling ≈ 7% of sale"], ["Annualized ROI = ROI × 12 ÷ months", "Short holds magnify annualized returns"]],
          flags: ["FHA/VA buyers need the home to meet minimum property standards. Peeling paint, missing handrails or a dead furnace can kill the loan", "You take title: you own the inspection surprises", "Overpricing burns your hold time"]
        }
      });
    },
    update() {
      const D = App.D, S = App.S("wholetail"), r = F.wholetail(D, S), fl = F.flip(D, App.S("flip")), ws = F.wholesale(D, App.S("wholesale"));
      App.slot("kpis", U.kpis([
        { l: "Net profit", v: $(r.profit), big: 1, tone: r.profit > 15000 ? "good" : r.profit > 0 ? "warn" : "bad", m: U.math(`${$(r.sale)} − ${$(r.total)} costs`, $(r.profit)) },
        { l: "Cash needed", v: $(r.cash) }, { l: "ROI", v: P(r.roi), m: U.math(`${$(r.profit)} ÷ ${$(r.cash)}`, P(r.roi)) },
        { l: "Annualized", v: P(r.annRoi), m: U.math(`${P(r.roi)} × 12 ÷ ${r.months}`, P(r.annRoi)) },
        { l: "Sale price", v: $(r.sale), sub: `${S.salePct}% of ARV` }
      ]));
      App.slot("wf", U.waterfall([{ l: "Sale price", v: r.sale, type: "start" }, { l: "Purchase", v: -r.price }, { l: "Buy closing", v: -r.buyClose }, { l: "Light work", v: -r.rep }, { l: "Financing", v: -(r.interest + r.points) }, { l: "Holding", v: -r.holding }, { l: "Selling", v: -r.selling }, { l: "Profit", v: r.profit, type: "end" }]));
      const cmp = [["Wholesale", ws.assignNet, 1, 1500], ["Wholetail", r.profit, r.months, r.cash], ["Full flip", fl.profit, fl.months, fl.cash]];
      App.slot("cmp", `<table class="tbl"><thead><tr><th>Exit</th><th>Profit</th><th>Months</th><th>Profit / mo</th><th>Cash in</th><th>Profit per $1</th></tr></thead><tbody>${cmp.map(c => `<tr class="${c[0] === "Wholetail" ? "hl" : ""}"><td>${c[0]}</td><td>${$(c[1])}</td><td>${c[2]}</td><td>${$(c[1] / c[2])}</td><td>${$(c[3])}</td><td>${(c[1] / Math.max(1, c[3])).toFixed(2)}</td></tr>`).join("")}</tbody></table><p class="fine">Profit per month and per dollar of cash tell you which exit uses your time and capital best, not just which makes the most.</p>`);
      App.slot("ledger", U.ledger([{ l: "Sale price", v: $(r.sale) }, { l: "Purchase", v: "−" + $(r.price) }, { l: "Buy closing", v: "−" + $(r.buyClose) }, { l: "Light work", v: "−" + $(r.rep) },
        { l: "Interest + points", v: "−" + $(r.interest + r.points), n: r.loan ? `${$(r.loan)} loan` : "Cash purchase" }, { l: "Holding", v: "−" + $(r.holding), n: `${$(r.holdM)}/mo × ${r.months} (tax, vacant insurance, utilities)` }, { l: "Selling costs", v: "−" + $(r.selling) }, { l: "Net profit", v: $(r.profit), c: "total" }]));
    }
  });

  /* ================= NOVATION ================= */
  App.reg({
    id: "novation", nav: "Novation",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Quick exits", title: "Novation",
        lede: "Sign a novation agreement with the seller, fund light repairs, list at retail, and pay the seller a guaranteed net that beats any cash offer. You keep the spread.",
        inputs: U.fieldset("Values", App.basics(["asIs", "arv"]), D) +
          U.fieldset("Seller's side", [
            { k: "s.novation.payoff", l: "Seller's mortgage payoff", t: "money", s: 1, min: 0, max: 400000, step: 1000 },
            { k: "s.novation.sellerCash", l: "Guaranteed cash to seller", t: "money", s: 1, min: 0, max: 300000, step: 1000, hint: "The amount the seller walks away with, on top of their payoff." }
          ], D) +
          U.fieldset("Retail sale", [
            { k: "s.novation.salePrice", l: "Retail sale price", t: "money", s: 1, min: 0, max: Math.max(400000, D.arv * 1.5), step: 1000, hint: "Price after your light work, supported by comps in similar condition." },
            { k: "s.novation.repairs", l: "Your light repairs", t: "money" }, { k: "s.novation.months", l: "Months to sell", t: "mo" }, { k: "s.novation.holdM", l: "Your holding cost / mo", t: "money", hint: "Utilities, lawn, any payments you agreed to cover." },
            { k: "s.novation.commission", l: "Agent commissions", t: "pct" }, { k: "s.novation.closing", l: "Seller-side closing costs", t: "pct" }, { k: "s.novation.concessions", l: "Buyer concessions", t: "money" }, { k: "s.novation.marketing", l: "Marketing / staging", t: "money" }
          ], D),
        results: `<div data-slot="kpis"></div>${App.card("Where the sale price goes", "stack")}${App.card("What the seller nets, three ways", "seller", `<span class="sub">Why sellers say yes</span>`)}${App.card("Ledger", "ledger")}`,
        playbook: {
          what: "A novation replaces your purchase contract with a new agreement: the seller agrees to sell to a future retail buyer, and you're granted the right to improve, market and sell the property. The seller deeds directly to the end buyer at closing. You never take title, yet you capture near-retail pricing.",
          when: ["Light-repair property in a market with strong retail demand", "Seller has meaningful equity and won't accept a cash offer's discount", "Your cash offer can't compete with what a listing would net them", "You want flip-level margins without buying the property"],
          steps: ["Agree on the seller's guaranteed net (often 5–15% more than your cash offer)", "Sign the novation agreement plus a limited POA and recorded memorandum", "Fund light repairs, photos and staging", "List with an agent partner, or as permitted in your state", "Seller deeds to the retail buyer; title pays the seller their net and you the remainder"],
          fx: [["Your profit = sale − commissions − closing − repairs − holding − seller net", "Seller net = payoff + guaranteed cash"], ["Seller advantage = novation net − cash-offer net", "This is your pitch"]],
          flags: ["Some states treat marketing someone else's property for profit as unlicensed brokerage. Work with a licensed agent and an attorney-drafted agreement", "Lenders on the end buyer's side may flag a large payout to a non-owner; disclose and use experienced title", "Seller can die, divorce or get liens mid-deal: record a memorandum", "Repairs you fund are at risk if the sale falls through"]
        }
      });
    },
    update() {
      const D = App.D, S = App.S("novation"), ws = F.wholesale(D, App.S("wholesale")), r = F.novation(D, S, ws.yourMAO);
      App.slot("kpis", U.kpis([
        { l: "Your profit", v: $(r.profit), big: 1, tone: r.profit > 15000 ? "good" : r.profit > 0 ? "warn" : "bad", m: U.math(`${$(r.list)} − ${$(r.costs)} costs − ${$(r.sellerNet)} seller`, $(r.profit)) },
        { l: "Seller's total at closing", v: $(r.sellerNet), sub: `payoff ${$(S.payoff)} + cash ${$(S.sellerCash)}` },
        { l: "Your cash at risk", v: $(r.cash) }, { l: "ROI on cash", v: P(r.roi) },
        { l: "Seller beats cash offer by", v: $(r.sellerNovation - r.sellerCashOffer), tone: r.sellerNovation > r.sellerCashOffer ? "good" : "bad" }
      ]));
      App.slot("stack", U.stack([{ l: "Seller payoff", v: S.payoff, c: "var(--c6)" }, { l: "Seller cash", v: S.sellerCash, c: "var(--c2)" }, { l: "Commissions + closing", v: r.commission + r.closing + S.concessions, c: "var(--c1)" }, { l: "Repairs + holding", v: S.repairs + r.holding + S.marketing, c: "var(--c7)" }, { l: "Your profit", v: Math.max(0, r.profit), c: "var(--good)" }]));
      App.slot("seller", U.barsH([
        { l: "Your cash offer", v: r.sellerCashOffer, c: "var(--c6)", tag: `at MAO ${U.$k(ws.yourMAO)}` },
        { l: "Lists it as-is", v: r.sellerSelfList, c: "var(--c9)", tag: "6% comm + 2% costs" },
        { l: "Novation", v: r.sellerNovation, c: "var(--good)", tag: "guaranteed" }
      ], { lw: 130 }) + `<p class="fine">Cash in the seller's pocket after paying off their ${$(S.payoff)} mortgage.</p>`);
      App.slot("ledger", U.ledger([{ l: "Retail sale", v: $(r.list) }, { l: "Commissions", v: "−" + $(r.commission) }, { l: "Closing costs", v: "−" + $(r.closing) }, { l: "Concessions", v: "−" + $(S.concessions) },
        { l: "Your repairs", v: "−" + $(S.repairs) }, { l: "Holding", v: "−" + $(r.holding) }, { l: "Marketing", v: "−" + $(S.marketing) }, { l: "Seller's guaranteed net", v: "−" + $(r.sellerNet) }, { l: "Your profit", v: $(r.profit), c: "total" }]));
    }
  });

  /* ================= FIX & FLIP ================= */
  App.reg({
    id: "flip", nav: "Fix & Flip",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Quick exits", title: "Fix & Flip",
        lede: "Buy, renovate, sell. Model hard-money draws, points, the carry you pay every month, and the 7% it costs to sell, then solve for the most you can pay.",
        inputs: U.fieldset("Deal", App.basics(["price", "arv", "repairs"]), D) +
          U.fieldset("Financing", [
            { k: "s.flip.finance", l: "Fund with", t: "seg", opts: [["hml", "Hard money"], ["cash", "All cash"]] },
            { k: "s.flip.ltc", l: "Purchase financed", t: "pct", s: 1, min: 0, max: 100, step: 5 }, { k: "s.flip.rehabPct", l: "Rehab financed (draws)", t: "pct", s: 1, min: 0, max: 100, step: 5 },
            { k: "s.flip.maxArv", l: "Lender cap: % of ARV", t: "pct" }, { k: "s.flip.rate", l: "Interest rate", t: "pct", s: 1, min: 6, max: 16, step: 0.25 },
            { k: "s.flip.points", l: "Points", t: "pct" }, { k: "s.flip.lenderFees", l: "Lender fees", t: "money" },
            { k: "s.flip.dutch", l: "Dutch interest (on full rehab loan from day 1)", t: "tog" }
          ], D) +
          U.fieldset("Timeline & carry", [{ k: "s.flip.months", l: "Months: close to sale", t: "mo", s: 1, min: 1, max: 18, step: 0.5 }, { k: "s.flip.utilities", l: "Utilities / mo", t: "money" }, { k: "s.flip.misc", l: "Lawn, security, misc / mo", t: "money" }, { k: "s.flip.buyClosing", l: "Buy closing costs", t: "pct" }], D) +
          U.fieldset("Sale", [{ k: "s.flip.commission", l: "Agent commissions", t: "pct" }, { k: "s.flip.sellClosing", l: "Seller closing + transfer tax", t: "pct" }, { k: "s.flip.concessions", l: "Buyer concessions", t: "money" }, { k: "s.flip.targetProfit", l: "Your minimum profit", t: "money", s: 1, min: 0, max: 100000, step: 1000 }], D),
        results: `<div data-slot="kpis"></div><div data-slot="verdict"></div>${App.card("Profit waterfall", "wf")}
          ${App.vizCard("Your cash, month by month", "flipCap", "Drag to scrub · cash goes in, sale brings it back", 260)}
          <div class="two">${App.card("Risk grid: profit if things move", "grid")}${App.card("Ledger", "ledger")}</div>`,
        playbook: {
          what: "A flip is a short construction project with a sale at the end. Profit is made at purchase: the price has to leave room for repairs, ~10% of ARV in carrying and selling costs, and your margin. Most losses come from optimistic ARVs, scope creep, and timelines that double.",
          when: ["Renovated comps clearly support the ARV", "You have contractor relationships and capital or a lender", "The spread survives a 10% ARV miss or a 20% rehab overrun", "Days-on-market in the area is short"],
          steps: ["Underwrite with the 70% rule, then a full cost model", "Secure financing (hard money: 85–90% of purchase, 100% of rehab via draws)", "Close, pull permits, start demo within a week", "Manage draws and inspections; hold contractors to milestones", "List with pro photos at a comp-supported price", "Close the sale; pay off the lender"],
          fx: [["MAO = ARV × 70% − repairs", "Rule of thumb only"], ["Interest = rate ÷ 12 × months × (purchase loan + ½ rehab loan)", "Non-dutch: you pay only on drawn funds"], ["Break-even = fixed costs ÷ (1 − selling %)", "The lowest sale price that returns your money"], ["Annualized ROI = ROI × 12 ÷ months", ""]],
          flags: ["Every extra month costs interest + taxes + insurance + utilities", "Hard-money lenders cap at 65–75% of ARV; the rest is your cash", "Short-term gains are taxed as ordinary income (and possibly self-employment tax for dealers)", "Permit delays and inspector findings are the most common timeline killers"]
        }
      });
      V.capital(root.querySelector("#flipCap"), () => App._flipCap);
    },
    update() {
      const D = App.D, S = App.S("flip"), r = F.flip(D, S), max = F.flipMaxOffer(D, S, S.targetProfit);
      App.slot("kpis", U.kpis([
        { l: "Net profit", v: $(r.profit), big: 1, tone: r.profit >= S.targetProfit ? "good" : r.profit > 0 ? "warn" : "bad", m: U.math(`${$(r.arv)} − ${$(r.total)} all costs`, $(r.profit)) },
        { l: "Cash needed", v: $(r.cash), m: U.math(`down ${$(r.price + r.buyClose + r.rehab - r.loan)} + points/fees ${$(r.points + r.fees)} + interest ${$(r.interest)} + holding ${$(r.holding)}`, $(r.cash)) },
        { l: "ROI on cash", v: P(r.roi), m: U.math(`${$(r.profit)} ÷ ${$(r.cash)}`, P(r.roi)) },
        { l: "Annualized ROI", v: P(r.annRoi) }, { l: "Margin of ARV", v: P(r.margin), tone: r.margin >= 10 ? "good" : r.margin >= 5 ? "warn" : "bad" },
        { l: "Break-even sale price", v: $(r.breakEven), m: U.math(`(${$(r.total - r.selling)} + ${$(S.concessions)}) ÷ (1 − ${P(r.sellPct * 100)})`, $(r.breakEven)) },
        { l: `Max offer for ${U.$k(S.targetProfit)} profit`, v: $(max), tone: D.price <= max ? "good" : "bad", sub: "solved with every cost above" },
        { l: "Loan amount", v: $(r.loan), sub: `${$(r.pLoan)} purchase + ${$(r.rLoan)} rehab` }
      ]));
      App.slot("verdict", r.profit >= S.targetProfit ? U.verdict("good", "Meets your target", `${$(r.profit)} profit on ${$(r.cash)} of cash in ${r.months} months. You could pay up to ${$(max)}.`)
        : U.verdict(r.profit > 0 ? "warn" : "bad", r.profit > 0 ? "Below your target" : "Loses money", `To hit ${$(S.targetProfit)}, buy at ${$(max)} or less (${$(D.price - max)} below the current price).`));
      App.slot("wf", U.waterfall([{ l: "ARV sale", v: r.arv, type: "start" }, { l: "Purchase", v: -r.price }, { l: "Buy closing", v: -r.buyClose }, { l: "Rehab", v: -r.rehab }, { l: "Interest points fees", v: -r.finCost }, { l: "Holding", v: -r.holding }, { l: "Selling", v: -r.selling }, { l: "Profit", v: r.profit, type: "end" }]));
      /* capital curve */
      const m = r.months, rehabM = Math.max(1, Math.min(m - 1, Math.round(m * 0.55))), down0 = r.price + r.buyClose - r.pLoan + r.points + r.fees;
      const cashPts = [[0, down0]], monthlyCarry = r.holdM + (r.loan ? S.rate / 1200 * r.pLoan : 0), rehabOOP = (r.rehab - r.rLoan) / rehabM;
      let c = down0;
      for (let i = 1; i <= Math.ceil(m); i++) { const drawInt = r.loan ? S.rate / 1200 * r.rLoan * (S.dutch ? 1 : Math.min(1, i / rehabM)) : 0; c += monthlyCarry + drawInt + (i <= rehabM ? rehabOOP : 0); cashPts.push([Math.min(i, m), c]); }
      cashPts.push([m + 0.01, c - (r.arv - r.selling - r.loan)]); cashPts.push([m + 2, c - (r.arv - r.selling - r.loan)]);
      App._flipCap = { span: m + 2, phases: [{ a: 0, b: 0.6, l: "Buy", c: "var(--c2)" }, { a: 0.6, b: rehabM, l: "Rehab", c: "var(--c7)" }, { a: rehabM, b: m, l: "List & sell", c: "var(--c9)" }, { a: m, b: m + 2, l: "Profit", c: "var(--good)" }],
        lines: [{ l: "Your cash in", c: "var(--accent)", pts: cashPts, fill: 1 }, { l: "Loan balance", c: "var(--c1)", pts: [[0, r.pLoan], [rehabM, r.loan], [m, r.loan], [m + 0.01, 0], [m + 2, 0]] }] };
      const grid = [0, 10, 20].map(ov => [-10, -5, 0, 5].map(da => { const D2 = { ...D, arv: D.arv * (1 + da / 100), repairs: D.repairs * (1 + ov / 100) }; return F.flip(D2, S).profit; }));
      App.slot("grid", `<table class="tbl grid"><thead><tr><th>Rehab ↓ / ARV →</th>${[-10, -5, 0, 5].map(d => `<th>${d > 0 ? "+" : ""}${d}%</th>`).join("")}</tr></thead><tbody>${grid.map((row, i) => `<tr><th>${["On budget", "+10%", "+20%"][i]}</th>${row.map(v => `<td class="${v >= S.targetProfit ? "g" : v > 0 ? "w" : "b"}">${U.$k(v)}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="fine">Green meets your target, amber is profitable, red loses money.</p>`);
      App.slot("ledger", U.ledger([{ l: "Sale (ARV)", v: $(r.arv) }, { l: "Purchase", v: "−" + $(r.price) }, { l: "Buy closing", v: "−" + $(r.buyClose) }, { l: "Rehab", v: "−" + $(r.rehab) },
        { l: "Interest", v: "−" + $(r.interest), n: `${P(S.rate, 2)} × ${r.months} mo${S.dutch ? " · dutch" : " · on drawn funds"}` }, { l: "Points + fees", v: "−" + $(r.points + r.fees) },
        { l: "Holding", v: "−" + $(r.holding), n: `${$(r.holdM)}/mo` }, { l: "Selling", v: "−" + $(r.selling), n: P(r.sellPct * 100) + " + concessions" }, { l: "Net profit", v: $(r.profit), c: "total" }]));
    }
  });
})(window);
