/* REI Deal Lab — Tool Belt (formula calculators) + Motion Lab */
(function (G) {
  const { U, F, V, App } = G, $ = U.$, P = U.pct;
  const m = (k, l, v) => ({ k, l, t: "money", v }), pc = (k, l, v) => ({ k, l, t: "pct", v }), nm = (k, l, v, t = "num") => ({ k, l, t, v });

  /* each tool: id, t (title), c (category), f (formula), fields, calc(v) -> [[label, value, strong?]], why */
  const TOOLS = [
    { id: "pmt", t: "Mortgage payment (P&I)", c: "Payments", f: "P&I = L × r ÷ (1 − (1 + r)^−n)", fields: [m("loan", "Loan amount", 240000), pc("rate", "Rate", 7), nm("yrs", "Years", 30, "yrs")],
      calc: v => { const p = F.pmt(v.rate, v.yrs, v.loan); return [["Monthly P&I", U.$c(p), 1], ["Total interest", $(p * v.yrs * 12 - v.loan)], ["Total paid", $(p * v.yrs * 12)]]; },
      why: "r is the monthly rate (annual ÷ 12), n is the number of payments. On a 30-year loan at 7%, you pay more in interest than the loan amount." },
    { id: "piti", t: "Full PITI", c: "Payments", f: "PITI = P&I + taxes ÷ 12 + insurance ÷ 12 (+ PMI + HOA)", fields: [m("price", "Price", 300000), pc("down", "Down", 20), pc("rate", "Rate", 7), pc("tax", "Tax rate", 1.2), m("ins", "Insurance / yr", 1800), m("hoa", "HOA / mo", 0), pc("pmi", "PMI / yr", 0)],
      calc: v => { const L = v.price * (1 - v.down / 100), pi = F.pmt(v.rate, 30, L), t = v.price * v.tax / 1200, i = v.ins / 12, mi = L * v.pmi / 1200; return [["P&I", U.$c(pi)], ["Taxes", U.$c(t)], ["Insurance", U.$c(i)], ["PMI + HOA", U.$c(mi + v.hoa)], ["PITI(A)", U.$c(pi + t + i + mi + v.hoa), 1]]; },
      why: "Lenders qualify you on PITI, and tenants have to cover it. Taxes and insurance are the parts that change by state and city, and they often rise after you buy." },
    { id: "noi", t: "Net Operating Income", c: "Returns", f: "NOI = (gross rent − vacancy) − operating expenses", fields: [m("rent", "Rent / mo", 2000), m("other", "Other income / mo", 0), pc("vac", "Vacancy", 6), m("opex", "Operating expenses / mo", 750)],
      calc: v => { const g = (v.rent + v.other) * 12, e = g * (1 - v.vac / 100), n = e - v.opex * 12; return [["Gross potential", $(g)], ["Effective gross", $(e)], ["NOI / yr", $(n), 1], ["Expense ratio", P(v.opex * 12 / Math.max(1, e) * 100)]]; },
      why: "NOI never includes the mortgage. It's what the property earns on its own, which is why cap rates and DSCR are built on it." },
    { id: "cap", t: "Cap rate", c: "Valuation", f: "Cap = NOI ÷ value  ·  Value = NOI ÷ cap", fields: [m("noi", "NOI / yr", 14400), m("price", "Price", 200000), pc("target", "Market cap rate", 7)],
      calc: v => [["Cap rate", P(v.noi / Math.max(1, v.price) * 100, 2), 1], ["Value at market cap", $(v.noi / Math.max(.01, v.target / 100))], ["Each $1k of NOI adds", $(1000 / Math.max(.01, v.target / 100))]],
      why: "Cap rate is the unlevered yield. Flip it around and you see why raising rent or cutting expenses forces appreciation on income property." },
    { id: "coc", t: "Cash-on-cash return", c: "Returns", f: "CoC = annual pre-tax cash flow ÷ total cash invested", fields: [m("cf", "Cash flow / mo", 300), m("cash", "Cash invested", 70000)],
      calc: v => [["Annual cash flow", $(v.cf * 12)], ["Cash-on-cash", P(v.cf * 12 / Math.max(1, v.cash) * 100, 2), 1], ["Years to recoup", v.cf > 0 ? (v.cash / (v.cf * 12)).toFixed(1) : "never"]],
      why: "Total cash invested = down payment + closing + rehab + points. Many investors target 8–12% on rentals." },
    { id: "dscr", t: "DSCR & max loan", c: "Payments", f: "DSCR = NOI ÷ annual debt service", fields: [m("noi", "NOI / yr", 15000), m("debt", "Annual debt service", 12000), nm("min", "Lender minimum", 1.25), pc("rate", "Rate", 7.75)],
      calc: v => { const d = v.noi / Math.max(1, v.debt), maxPmt = v.noi / v.min / 12, r = v.rate / 1200, n = 360, maxL = r ? maxPmt * (1 - Math.pow(1 + r, -n)) / r : maxPmt * n; return [["DSCR", U.x(d), 1], ["Max payment at minimum", U.$c(maxPmt) + "/mo"], ["Max loan it supports", $(maxL)]]; },
      why: "DSCR lenders ignore your income and underwrite the property. Below 1.0 the rent doesn't cover the mortgage." },
    { id: "grm", t: "Gross rent multiplier", c: "Valuation", f: "GRM = price ÷ annual gross rent", fields: [m("price", "Price", 220000), m("rent", "Rent / mo", 1900), nm("target", "Area GRM", 9)],
      calc: v => [["GRM", (v.price / Math.max(1, v.rent * 12)).toFixed(2), 1], ["Price at area GRM", $(v.target * v.rent * 12)]],
      why: "A quick comparison tool for similar rentals. Lower GRM = more rent per dollar of price. It ignores expenses, so use it only to screen." },
    { id: "one", t: "1% & 2% rules", c: "Rules of thumb", f: "Monthly rent ÷ (price + rehab) ≥ 1%", fields: [m("all", "Price + rehab", 180000), m("rent", "Rent / mo", 1650)],
      calc: v => [["Rent-to-price", P(v.rent / Math.max(1, v.all) * 100, 2), 1], ["Rent for 1%", $(v.all * 0.01)], ["Max all-in at this rent", $(v.rent / 0.01)]],
      why: "A 30-second filter. Deals near 1% usually cash flow with normal financing; in high-tax states you may need more." },
    { id: "fifty", t: "50% rule cash flow", c: "Rules of thumb", f: "Cash flow ≈ rent × 50% − P&I", fields: [m("rent", "Rent / mo", 1800), m("pi", "P&I / mo", 1000)],
      calc: v => [["Est. operating costs", $(v.rent * 0.5)], ["Est. cash flow", U.mo(v.rent * 0.5 - v.pi), 1]],
      why: "Over time, operating expenses (taxes, insurance, vacancy, repairs, capex, management) average close to half the rent on single-family rentals." },
    { id: "seventy", t: "70% rule (MAO)", c: "Rules of thumb", f: "MAO = ARV × 70% − repairs − (wholesale fee)", fields: [m("arv", "ARV", 250000), m("rep", "Repairs", 40000), pc("pct", "Buyer %", 70), m("fee", "Wholesale fee", 0)],
      calc: v => [["Max allowable offer", $(v.arv * v.pct / 100 - v.rep - v.fee), 1], ["Left for costs + profit", $(v.arv * (1 - v.pct / 100))]],
      why: "The 30% is not profit: about 10% goes to financing, holding and selling, leaving 15–20% for the flipper's margin and risk." },
    { id: "ber", t: "Break-even occupancy", c: "Returns", f: "BE = (opex + debt service) ÷ gross potential income", fields: [m("opex", "Opex / yr", 9000), m("debt", "Debt service / yr", 13000), m("gpi", "Gross potential / yr", 26400)],
      calc: v => { const b = (v.opex + v.debt) / Math.max(1, v.gpi) * 100; return [["Break-even occupancy", P(b), 1], ["Vacancy you can absorb", P(100 - b)], ["Days vacant per year", U.num(365 * (100 - b) / 100)]]; },
      why: "Lenders like this under ~85%. It tells you how much vacancy the property can take before you feed it." },
    { id: "roi", t: "ROI & annualized ROI", c: "Returns", f: "ROI = profit ÷ cash  ·  annualized ≈ ROI × 12 ÷ months", fields: [m("profit", "Profit", 32000), m("cash", "Cash invested", 60000), nm("mo", "Months", 6, "mo")],
      calc: v => { const r = v.profit / Math.max(1, v.cash); return [["ROI", P(r * 100), 1], ["Annualized (simple)", P(r * 12 / Math.max(.1, v.mo) * 100)], ["Annualized (compound)", P((Math.pow(1 + r, 12 / Math.max(.1, v.mo)) - 1) * 100)]]; },
      why: "Compare deals of different lengths on an annual basis. Compound assumes you can redeploy at the same return, which is rarely true." },
    { id: "ltv", t: "LTV & CLTV", c: "Payments", f: "LTV = loan ÷ value  ·  CLTV = all liens ÷ value", fields: [m("v", "Value", 300000), m("l1", "1st lien", 210000), m("l2", "2nd lien", 20000)],
      calc: v => [["LTV", P(v.l1 / Math.max(1, v.v) * 100), 1], ["CLTV", P((v.l1 + v.l2) / Math.max(1, v.v) * 100)], ["Equity", $(v.v - v.l1 - v.l2)]],
      why: "Lenders cap LTV (75% for most investor cash-outs). In sub-to and seller-finance deals, CLTV tells you how much equity cushion you have." },
    { id: "bal", t: "Remaining loan balance", c: "Payments", f: "B = L(1+r)^k − PMT × ((1+r)^k − 1) ÷ r", fields: [m("loan", "Original loan", 200000), pc("rate", "Rate", 4), nm("yrs", "Term", 30, "yrs"), nm("k", "Payments made", 60)],
      calc: v => { const b = F.bal(v.rate, v.yrs, v.loan, v.k); return [["Balance", $(b), 1], ["Principal paid", $(v.loan - b)], ["Paid off", P((1 - b / Math.max(1, v.loan)) * 100)]]; },
      why: "Use it to verify a seller's payoff for sub-to deals, or project the balance at a balloon date." },
    { id: "points", t: "Points vs. rate break-even", c: "Payments", f: "Months = points cost ÷ monthly savings", fields: [m("loan", "Loan", 250000), pc("ra", "Rate without points", 7.25), pc("rb", "Rate with points", 6.75), pc("pts", "Points", 1.5)],
      calc: v => { const a = F.pmt(v.ra, 30, v.loan), b = F.pmt(v.rb, 30, v.loan), cost = v.loan * v.pts / 100, s = a - b; return [["Points cost", $(cost)], ["Monthly savings", U.$c(s)], ["Break-even", s > 0 ? (cost / s).toFixed(0) + " months" : "never", 1]]; },
      why: "If you'll refinance or sell before break-even (common on BRRRRs), don't buy down the rate." },
    { id: "refi", t: "Cash-out refinance", c: "Deal math", f: "Cash out = value × LTV − payoff − costs", fields: [m("v", "Appraised value", 240000), pc("ltv", "Max LTV", 75), m("pay", "Existing payoff", 150000), pc("cost", "Closing costs (% of loan)", 2.5)],
      calc: v => { const L = v.v * v.ltv / 100, c = L * v.cost / 100; return [["New loan", $(L)], ["Closing costs", $(c)], ["Cash to you", $(L - v.pay - c), 1]]; },
      why: "The R in BRRRR. Lenders base LTV on the appraisal, not your ARV estimate. Be conservative." },
    { id: "comps", t: "ARV from comps", c: "Valuation", f: "ARV = avg(adjusted comp $/sf) × subject sf", fields: [nm("sf", "Subject sq ft", 1450, "sqft"), m("p1", "Comp 1 sold", 238000), nm("s1", "Comp 1 sf", 1500, "sqft"), m("a1", "Comp 1 adj.", 0), m("p2", "Comp 2 sold", 229000), nm("s2", "Comp 2 sf", 1380, "sqft"), m("a2", "Comp 2 adj.", 5000), m("p3", "Comp 3 sold", 251000), nm("s3", "Comp 3 sf", 1620, "sqft"), m("a3", "Comp 3 adj.", -6000)],
      calc: v => { const ps = [[v.p1, v.s1, v.a1], [v.p2, v.s2, v.a2], [v.p3, v.s3, v.a3]].filter(c => c[0] > 0 && c[1] > 0).map(c => (c[0] + c[2]) / c[1]); const avg = ps.reduce((a, b) => a + b, 0) / Math.max(1, ps.length); return [["Adjusted $/sf", ps.map(x => $(x)).join(" · ")], ["Average $/sf", $(avg)], ["ARV estimate", $(avg * v.sf), 1], ["Spread low–high", ps.length ? `${$(Math.min(...ps) * v.sf)} – ${$(Math.max(...ps) * v.sf)}` : "—"]]; },
      why: "Adjust each comp toward the subject: + if the comp is worse (no garage, fewer baths), − if it's better (pool, finished basement). Use renovated, sold comps within 6 months." },
    { id: "irr", t: "IRR & equity multiple", c: "Returns", f: "Σ CFₜ ÷ (1 + IRR)^t = 0", fields: [m("c0", "Initial cash (enter positive)", 60000), m("c1", "Year 1 cash flow", 4000), m("c2", "Year 2", 4200), m("c3", "Year 3", 4400), m("c4", "Year 4", 4600), m("c5", "Year 5 + sale proceeds", 95000), pc("d", "Discount rate", 8)],
      calc: v => { const cfs = [-v.c0, v.c1, v.c2, v.c3, v.c4, v.c5]; return [["IRR", P(F.irr(cfs), 2), 1], ["NPV @ " + v.d + "%", $(F.npv(v.d, cfs))], ["Equity multiple", U.x((v.c1 + v.c2 + v.c3 + v.c4 + v.c5) / Math.max(1, v.c0))]]; },
      why: "IRR accounts for timing: a dollar back in year 1 is worth more than one in year 5. Equity multiple ignores timing, so read the two together." },
    { id: "dep", t: "Depreciation tax shield", c: "Tax", f: "Annual depreciation = (basis − land) ÷ 27.5", fields: [m("basis", "Purchase + improvements", 220000), pc("land", "Land share", 20), pc("br", "Tax bracket", 24), { k: "life", l: "Recovery period", t: "sel", v: 27.5, opts: [[27.5, "27.5 yrs · residential"], [39, "39 yrs · commercial"]] }],
      calc: v => { const d = v.basis * (1 - v.land / 100) / v.life; return [["Depreciation / yr", $(d), 1], ["Tax saved / yr", $(d * v.br / 100)], ["Shelters cash flow of", U.mo(d / 12)]]; },
      why: "Depreciation is a paper loss that offsets rental income. It's recaptured (up to 25%) when you sell unless you 1031 exchange. Talk to a CPA." },
    { id: "fv", t: "Appreciation & Rule of 72", c: "Valuation", f: "FV = PV × (1 + g)^t  ·  doubling ≈ 72 ÷ g", fields: [m("pv", "Value today", 250000), pc("g", "Annual growth", 3.5), nm("t", "Years", 10, "yrs")],
      calc: v => [["Future value", $(v.pv * Math.pow(1 + v.g / 100, v.t)), 1], ["Gain", $(v.pv * (Math.pow(1 + v.g / 100, v.t) - 1))], ["Years to double", (72 / Math.max(.01, v.g)).toFixed(1)]],
      why: "Appreciation is the profit center you control least. Treat it as upside, not the reason a deal works." },
    { id: "hold", t: "Holding cost per month", c: "Deal math", f: "Carry = interest + taxes + insurance + utilities + HOA", fields: [m("loan", "Loan", 180000), pc("rate", "Rate", 11.5), m("tax", "Taxes / yr", 3200), m("ins", "Insurance / yr", 1800), m("util", "Utilities / mo", 250), m("hoa", "HOA / mo", 0)],
      calc: v => { const c = v.loan * v.rate / 1200 + v.tax / 12 + v.ins / 12 + v.util + v.hoa; return [["Per month", $(c), 1], ["Per day", $(c / 30.4)], ["3 extra months cost", $(c * 3)]]; },
      why: "This is what every day of delay costs on a flip. Use it to decide whether paying a contractor more to finish faster pays off." },
    { id: "sfn", t: "Seller-finance note", c: "Deal math", f: "Balloon = balance after B years", fields: [m("price", "Price", 200000), pc("down", "Down", 10), pc("rate", "Rate", 5), nm("am", "Amortization", 30, "yrs"), nm("bl", "Balloon", 7, "yrs")],
      calc: v => { const L = v.price * (1 - v.down / 100), p = F.pmt(v.rate, v.am, L); return [["Payment", U.$c(p), 1], ["Balloon due", $(F.bal(v.rate, v.am, L, v.bl * 12))], ["Interest to balloon", $(p * v.bl * 12 - (L - F.bal(v.rate, v.am, L, v.bl * 12)))]]; },
      why: "The longer the amortization and the lower the rate, the lower your payment. The balloon is the risk: plan how you'll pay it." },
    { id: "maxp", t: "Max price for target cash flow", c: "Deal math", f: "Solve price where cash flow = target", fields: [m("rent", "Rent / mo", 2000), pc("opex", "Opex excl. taxes & ins (% rent)", 27), pc("tax", "Tax rate", 1.4), m("ins", "Insurance / yr", 1800), pc("rate", "Rate", 7.25), pc("down", "Down", 25), m("target", "Target cash flow / mo", 200)],
      calc: v => { const cf = p => v.rent * (1 - v.opex / 100) - p * v.tax / 1200 - v.ins / 12 - F.pmt(v.rate, 30, p * (1 - v.down / 100)); const x = F.solve(cf, 0, 5e6, v.target); return [["Max purchase price", $(x), 1], ["At that price, cash in", $(x * v.down / 100 * 1.1)], ["Rent-to-price", isFinite(x) ? P(v.rent / x * 100, 2) : "—"]]; },
      why: "Work backward from the cash flow you want to the price you can pay. This is how pros set their offer before they talk to the seller." },
    { id: "door", t: "Price per door & per sq ft", c: "Valuation", f: "$/door = price ÷ units  ·  $/sf = price ÷ sq ft", fields: [m("price", "Price", 520000), nm("u", "Units", 4), nm("sf", "Total sq ft", 3600, "sqft")],
      calc: v => [["Per door", $(v.price / Math.max(1, v.u)), 1], ["Per sq ft", $(v.price / Math.max(1, v.sf))]],
      why: "Small multifamily is often compared per door. Combine it with rent per door to sanity-check the price." },
    { id: "lev", t: "Positive vs. negative leverage", c: "Returns", f: "Leverage helps when cap rate > loan constant", fields: [pc("cap", "Cap rate", 7), pc("rate", "Loan rate", 7.25), nm("yrs", "Amortization", 30, "yrs")],
      calc: v => { const k = F.pmt(v.rate, v.yrs, 100) * 12; return [["Loan constant", P(k, 2)], ["Spread", P(v.cap - k, 2), 1], ["Verdict", v.cap > k ? "Debt boosts your return" : "Debt drags your return"]]; },
      why: "Loan constant = annual debt service ÷ loan. When it's higher than the cap rate, every borrowed dollar earns less than it costs, so CoC falls as you borrow more." }
  ];
  App.TOOLS = TOOLS;

  App.reg({
    id: "toolbelt", nav: "Tool Belt",
    render(root) {
      const D = App.D; D.tb = D.tb || {};
      TOOLS.forEach(t => { D.tb[t.id] = D.tb[t.id] || {}; t.fields.forEach(f => { if (D.tb[t.id][f.k] == null) D.tb[t.id][f.k] = f.v; }); });
      const cats = [...new Set(TOOLS.map(t => t.c))];
      root.innerHTML = `<header class="mh"><div class="mh-txt"><p class="eyebrow">Learn & train</p><h1>Tool Belt</h1><p class="lede">${TOOLS.length} calculators every acquisitions rep uses, each with the formula, live math, and why it matters. They run on their own numbers, separate from your deal.</p></div></header>
        <div class="tb-bar"><input id="tbSearch" type="search" placeholder="Search formulas: cap, DSCR, balloon…" aria-label="Search calculators"><div class="chips" id="tbCats"><button type="button" class="cb on" data-cat="">All</button>${cats.map(c => `<button type="button" class="cb" data-cat="${c}">${c}</button>`).join("")}</div></div>
        <div class="tb-grid">${TOOLS.map(t => `<article class="tool card" data-id="${t.id}" data-cat="${t.c}" data-q="${U.esc((t.t + " " + t.f + " " + t.c).toLowerCase())}">
          <div class="card-h"><h3>${t.t}</h3><span class="tag">${t.c}</span></div><code class="fx-line">${t.f}</code>
          <div class="tool-in">${t.fields.map(f => U.field({ ...f, k: `tb.${t.id}.${f.k}` }, D.tb[t.id][f.k])).join("")}</div>
          <div class="tool-out" data-slot="tb-${t.id}"></div><details><summary>Why it matters</summary><p>${t.why}</p></details></article>`).join("")}</div>`;
      let cat = "";
      const filter = () => { const q = root.querySelector("#tbSearch").value.toLowerCase().trim(); root.querySelectorAll(".tool").forEach(el => el.hidden = !((!cat || el.dataset.cat === cat) && (!q || el.dataset.q.includes(q)))); };
      root.querySelector("#tbSearch").addEventListener("input", filter);
      root.querySelector("#tbCats").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; cat = b.dataset.cat; root.querySelectorAll("#tbCats .cb").forEach(x => x.classList.toggle("on", x === b)); filter(); });
    },
    update() { const D = App.D; TOOLS.forEach(t => { const v = {}; t.fields.forEach(f => v[f.k] = +D.tb[t.id][f.k] || 0); let rows; try { rows = t.calc(v); } catch (e) { rows = [["Error", "Check inputs"]]; }
      App.slot("tb-" + t.id, rows.map(r => `<div class="to-r${r[2] ? " hi" : ""}"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")); }); }
  });

  /* ================= MOTION LAB ================= */
  App.reg({
    id: "motion", nav: "Motion Lab",
    render(root) {
      const D = App.D;
      D.ml = Object.assign({ rent: D.rent, price: D.price + D.repairs, rate: D.rate + 0.375, down: 25, loan: 200000, arate: 7, term: 30, lprice: 250000, lappr: 4, lyrs: 5, lrate: 7.25, flipMo: 6 }, D.ml || {});
      const sec = (id, title, lede, inputs, body) => `<section class="lab card" id="lab-${id}"><div class="lab-h"><h2>${title}</h2><p>${lede}</p></div><div class="lab-b"><div class="lab-in">${inputs}</div><div class="lab-out">${body}</div></div></section>`;
      root.innerHTML = `<header class="mh"><div class="mh-txt"><p class="eyebrow">Learn & train</p><h1>Motion Lab</h1><p class="lede">Drag the sliders and watch the money move. Each experiment isolates one idea investors argue about, so you build the intuition instead of memorizing it.</p>${App.marketStrip()}</div></header>
        ${sec("river", "1 · Where the rent goes", "Every dollar of rent splits into streams. Push the price or rate up and watch the cash-flow stream thin out, then go negative and start pulling from your pocket.",
          [U.field({ k: "ml.rent", l: "Rent", t: "money", s: 1, min: 500, max: 5000, step: 25 }, D.ml.rent), U.field({ k: "ml.price", l: "All-in price", t: "money", s: 1, min: 50000, max: 600000, step: 5000 }, D.ml.price), U.field({ k: "ml.rate", l: "Rate", t: "pct", s: 1, min: 3, max: 11, step: 0.125 }, D.ml.rate), U.field({ k: "ml.down", l: "Down", t: "pct", s: 1, min: 0, max: 100, step: 5 }, D.ml.down)].join(""),
          `<canvas id="mlRiver" style="height:340px" aria-label="Rent flow animation"></canvas><div data-slot="ml-river"></div>`)}
        ${sec("tide", "2 · The amortization tide", "Early payments are mostly interest; the principal share grows every year. Scrub the timeline to see when your tenant really starts buying you equity.",
          [U.field({ k: "ml.loan", l: "Loan", t: "money", s: 1, min: 50000, max: 800000, step: 5000 }, D.ml.loan), U.field({ k: "ml.arate", l: "Rate", t: "pct", s: 1, min: 2, max: 12, step: 0.125 }, D.ml.arate), U.field({ k: "ml.term", l: "Term", t: "seg", opts: [[15, "15 yr"], [20, "20 yr"], [30, "30 yr"]] }, D.ml.term)].join(""),
          `<canvas id="mlTide" style="height:300px" aria-label="Amortization animation"></canvas><div data-slot="ml-tide"></div>`)}
        ${sec("lev", "3 · The leverage lens", "Same house, three ways to pay for it. Leverage multiplies appreciation on your cash, but when the loan constant beats the cap rate, it also shrinks or flips your cash flow.",
          [U.field({ k: "ml.lprice", l: "Price", t: "money", s: 1, min: 80000, max: 700000, step: 5000 }, D.ml.lprice), U.field({ k: "ml.lappr", l: "Appreciation / yr", t: "pct", s: 1, min: -3, max: 10, step: 0.5 }, D.ml.lappr), U.field({ k: "ml.lrate", l: "Loan rate", t: "pct", s: 1, min: 3, max: 11, step: 0.125 }, D.ml.lrate), U.field({ k: "ml.lyrs", l: "Hold", t: "yrs", s: 1, min: 1, max: 15, step: 1 }, D.ml.lyrs)].join(""),
          `<div data-slot="ml-lev"></div>`)}
        ${sec("wealth", "4 · Four wealth engines", "Your Buy & Hold deal over 30 years: cash flow, principal paydown, appreciation and depreciation tax savings stacked up. Notice which engine takes over after year 10.",
          `<p class="fine">Uses the deal and Buy & Hold settings. Change them on the <button type="button" class="link" data-go="rental">Buy & Hold tab</button>.</p>`,
          `<canvas id="mlWealth" style="height:320px" aria-label="Wealth engines animation"></canvas>`)}
        ${sec("clock", "5 · The flip clock", "Every month a flip sits, carrying costs eat the margin. Slide the timeline to see how fast a good deal becomes a bad one.",
          U.field({ k: "ml.flipMo", l: "Months to sell", t: "mo", s: 1, min: 1, max: 18, step: 0.5 }, D.ml.flipMo), `<div data-slot="ml-clock"></div>`)}`;
      V.flow(root.querySelector("#mlRiver"), () => App._mlRiver);
      V.amort(root.querySelector("#mlTide"), () => App._mlTide);
      V.stackArea(root.querySelector("#mlWealth"), () => App._mlWealth);
    },
    update() {
      const D = App.D, L = D.ml, R = App.S("rental");
      const r1 = F.rental({ ...D, price: L.price, rent: L.rent, asIs: L.price }, { ...R, price: L.price, useDealRepairs: false, rehab: 0, down: L.down, rate: L.rate, type: L.down >= 100 ? "cash" : "conv", pmi: L.down < 20 ? R.pmi : 0 });
      App._mlRiver = G.river(r1.ox.gpi, r1.ox.items, r1.L.loan, L.rate, r1.L.pi, r1.L.mi, r1.cfM, r1.ox.vac);
      App.slot("ml-river", U.kpis([{ l: "Cash flow", v: U.mo(r1.cfM), tone: r1.cfM >= 0 ? "good" : "bad" }, { l: "Rent-to-price", v: P(r1.onePct, 2) }, { l: "CoC", v: P(r1.coc) }, { l: "DSCR", v: U.x(r1.dscr) }]));
      const rows = F.amort(L.arate, L.term, L.loan);
      App._mlTide = { rows, loan: L.loan };
      const tot = rows.reduce((s, x) => s + x.interest, 0), cross = rows.find(x => x.principal > x.interest);
      App.slot("ml-tide", U.kpis([{ l: "Monthly P&I", v: U.$c(F.pmt(L.arate, L.term, L.loan)) }, { l: "Lifetime interest", v: $(tot), sub: P(tot / L.loan * 100, 0) + " of the loan" },
        { l: "Principal > interest from", v: cross ? "Year " + cross.yr : "Never", sub: "the crossover point" }, { l: "Paid off after 5 yrs", v: P((1 - F.bal(L.arate, L.term, L.loan, 60) / L.loan) * 100) }]));
      /* leverage lens */
      const M = App.M(), rent = L.lprice * 0.0085, taxIns = L.lprice * M.taxRate / 1200 + M.insAnnual / 12, opex = rent * 0.27 + taxIns, noiA = (rent * 0.94 - opex) * 12, cap = noiA / L.lprice * 100;
      const scen = [[100, "All cash"], [25, "25% down"], [10, "10% down"]].map(([dp, lbl]) => {
        const loan = L.lprice * (1 - dp / 100), pi = F.pmt(L.lrate, 30, loan), mi = dp < 20 ? loan * 0.006 / 12 : 0, cash = L.lprice * dp / 100 + L.lprice * 0.03;
        const cfA = noiA - (pi + mi) * 12, val = L.lprice * Math.pow(1 + L.lappr / 100, L.lyrs), bal = F.bal(L.lrate, 30, loan, L.lyrs * 12);
        const gain = cfA * L.lyrs + (val * 0.93 - bal) - (L.lprice - loan) - L.lprice * 0.03;
        return { lbl, cash, cfM: cfA / 12, coc: cfA / cash * 100, roi: gain / cash * 100, ann: (Math.pow(Math.max(0.0001, 1 + gain / cash), 1 / L.lyrs) - 1) * 100 };
      });
      const k = F.pmt(L.lrate, 30, 100) * 12;
      App.slot("ml-lev", `<div class="lev">${scen.map((s, i) => `<div class="lev-col" style="--i:${i}"><b>${s.lbl}</b><div class="lev-bar"><i class="${s.roi >= 0 ? "pos" : "neg"}" style="height:${Math.min(100, Math.abs(s.roi) / Math.max(...scen.map(x => Math.abs(x.roi)), 1) * 100)}%"></i></div>
          <span class="lev-v">${P(s.ann)}<small>annualized</small></span><span>Cash in ${U.$k(s.cash)}</span><span class="${s.cfM >= 0 ? "pos" : "neg"}">${U.mo(s.cfM)}</span><span>CoC ${P(s.coc)}</span></div>`).join("")}</div>
        ${U.verdict(cap > k ? "good" : "warn", `Cap rate ${P(cap, 2)} vs loan constant ${P(k, 2)}`, cap > k ? "Positive leverage: borrowed money earns more than it costs, so cash-on-cash rises as you borrow." : "Negative leverage: each borrowed dollar costs more than the property yields. Borrowing boosts total return only through appreciation, and cash flow gets worse.")}
        <p class="fine">Assumes rent at 0.85% of price, 27% opex + this market's taxes and insurance, 7% selling costs, 3% closing. Total return includes cash flow, paydown and appreciation after ${L.lyrs} years.</p>`);
      const pr = F.rental(D, R).proj; let cp = 0, cpd = 0, ca = 0, ct = 0;
      App._mlWealth = { years: 30, layers: [{ l: "Cash flow", c: "var(--good)", vals: pr.map(p => cp += Math.max(0, p.cf)) }, { l: "Principal paydown", c: "var(--c2)", vals: pr.map(p => cpd += p.paydown) }, { l: "Appreciation", c: "var(--c3)", vals: pr.map(p => ca += p.appr) }, { l: "Tax savings", c: "var(--c4)", vals: pr.map(p => ct += p.tax) }] };
      const fs = App.S("flip"), pts = []; for (let mo = 1; mo <= 18; mo += 0.5) pts.push([mo, F.flip(D, { ...fs, months: mo }).profit]);
      const at = F.flip(D, { ...fs, months: L.flipMo }), base = F.flip(D, { ...fs, months: 4 });
      App.slot("ml-clock", U.line([{ name: "Flip profit", c: "var(--accent)", area: 1, pts }, { name: "Your pick", c: "var(--fg)", pts: [[L.flipMo, at.profit], [L.flipMo + 0.01, at.profit]] }], { xfmt: v => v + " mo", xticks: [1, 6, 12, 18], h: 220 }) +
        U.kpis([{ l: `Profit at ${L.flipMo} months`, v: $(at.profit), tone: at.profit > 0 ? "good" : "bad" }, { l: "Carry per month", v: $(at.holdM + (at.loan ? fs.rate / 1200 * at.loan : 0)) }, { l: "Lost vs. a 4-month flip", v: $(base.profit - at.profit) }]));
    }
  });
})(window);
