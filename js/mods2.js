/* REI Deal Lab — Buy & Hold, BRRRR, Subject-To, Seller Finance, Lease Option */
(function (G) {
  const { U, F, V, App } = G, $ = U.$, P = U.pct;
  const opexFields = id => [
    { k: `s.${id}.vac`, l: "Vacancy", t: "pct", s: 1, min: 0, max: 20, step: 0.5, hint: "Share of gross rent lost to turnover. 5–8% is typical for SFR; one month a year ≈ 8.3%." },
    { k: `s.${id}.maint`, l: "Repairs & maintenance", t: "pct", s: 1, min: 0, max: 20, step: 0.5, hint: "% of gross rent. Older homes 8–10%." },
    { k: `s.${id}.capex`, l: "CapEx reserve", t: "pct", s: 1, min: 0, max: 20, step: 0.5, hint: "Saving for roof, HVAC, water heater, flooring replacements." },
    { k: `s.${id}.mgmt`, l: "Property management", t: "pct", s: 1, min: 0, max: 14, step: 0.5, hint: "% of collected rent. 8–10% plus leasing fees is common. Keep it in even if you self-manage." }
  ];
  /* flow data for the cash-flow river */
  const river = (rent, items, loan, ratePct, pi, mi, cf, vac) => {
    const intM = loan * ratePct / 1200, prin = Math.max(0, pi - intM);
    const dst = [{ l: "Vacancy", v: vac, c: "var(--c6)" }, { l: "Interest", v: Math.min(pi, intM), c: "var(--c1)" }, { l: "Principal (equity)", v: prin, c: "var(--c2)" }];
    if (mi > 0) dst.push({ l: "Mortgage ins.", v: mi, c: "var(--c5)" });
    const map = { tax: ["Taxes", "var(--c3)"], ins: ["Insurance", "var(--c4)"], hoa: ["HOA", "var(--c5)"], maint: ["Repairs", "var(--c7)"], capex: ["CapEx", "var(--c8)"], mgmt: ["Management", "var(--c9)"], util: ["Utilities", "var(--c6)"], otherx: ["Other", "var(--c6)"] };
    items.forEach(i => { if (i.m > 0.5) dst.push({ l: map[i.k][0], v: i.m, c: map[i.k][1] }); });
    if (cf > 0) dst.push({ l: "Cash flow", v: cf, c: "var(--good)" });
    const src = [{ l: "Rent", v: rent, c: "var(--c2)" }]; if (cf < 0) src.push({ l: "Your pocket", v: -cf, c: "var(--bad)" });
    return { src, dst, unit: "/mo" };
  };
  G.river = river;

  /* ================= BUY & HOLD ================= */
  App.reg({
    id: "rental", nav: "Buy & Hold",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Hold", title: "Buy & Hold",
        lede: "Underwrite a long-term rental the way a lender and a seasoned landlord would: full PITI, every operating reserve, and the four ways a rental makes you money.",
        inputs: U.fieldset("Deal", [...App.basics(["price", "asIs", "rent"]), { k: "s.rental.useDealRepairs", l: "Include full repair budget", t: "tog" }, { k: "s.rental.rehab", l: "Make-ready repairs (if not full)", t: "money" }, { k: "s.rental.closingPct", l: "Buyer closing costs", t: "pct" }], D) +
          U.fieldset("Loan", [
            { k: "s.rental.type", l: "Loan type", t: "seg", opts: [["conv", "Conventional"], ["dscr", "DSCR"], ["fha", "FHA hack"], ["cash", "Cash"]] },
            { k: "s.rental.down", l: "Down payment", t: "pct", s: 1, min: 0, max: 100, step: 0.5 }, { k: "s.rental.rate", l: "Interest rate", t: "pct", s: 1, min: 2, max: 12, step: 0.125 },
            { k: "s.rental.term", l: "Term", t: "yrs" }, { k: "s.rental.points", l: "Points", t: "pct" }, { k: "s.rental.pmi", l: "PMI (conv < 20% down)", t: "pct" }, { k: "s.rental.mip", l: "FHA annual MIP", t: "pct" }
          ], D) +
          U.fieldset("Operating", [...opexFields("rental"), { k: "s.rental.util", l: "Owner-paid utilities / mo", t: "money" }, { k: "s.rental.otherExp", l: "Other expenses / mo", t: "money" }, { k: "s.rental.otherInc", l: "Other income / mo", t: "money", hint: "Pet rent, laundry, storage, parking." }, App.basics(["hoa"])[0]], D) +
          U.fieldset("Long-term", [{ k: "s.rental.hold", l: "Hold period", t: "yrs", s: 1, min: 1, max: 30, step: 1 }, { k: "s.rental.appr", l: "Appreciation", t: "pct" }, { k: "s.rental.rentGrowth", l: "Rent growth", t: "pct" }, { k: "s.rental.expGrowth", l: "Tax & insurance growth", t: "pct" },
            { k: "s.rental.sellCost", l: "Selling costs at exit", t: "pct" }, { k: "s.rental.landPct", l: "Land share (not depreciable)", t: "pct" }, { k: "s.rental.bracket", l: "Your tax bracket", t: "pct" }], D),
        results: `<div data-slot="kpis"></div><div data-slot="rules"></div>
          ${App.vizCard("Where the rent goes", "rentFlow", "Month one · live as you change inputs", 340)}
          <div class="two">${App.card("Monthly operating statement", "ledger")}${App.card("Year-one return: four profit centers", "four")}</div>
          ${App.card("Hold projection", "proj", `<span class="sub" data-slot="projsub"></span>`)}
          ${App.card("Stress test", "stress", `<span class="sub">Cash flow if one thing goes wrong</span>`)}`,
        playbook: {
          what: "A buy-and-hold rental pays you four ways: monthly cash flow, principal paydown by your tenant, appreciation, and depreciation that shelters income from tax. Cash flow is the one that keeps you solvent; underwrite it conservatively and treat the rest as upside.",
          when: ["You want long-term wealth and can absorb vacancies and repairs", "Rent-to-price ratio supports positive cash flow at today's rates", "The neighborhood has stable or growing demand (jobs, schools, low vacancy)"],
          steps: ["Verify market rent with 3+ active and leased comps", "Get the real tax bill and an insurance quote", "Underwrite with reserves for vacancy, repairs, capex and management", "Check DSCR ≥ 1.20–1.25 and cash-on-cash vs your target", "Inspect, close, make-ready, screen tenants", "Review rents yearly; refinance or 1031 exchange when it makes sense"],
          fx: [["NOI = effective gross income − operating expenses", "Excludes the mortgage"], ["Cash flow = NOI − debt service", ""], ["CoC = annual cash flow ÷ cash invested", ""], ["Cap rate = NOI ÷ price", ""], ["DSCR = NOI ÷ annual debt service", "Lenders want ≥ 1.20–1.25"], ["GRM = price ÷ annual gross rent", ""], ["Break-even ratio = (opex + debt) ÷ gross income", "Under 85% is healthy"]],
          flags: ["The 50% and 1% rules are filters, not underwriting", "Property taxes often jump after a sale reassessment", "Insurance in coastal and hail states has risen fast; get quotes", "FHA requires you to live there 12 months and limits you to one FHA loan at a time (with exceptions)"]
        }
      });
      V.flow(root.querySelector("#rentFlow"), () => App._rentFlow);
    },
    onChange(path, v) {
      if (path !== "s.rental.type") return;
      const S = App.S("rental"), D = App.D;
      if (v === "conv") Object.assign(S, { down: 25, rate: +(D.rate + 0.375).toFixed(3), points: 0 });
      if (v === "dscr") Object.assign(S, { down: 25, rate: +(D.rate + 0.875).toFixed(3), points: 1 });
      if (v === "fha") { Object.assign(S, { down: 3.5, rate: +(D.rate - 0.5).toFixed(3), points: 0 }); if (!D.owner) { D.owner = true; App.toast("FHA requires owner-occupancy. Switched taxes to homestead rates."); } }
      if (v === "cash") Object.assign(S, { down: 100, points: 0 });
    },
    update() {
      const D = App.D, S = App.S("rental"), r = F.rental(D, S);
      App.slot("kpis", U.kpis([
        { l: "Monthly cash flow", v: U.mo(r.cfM), big: 1, tone: r.cfM >= 200 ? "good" : r.cfM >= 0 ? "warn" : "bad", m: U.math(`NOI ${$(r.ox.noiM)} − P&I ${$(r.L.pi)}${r.L.mi ? " − MI " + $(r.L.mi) : ""}`, U.$c(r.cfM)) },
        { l: "Cash-on-cash", v: P(r.coc), tone: U.tone(r.coc, 8, 4), m: U.math(`${$(r.cfA)} ÷ ${$(r.cash)}`, P(r.coc)) },
        { l: "Cap rate", v: P(r.cap), m: U.math(`NOI ${$(r.noiA)} ÷ price ${$(r.price)}`, P(r.cap)), sub: `Yield on cost ${P(r.yoc)}` },
        { l: "DSCR", v: U.x(r.dscr), tone: r.dscr >= 1.25 ? "good" : r.dscr >= 1 ? "warn" : "bad", m: U.math(`${$(r.ox.noiM)} ÷ ${$(r.debtM)}`, U.x(r.dscr)) },
        { l: "PITI(A)", v: U.mo(r.piti), m: U.math(`P&I ${$(r.L.pi)} + T ${$(r.taxM)} + I ${$(r.insM)} + MI ${$(r.L.mi)} + HOA ${$(+D.hoa || 0)}`, U.$c(r.piti)) },
        { l: "Cash invested", v: $(r.cash), m: U.math(`down ${$(r.L.down)} + closing ${$(r.closing)} + rehab ${$(r.rehab)} + points ${$(r.L.points)}`, $(r.cash)) },
        { l: `${r.yrs}-yr IRR`, v: P(r.irr), tone: U.tone(r.irr, 12, 7), sub: `Equity multiple ${U.x(r.em)}` },
        { l: "Year-1 total ROI", v: P(r.roi1), sub: "all four profit centers" }
      ]));
      const rules = [["1% rule", r.onePct >= 1, P(r.onePct, 2)], ["50% rule", r.fiftyCF > 0, U.mo(r.fiftyCF)], ["DSCR ≥ 1.25", r.dscr >= 1.25, U.x(r.dscr)], ["CoC ≥ 8%", r.coc >= 8, P(r.coc)], ["Break-even < 85%", r.ber < 85, P(r.ber)], ["GRM", r.grm <= 10, r.grm.toFixed(1)]];
      App.slot("rules", `<div class="rules">${rules.map(x => U.pill(`${x[1] ? "✓" : "✕"} ${x[0]} <b>${x[2]}</b>`, x[1] ? "good" : "bad")).join("")}</div>`);
      App._rentFlow = river(r.ox.gpi, r.ox.items, r.L.loan, S.rate, r.L.pi, r.L.mi, r.cfM, r.ox.vac);
      App.slot("ledger", U.ledger([
        { l: "Gross scheduled rent", v: U.$c(r.ox.gpi) }, { l: "Vacancy", v: "−" + U.$c(r.ox.vac), n: P(S.vac) }, { l: "Effective gross income", v: U.$c(r.ox.egi), c: "sub" },
        ...r.ox.items.filter(i => i.m > 0).map(i => ({ l: i.label, v: "−" + U.$c(i.m) })), { l: "Net operating income", v: U.$c(r.ox.noiM), c: "sub" },
        { l: "Principal & interest", v: "−" + U.$c(r.L.pi) }, ...(r.L.mi ? [{ l: "Mortgage insurance", v: "−" + U.$c(r.L.mi) }] : []), { l: "Cash flow", v: U.$c(r.cfM), c: "total" }]));
      App.slot("four", U.barsH([{ l: "Cash flow", v: r.y1.cf, c: "var(--good)" }, { l: "Principal paydown", v: r.y1.paydown, c: "var(--c2)" }, { l: "Appreciation", v: r.y1.appr, c: "var(--c3)" }, { l: "Tax savings", v: r.y1.tax, c: "var(--c4)", tag: "est." }], { lw: 128 }) +
        `<p class="fine">Tax savings ≈ (all-in × ${100 - S.landPct}% building) ÷ 27.5 yrs = ${$(r.depA)}/yr depreciation × ${S.bracket}% bracket. Confirm with your CPA.</p>`);
      const pr = r.proj.slice(0, Math.max(5, r.yrs));
      App.slot("projsub", `Sale after year ${r.yrs} nets ${$(r.saleNet)}`);
      App.slot("proj", U.line([
        { name: "Property value", c: "var(--c3)", pts: [[0, r.value0], ...pr.map(p => [p.y, p.value])] },
        { name: "Loan balance", c: "var(--c1)", pts: [[0, r.L.loan], ...pr.map(p => [p.y, p.bal])], dash: 1 },
        { name: "Equity", c: "var(--c2)", area: 1, pts: [[0, r.value0 - r.L.loan], ...pr.map(p => [p.y, p.equity])] },
        { name: "Cumulative cash flow", c: "var(--good)", pts: [[0, 0], ...pr.map(p => [p.y, p.cumCF])] }
      ], { xfmt: v => "Y" + v }));
      const St = (lbl, d, s) => [lbl, F.rental({ ...D, ...d }, { ...S, ...s }).cfM];
      const M = App.M();
      const st = [St("Base case", {}, {}), St("Rent −10%", { rent: D.rent * 0.9 }, {}), St("Vacancy +5 pts", {}, { vac: S.vac + 5 }), St("Rate +1%", {}, { rate: S.rate + 1 }), St("Repairs + capex +4 pts", {}, { maint: S.maint + 2, capex: S.capex + 2 }), St("Taxes +20%", { taxAuto: false, taxRate: M.taxRate * 1.2 }, {}), St("Insurance +30%", { insAuto: false, insAnnual: M.insAnnual * 1.3 }, {})];
      App.slot("stress", U.barsH(st.map(s => ({ l: s[0], v: s[1], c: s[1] >= 0 ? "var(--good)" : "var(--bad)" })), { lw: 170, fmt: v => U.$(v) + "/mo" }));
    }
  });

  /* ================= BRRRR ================= */
  App.reg({
    id: "brrrr", nav: "BRRRR",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Hold", title: "BRRRR",
        lede: "Buy, Rehab, Rent, Refinance, Repeat. Force appreciation with the rehab, then refinance against the new value to pull your capital back out and do it again.",
        inputs: U.fieldset("Deal", App.basics(["price", "arv", "rent", "repairs"]), D) +
          U.fieldset("Buy & rehab financing", [{ k: "s.brrrr.acq", l: "Acquire with", t: "seg", opts: [["hml", "Hard money"], ["cash", "Cash"]] },
            { k: "s.brrrr.ltc", l: "Purchase financed", t: "pct" }, { k: "s.brrrr.rehabPct", l: "Rehab financed", t: "pct" }, { k: "s.brrrr.rate", l: "Hard-money rate", t: "pct" }, { k: "s.brrrr.points", l: "Points", t: "pct" }, { k: "s.brrrr.lenderFees", l: "Lender fees", t: "money" }, { k: "s.brrrr.closingPct", l: "Buy closing costs", t: "pct" }], D) +
          U.fieldset("Timeline", [{ k: "s.brrrr.rehabMonths", l: "Rehab months", t: "mo", s: 1, min: 1, max: 12, step: 0.5 }, { k: "s.brrrr.leaseUp", l: "Months to lease up", t: "mo" }, { k: "s.brrrr.monthsToRefi", l: "Months until refinance", t: "mo", s: 1, min: 2, max: 14, step: 1, hint: "Most cash-out lenders require 6–12 months of title seasoning. Delayed financing (cash buyers) can refi sooner." }, { k: "s.brrrr.utilities", l: "Utilities while vacant / mo", t: "money" }], D) +
          U.fieldset("Refinance", [{ k: "s.brrrr.refiLtv", l: "Cash-out LTV", t: "seg", opts: [[70, "70%"], [75, "75%"], [80, "80%"]] }, { k: "s.brrrr.refiRate", l: "Refi rate", t: "pct", s: 1, min: 4, max: 11, step: 0.125 }, { k: "s.brrrr.refiTerm", l: "Term", t: "yrs" }, { k: "s.brrrr.refiCostPct", l: "Refi closing costs (% of loan)", t: "pct" },
            { k: "s.brrrr.taxBasis", l: "Tax basis after rehab", t: "seg", opts: [["arv", "Reassessed at ARV"], ["price", "Purchase price"]], hint: "Conservative: assume the county catches the new value." }], D) +
          U.fieldset("Operating", [...opexFields("brrrr"), { k: "s.brrrr.util", l: "Owner-paid utilities / mo", t: "money" }], D) +
          U.fieldset("Snowball", [{ k: "s.brrrr.sbStart", l: "Starting capital", t: "money", s: 1, min: 10000, max: 300000, step: 5000 }, { k: "s.brrrr.sbSave", l: "Added savings / mo", t: "money" }, { k: "s.brrrr.sbYears", l: "Years", t: "yrs", s: 1, min: 1, max: 15, step: 1 }, { k: "s.brrrr.sbReinvest", l: "Reinvest cash flow", t: "tog" }], D),
        results: `<div data-slot="kpis"></div><div data-slot="verdict"></div>
          ${App.vizCard("The capital curve", "brCap", "Drag to scrub · watch your cash go in and come back out at refi", 300)}
          <div class="two">${App.card("All-in cost vs. refi loan", "allin")}${App.card("Deal ledger", "ledger")}</div>
          ${App.vizCard("Where the rent goes after refi", "brFlow", "New PITI on the refinanced loan", 320)}
          ${App.card("The snowball: repeat this deal", "snow", `<span class="sub" data-slot="snowsub"></span>`)}`,
        playbook: {
          what: "BRRRR turns one pile of capital into many doors. You buy below value, add value with the rehab, rent it, and refinance at 70–80% of the new appraised value. If your all-in cost is at or under the refi loan, you get your money back and still own a cash-flowing rental.",
          when: ["Purchase + rehab ≤ ~75% of ARV", "Rents support positive cash flow on the larger refi loan", "You can carry hard-money costs through rehab and seasoning", "You have a lender lined up for the refi before you buy"],
          steps: ["Buy distressed with hard money or cash", "Rehab to rental-grade quality (durable finishes)", "Place a tenant at market rent", "Season the title (often 6–12 months) and order the appraisal", "Cash-out refi with a DSCR or conventional lender; pay off the hard money", "Recycle the returned cash into the next deal"],
          fx: [["Refi loan = ARV × LTV", ""], ["Cash out = refi loan − payoff − refi costs", ""], ["Cash left in deal = total cash in − cash out", "≤ $0 = infinite return"], ["Perfect BRRRR: price + rehab + costs ≤ ARV × LTV", ""]],
          flags: ["Appraisal risk: a low appraisal leaves your capital stuck", "Refi rates are usually higher than purchase rates; cash flow often shrinks after refi", "The county may reassess at the new value (taxes go up)", "Seasoning rules change; confirm with your lender before buying"]
        }
      });
      V.capital(root.querySelector("#brCap"), () => App._brCap);
      V.flow(root.querySelector("#brFlow"), () => App._brFlow);
    },
    update() {
      const D = App.D, S = App.S("brrrr"), r = F.brrrr(D, S), mx = F.brrrrMaxPrice(D, S);
      const left = r.cashLeft;
      App.slot("kpis", U.kpis([
        { l: left <= 0 ? "Cash pulled out beyond investment" : "Cash left in deal", v: $(Math.abs(left)), big: 1, tone: left <= 0 ? "good" : left < r.cashIn * 0.25 ? "warn" : "bad", m: U.math(`cash in ${$(r.cashIn)} − cash out ${$(r.cashOut)}`, $(left)) },
        { l: "Cash out at refi", v: $(r.cashOut), m: U.math(`${$(r.arv)} × ${S.refiLtv}% − payoff ${$(r.loan1)} − costs ${$(r.refiCosts)}`, $(r.cashOut)) },
        { l: "Capital recovered", v: P(Math.min(r.recovered, 999), 0), tone: r.recovered >= 100 ? "good" : r.recovered >= 75 ? "warn" : "bad" },
        { l: "Cash flow after refi", v: U.mo(r.cfM), tone: r.cfM >= 150 ? "good" : r.cfM >= 0 ? "warn" : "bad", m: U.math(`NOI ${$(r.ox.noiM)} − P&I ${$(r.pi)}`, U.$c(r.cfM)) },
        { l: "Cash-on-cash", v: left <= 0 ? "∞" : P(r.coc), tone: left <= 0 ? "good" : U.tone(r.coc, 10, 5), sub: left <= 0 ? "No money left in the deal" : "on cash left" },
        { l: "Equity captured", v: $(r.equity), sub: `ARV − ${$(r.newLoan)} loan` },
        { l: "Max price for 100% recovery", v: $(mx), tone: D.price <= mx ? "good" : "bad", sub: "solved with all costs" },
        { l: "DSCR on refi", v: U.x(r.dscr), tone: r.dscr >= 1.2 ? "good" : r.dscr >= 1 ? "warn" : "bad" }
      ]));
      App.slot("verdict", left <= 0 ? U.verdict("good", "Full capital recovery", `You get all ${$(r.cashIn)} back plus ${$(-left)}, keep ${$(r.equity)} of equity and ${U.mo(r.cfM)}.${r.cfM < 0 ? " Cash flow is negative after refi; you are buying equity, not income." : ""}`)
        : U.verdict(left < r.cashIn * 0.25 ? "warn" : "bad", left < r.cashIn * 0.25 ? "Most of your capital comes back" : "Capital stays trapped", `${$(left)} stays in the deal. Buy at ${$(mx)} or less, push ARV, or cut rehab to recover it all.`));
      /* capital curve points */
      const rm = S.rehabMonths, T = r.toRefi, down0 = r.price + r.closing - r.pLoan + r.points + r.fees;
      const cash = [[0, down0]], debt = [[0, r.pLoan]], eq = [[0, D.asIs - r.pLoan]];
      let c = down0;
      for (let m = 1; m <= Math.ceil(T); m++) {
        const drawn = Math.min(1, m / rm), drawnAvg = m <= rm ? (m - 0.5) / rm : 1;
        const intM = S.acq === "hml" ? S.rate / 1200 * (r.pLoan + r.rLoan * drawnAvg) : 0;
        const vac = m <= r.vacantMonths ? (r.holding / Math.max(1, r.vacantMonths)) : -r.ox.noiM;
        c += intM + vac + (m <= rm ? (r.rehab - r.rLoan) / rm : 0);
        cash.push([m, c]);
        const val = D.asIs + (D.arv - D.asIs) * Math.min(1, m / rm), dbt = r.pLoan + r.rLoan * drawn;
        debt.push([m, dbt]); eq.push([m, val - dbt]);
      }
      const after = c - r.cashOut;
      cash.push([T + 0.01, after]); debt.push([T + 0.01, r.newLoan]); eq.push([T + 0.01, r.equity]);
      for (let m = T + 1; m <= T + 6; m++) { cash.push([m, after - r.cfM * (m - T)]); debt.push([m, F.bal(S.refiRate, S.refiTerm, r.newLoan, m - T)]); eq.push([m, D.arv - F.bal(S.refiRate, S.refiTerm, r.newLoan, m - T)]); }
      App._brCap = { span: T + 6, phases: [{ a: 0, b: 0.5, l: "Buy", c: "var(--c2)" }, { a: 0.5, b: rm, l: "Rehab", c: "var(--c7)" }, { a: rm, b: T, l: "Rent & season", c: "var(--c9)" }, { a: T, b: T + 1, l: "Refi", c: "var(--accent)" }, { a: T + 1, b: T + 6, l: "Repeat", c: "var(--good)" }],
        lines: [{ l: "Your cash in deal", c: "var(--accent)", pts: cash, fill: 1 }, { l: "Your equity", c: "var(--c2)", pts: eq }, { l: "Debt", c: "var(--c1)", pts: debt }] };
      App._brFlow = river(r.ox.gpi, r.ox.items, r.newLoan, S.refiRate, r.pi, 0, r.cfM, r.ox.vac);
      App.slot("allin", U.barsH([{ l: "Purchase + closing", v: r.price + r.closing, c: "var(--c2)" }, { l: "Rehab", v: r.rehab, c: "var(--c7)" }, { l: "Financing + carry", v: r.points + r.fees + r.interest + r.holding - r.rentNet, c: "var(--c1)" }, { l: "All-in", v: r.allIn - r.rentNet, c: "var(--fg)" }, { l: `Refi loan @ ${S.refiLtv}%`, v: r.newLoan, c: r.newLoan >= r.allIn ? "var(--good)" : "var(--warn)" }], { lw: 140 }));
      App.slot("ledger", U.ledger([
        { l: "Cash at purchase", v: $(down0), n: `${$(r.price + r.closing)} − ${$(r.pLoan)} loan + points/fees` }, { l: "Rehab not financed", v: $(r.rehab - r.rLoan) }, { l: "Interest during hold", v: $(r.interest), n: `${r.toRefi} months` },
        { l: "Vacant holding", v: $(r.holding), n: `${r.vacantMonths} mo` }, { l: "Net rent before refi", v: "−" + $(r.rentNet), n: `${r.rentedMonths} mo rented` }, { l: "Total cash in", v: $(r.cashIn), c: "sub" },
        { l: "Refi loan", v: $(r.newLoan) }, { l: "Pay off hard money", v: "−" + $(r.loan1) }, { l: "Refi costs", v: "−" + $(r.refiCosts) }, { l: "Cash out to you", v: $(r.cashOut), c: "sub" },
        { l: "Cash left in deal", v: $(left), c: "total" }]));
      const sb = F.snowball({ start: S.sbStart, cashIn: r.cashIn, cashLeft: r.cashLeft, cycleMonths: r.toRefi + 1, save: S.sbSave, cfPer: r.cfM, eqPer: r.equity, years: S.sbYears, reinvest: S.sbReinvest });
      const last = sb[sb.length - 1] || { doors: 0, cfM: 0, equity: 0 };
      App.slot("snowsub", `${last.doors} doors · ${U.$k(last.equity)} equity · ${U.mo(last.cfM)} after ${S.sbYears} yrs`);
      App.slot("snow", r.cashIn > S.sbStart ? `<p class="fine">This deal needs ${$(r.cashIn)} of cash in. Raise starting capital to run the snowball.</p>` :
        U.line([{ name: "Doors owned", c: "var(--accent)", area: 1, pts: [[0, 0], ...sb.map(x => [x.m / 12, x.doors])] }], { fmt: v => U.num(v, 0), xfmt: v => "Y" + Math.round(v), xticks: Array.from({ length: S.sbYears + 1 }, (_, i) => i), h: 200 }) +
        `<p class="fine">Each cycle takes ${r.toRefi + 1} months and ties up ${$(r.cashIn)} until refi, then leaves ${$(Math.max(0, r.cashLeft))} behind. Assumes every deal performs like this one, one at a time.${r.cfM < 0 ? ` <b class="neg">Each door loses ${U.mo(-r.cfM)} after refi, so the portfolio grows equity while your savings cover the shortfall.</b>` : ""}</p>`);
    }
  });

  /* ================= SUBJECT-TO ================= */
  App.reg({
    id: "sub2", nav: "Subject-To",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Creative finance", title: "Subject-To",
        lede: "Take title while the seller's existing loan stays in place. You make their payment, keep their low rate, and the seller walks away from the debt in practice.",
        inputs: U.fieldset("Property", App.basics(["asIs", "arv", "rent"]), D) +
          U.fieldset("Existing loan", [{ k: "s.sub2.balance", l: "Loan balance", t: "money", s: 1, min: 0, max: 500000, step: 1000 }, { k: "s.sub2.exRate", l: "Existing rate", t: "pct", s: 1, min: 2, max: 9, step: 0.125 }, { k: "s.sub2.exYears", l: "Years remaining", t: "yrs" },
            { k: "s.sub2.manualPI", l: "Enter P&I from statement instead", t: "tog" }, { k: "s.sub2.exPI", l: "P&I from mortgage statement", t: "money" }, { k: "s.sub2.escrowAuto", l: "Estimate escrow (taxes + insurance)", t: "tog" }, { k: "s.sub2.escrow", l: "Escrow / mo", t: "money" }], D) +
          U.fieldset("Your entry cost", [{ k: "s.sub2.arrears", l: "Arrears to reinstate", t: "money", hint: "Missed payments + late fees + foreclosure costs from the reinstatement quote." }, { k: "s.sub2.sellerCash", l: "Cash to seller (moving money)", t: "money" }, { k: "s.sub2.closing", l: "Title, attorney, closing", t: "money" },
            { k: "s.sub2.useDealRepairs", l: "Use full repair budget", t: "tog" }, { k: "s.sub2.repairs", l: "Repairs (if not full)", t: "money" }], D) +
          U.fieldset("Operating", opexFields("sub2"), D) +
          U.fieldset("Exit", [{ k: "s.sub2.exit", l: "Strategy", t: "seg", opts: [["rent", "Rent it"], ["wrap", "Wrap it (sell on terms)"]] },
            { k: "s.sub2.wrapPrice", l: "Wrap sale price", t: "money" }, { k: "s.sub2.wrapDown", l: "Buyer's down payment", t: "money" }, { k: "s.sub2.wrapRate", l: "Wrap rate", t: "pct" }, { k: "s.sub2.wrapTerm", l: "Wrap amortization", t: "yrs" }, { k: "s.sub2.wrapHold", l: "Years until buyer refinances", t: "yrs" }], D),
        results: `<div data-slot="kpis"></div>${App.card("The rate arbitrage", "rate", `<span class="sub">Why sub-to beats a new loan</span>`)}
          ${App.vizCard("Where the rent goes", "s2Flow", "Rent exit, using the seller's existing payment", 320)}
          <div data-slot="wrap"></div>${App.card("Entry & equity", "ledger")}`,
        playbook: {
          what: "Subject-To means you buy the property subject to the existing mortgage. The deed transfers to you; the loan stays in the seller's name and you make the payments. It shines when a seller has little equity, is behind on payments, or holds a low-rate loan that no new buyer could get today.",
          when: ["Seller has low or no equity (a cash offer can't work)", "Pre-foreclosure: behind on payments, needs to stop the auction", "Existing rate is well below today's rates", "Seller is relocating, divorcing, or inherited the payment"],
          steps: ["Get the mortgage statement and a reinstatement or payoff quote", "Sign the purchase agreement and sub-to addendum with clear disclosures", "Close with an investor-friendly title company or attorney; record the deed", "Insure as landlord with the seller as additional insured; set up the servicer authorization", "Cure arrears and make every payment through a third-party servicer", "Exit by renting, wrapping (seller financing to a buyer), or refinancing later"],
          fx: [["Entry fee = arrears + cash to seller + closing + repairs", ""], ["Cash flow = rent − existing PITI − operating reserves", ""], ["Rate arbitrage = new-loan P&I − existing P&I", ""], ["Wrap spread = buyer's P&I − underlying P&I", "Plus down payment and back-end equity"]],
          flags: ["Due-on-sale clause: the lender may call the loan when title transfers. Rare in practice but real; have a plan to refinance or pay off", "The seller's credit is tied to your performance. Never miss a payment", "Some states add consumer-protection rules for distressed-homeowner purchases (foreclosure-rescue laws). Use an attorney", "Insurance must reflect the new owner; a lapsed policy can trigger force-placed insurance"]
        }
      });
      V.flow(root.querySelector("#s2Flow"), () => App._s2Flow);
    },
    update() {
      const D = App.D, S = App.S("sub2"), r = F.sub2(D, S);
      App.slot("kpis", U.kpis([
        { l: "Entry fee (your cash)", v: $(r.entry), big: 1, m: U.math(`arrears ${$(S.arrears)} + seller ${$(S.sellerCash)} + closing ${$(S.closing)} + repairs ${$(r.repairs)}`, $(r.entry)) },
        { l: "Monthly cash flow", v: U.mo(r.cfM), tone: r.cfM >= 200 ? "good" : r.cfM >= 0 ? "warn" : "bad", m: U.math(`NOI ${$(r.ox.noiM)} − existing P&I ${$(r.exPI)}`, U.$c(r.cfM)) },
        { l: "Cash-on-cash", v: P(r.coc), tone: U.tone(r.coc, 15, 8) },
        { l: "Equity at entry", v: $(r.equity), tone: r.equity > 0 ? "good" : "bad", m: U.math(`${$(r.value)} − ${$(r.bal)} loan − ${$(r.entry)} entry`, $(r.equity)) },
        { l: "Existing PITI", v: U.mo(r.piti), sub: `P&I ${$(r.exPI)} + escrow ${$(r.escrow)}` },
        { l: "Loan-to-value", v: P(r.ltv), sub: "Existing loan ÷ value" },
        { l: "Principal paydown yr 1", v: $(r.paydown1), sub: `at ${P(S.exRate, 3)}` }
      ]));
      const life = (r.newPI - r.exPI) * S.exYears * 12;
      App.slot("rate", U.barsH([{ l: `Seller's loan @ ${P(S.exRate, 2)}`, v: r.exPI, c: "var(--good)" }, { l: `New loan @ ${P(D.rate, 2)}`, v: r.newPI, c: "var(--c1)" }], { lw: 150, fmt: v => U.$(v) + "/mo" }) +
        `<p class="fine">Same ${$(r.bal)} balance. Keeping the existing loan saves <b>${U.mo(r.rateSave)}</b>, about ${U.$k(life)} over the remaining term, and every payment pays down more principal.</p>`);
      App._s2Flow = river(r.ox.gpi, r.ox.items, r.bal, S.exRate, r.exPI, 0, r.cfM, r.ox.vac);
      App.slot("wrap", S.exit !== "wrap" ? "" : `<div class="card"><div class="card-h"><h3>Wrap exit: you become the bank</h3><span class="sub">Buyer pays you; you pay the underlying loan</span></div>
        ${U.kpis([{ l: "Monthly spread", v: U.mo(r.wrapSpread), tone: r.wrapSpread > 0 ? "good" : "bad", m: U.math(`buyer P&I ${$(r.wrapPI)} − underlying ${$(r.exPI)}`, U.$c(r.wrapSpread)) },
          { l: "Down payment vs entry", v: $(r.wrapFront), tone: r.wrapFront >= 0 ? "good" : "warn", sub: `${$(S.wrapDown)} in − ${$(r.entry)} out` },
          { l: `Back-end at year ${S.wrapHold}`, v: $(r.wrapBack), sub: "wrap balance − underlying balance" },
          { l: "Total profit", v: $(r.wrapTotal), big: 1, tone: "good" }])}
        ${U.line([{ name: "Wrap note balance (owed to you)", c: "var(--c2)", pts: Array.from({ length: S.wrapHold + 1 }, (_, y) => [y, F.bal(S.wrapRate, S.wrapTerm, r.wrapLoan, y * 12)]) },
          { name: "Underlying loan (you owe)", c: "var(--c1)", area: 1, pts: Array.from({ length: S.wrapHold + 1 }, (_, y) => [y, F.bal(S.exRate, S.exYears, r.bal, y * 12)]) }], { xfmt: v => "Y" + v, h: 200 })}
        <p class="fine">The gap between the lines is your back-end spread when the buyer refinances. Owner-occupant wrap buyers trigger Dodd-Frank/SAFE Act rules: use a licensed RMLO and a loan servicer.</p></div>`);
      App.slot("ledger", U.ledger([{ l: "Value used", v: $(r.value), n: r.repairs > 0 ? "ARV (after your repairs)" : "As-is" }, { l: "Existing loan", v: "−" + $(r.bal) }, { l: "Your entry cost", v: "−" + $(r.entry) }, { l: "Equity position", v: $(r.equity), c: "total" },
        { sep: 1 }, { l: "Your total basis", v: $(r.basis), n: "Loan + entry: what the house really cost you" }, { l: "Basis as % of value", v: P(r.basis / Math.max(1, r.value) * 100) }]));
    }
  });

  /* ================= SELLER FINANCE ================= */
  App.reg({
    id: "sellerfin", nav: "Seller Finance",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Creative finance", title: "Seller Finance",
        lede: "The seller acts as the bank. Trade price for terms: a fair price with a low rate and low down payment can turn a no-deal into a cash-flowing rental.",
        inputs: U.fieldset("Terms", [{ k: "s.sellerfin.price", l: "Purchase price", t: "money", s: 1, min: 0, max: Math.max(400000, D.arv * 1.5), step: 1000 }, { k: "s.sellerfin.downPct", l: "Down payment", t: "pct", s: 1, min: 0, max: 50, step: 1 },
          { k: "s.sellerfin.rate", l: "Interest rate", t: "pct", s: 1, min: 0, max: 10, step: 0.25 }, { k: "s.sellerfin.amort", l: "Amortization", t: "yrs" }, { k: "s.sellerfin.balloon", l: "Balloon due in", t: "yrs", s: 1, min: 1, max: 30, step: 1 },
          { k: "s.sellerfin.io", l: "Interest-only payments", t: "tog" }, { k: "s.sellerfin.closing", l: "Your closing costs", t: "money" }, { k: "s.sellerfin.useDealRepairs", l: "Add repair budget to cash in", t: "tog" }], D) +
          U.fieldset("Property", App.basics(["rent"]), D) + U.fieldset("Operating", opexFields("sellerfin"), D) +
          U.fieldset("Price vs. terms lab", [{ k: "s.sellerfin.altPrice", l: "Alternate offer: price", t: "money" }, { k: "s.sellerfin.altDownPct", l: "Alternate down", t: "pct" }, { k: "s.sellerfin.altRate", l: "Alternate rate", t: "pct" }, { k: "s.sellerfin.discount", l: "Discount rate for PV", t: "pct", hint: "What money is worth to the seller per year. Used to compare offers in today's dollars." }], D),
        results: `<div data-slot="kpis"></div>${App.card("Seller carry vs. bank loan", "cmp")}${App.card("Note balance to the balloon", "bal")}${App.card("Price vs. terms: which offer costs you less?", "pvt")}`,
        playbook: {
          what: "In a seller-financed purchase you sign a promissory note to the seller, secured by a mortgage or deed of trust on the property. No bank, no appraisal, no DTI. Everything is negotiable: price, down, rate, amortization, balloon, prepayment.",
          when: ["Free-and-clear sellers (often older owners or tired landlords)", "Seller wants income or to spread capital gains (installment sale)", "Price is firm but the seller is flexible on terms", "Property or buyer wouldn't qualify for bank financing"],
          steps: ["Ask early: 'Would you consider receiving monthly payments?'", "Anchor on price vs. terms: offer full price for a low rate, or a lower price at market rate", "Agree on note terms in writing (rate, term, balloon, late fees, prepayment)", "Close with an attorney/title; record the deed and mortgage", "Use a note servicer for payments and 1098s", "Plan the balloon exit (refinance or sale) from day one"],
          fx: [["Payment = loan × r ÷ (1 − (1 + r)^−n)", "r = rate ÷ 12"], ["Balloon = remaining balance at month B", ""], ["PV of offer = down + Σ payments ÷ (1+d)^m + balloon ÷ (1+d)^B", "Compare offers in today's dollars"]],
          flags: ["If the seller still has a mortgage, a seller-carry second or wrap can trigger due-on-sale", "Balloon risk: if rates are high or values fall at the balloon, refinancing may be hard", "Selling on terms to owner-occupants requires Dodd-Frank/SAFE Act compliance", "Get the property inspected and title insured even without a bank"]
        }
      });
    },
    update() {
      const D = App.D, S = App.S("sellerfin"), r = F.sellerFin(D, S);
      App.slot("kpis", U.kpis([
        { l: "Payment to seller", v: U.mo(r.pi), big: 1, m: U.math(S.io ? `${$(r.loan)} × ${S.rate}% ÷ 12` : `pmt(${S.rate}%, ${S.amort} yrs, ${$(r.loan)})`, U.$c(r.pi)) },
        { l: "Monthly cash flow", v: U.mo(r.cfM), tone: r.cfM >= 200 ? "good" : r.cfM >= 0 ? "warn" : "bad", m: U.math(`NOI ${$(r.ox.noiM)} − ${$(r.pi)}`, U.$c(r.cfM)) },
        { l: "Cash-on-cash", v: P(r.coc), tone: U.tone(r.coc, 12, 6), sub: `on ${$(r.cash)} in` },
        { l: `Balloon at year ${S.balloon}`, v: $(r.balloon), tone: "warn", sub: "plan your refi or sale" },
        { l: "Interest paid to balloon", v: $(r.totalInt) },
        { l: "Bank-loan cash flow", v: U.mo(r.bankCF), tone: r.bankCF >= 0 ? "warn" : "bad", sub: `25% down (${$(r.bankDown)}) @ ${P(D.rate, 2)}` }
      ]));
      App.slot("cmp", U.barsH([{ l: "Seller carry P&I", v: r.pi, c: "var(--good)" }, { l: "Bank P&I", v: r.bankPI, c: "var(--c1)" }, { l: "Seller carry cash flow", v: r.cfM, c: r.cfM >= 0 ? "var(--good)" : "var(--bad)" }, { l: "Bank cash flow", v: r.bankCF, c: r.bankCF >= 0 ? "var(--good)" : "var(--bad)" }], { lw: 160, fmt: v => U.$(v) + "/mo" }) +
        `<p class="fine">Down payment: ${$(r.down)} with the seller vs ${$(r.bankDown)} with a bank.</p>`);
      const yrs = Math.max(1, S.balloon);
      App.slot("bal", U.line([{ name: "Note balance", c: "var(--c2)", area: 1, pts: Array.from({ length: yrs + 1 }, (_, y) => [y, S.io ? r.loan : F.bal(S.rate, S.amort, r.loan, y * 12)]) }], { xfmt: v => "Y" + v, h: 200 }) +
        `<p class="fine">At year ${yrs} you owe ${$(r.balloon)}. To refinance it at 75% LTV the property must appraise for at least ${$(r.balloon / 0.75)}.</p>`);
      const better = r.pvA < r.pvB ? "A" : "B";
      App.slot("pvt", `<div class="two"><div class="offer ${better === "A" ? "win" : ""}"><b>Offer A · your terms</b><span>${$(S.price)} · ${S.downPct}% down · ${P(S.rate, 2)}</span><span>Payment ${U.mo(r.pi)}</span><em>PV ${$(r.pvA)}</em></div>
        <div class="offer ${better === "B" ? "win" : ""}"><b>Offer B · lower price</b><span>${$(S.altPrice)} · ${S.altDownPct}% down · ${P(S.altRate, 2)}</span><span>Payment ${U.mo(r.altPI)}</span><em>PV ${$(r.pvB)}</em></div></div>
        <p class="fine">Present value of everything you'd pay the seller through the balloon, discounted at ${S.discount}%. Offer ${better} costs you less in today's dollars${better === "A" ? " even though the price is higher: the low rate is worth more than the price cut" : ""}.</p>`);
    }
  });

  /* ================= LEASE OPTION / RENT-TO-OWN ================= */
  App.reg({
    id: "leaseoption", nav: "Rent-to-Own",
    render(root) {
      const D = App.D;
      root.innerHTML = App.layout({
        eyebrow: "Creative finance", title: "Rent-to-Own",
        lede: "Lease options give a tenant-buyer the right to buy later. Run it on a house you own, or as a sandwich: lease-option from the owner, sub-lease-option to a tenant-buyer, and profit three ways.",
        inputs: U.fieldset("Structure", [{ k: "s.leaseoption.mode", l: "You are", t: "seg", opts: [["sandwich", "In the middle (sandwich)"], ["own", "The owner"]] }, { k: "s.leaseoption.term", l: "Option term", t: "mo", s: 1, min: 6, max: 60, step: 1 }], D) +
          U.fieldset("Tenant-buyer pays you", [{ k: "s.leaseoption.tbFee", l: "Option fee", t: "money", hint: "Non-refundable option consideration. Often 3–5% of price." }, { k: "s.leaseoption.tbRent", l: "Monthly rent", t: "money", s: 1, min: 0, max: 5000, step: 25 },
            { k: "s.leaseoption.credit", l: "Rent credit / mo", t: "money", hint: "Portion of rent credited toward the purchase price at exercise." }, { k: "s.leaseoption.tbStrike", l: "Option (strike) price", t: "money" }, { k: "s.leaseoption.feeCredit", l: "Option fee credited at closing", t: "tog" }, { k: "s.leaseoption.closePct", l: "Your closing costs at exercise", t: "pct" }], D) +
          U.fieldset("Sandwich: you pay the owner", [{ k: "s.leaseoption.sRent", l: "Rent to owner", t: "money" }, { k: "s.leaseoption.sFee", l: "Option fee to owner", t: "money" }, { k: "s.leaseoption.sStrike", l: "Your strike price", t: "money" }], D) +
          U.fieldset("If you own it", [{ k: "s.leaseoption.ownDown", l: "Your down payment", t: "pct" }, App.basics(["price"])[0]], D) +
          U.fieldset("Other", [{ k: "s.leaseoption.reserve", l: "Repair reserve / mo", t: "money", hint: "Tenant-buyers usually handle minor repairs; keep a reserve for majors." }, { k: "s.leaseoption.marketing", l: "Marketing", t: "money" }], D),
        results: `<div data-slot="kpis"></div>${App.card("Three profit layers", "layers")}${App.vizCard("Monthly money flow", "loFlow", "Tenant-buyer rent through your position", 260)}${App.card("Profit over the term", "time")}`,
        playbook: {
          what: "A lease option is two agreements: a lease and an option to purchase at a set price within a set time. The tenant-buyer pays an option fee for that right. In a sandwich lease option you control a property with little capital and profit on the spread between what you owe the owner and what your tenant-buyer pays you.",
          when: ["Owner can't sell for what they owe or want, but needs relief now", "Tenant-buyer has income but needs 1–3 years to repair credit or save", "Markets with appreciation where the strike price will look cheap later", "You want controlled properties without buying"],
          steps: ["Lease-option the property from the owner (long term, low strike, right to sublease)", "Market to tenant-buyers; screen for income and a credible path to mortgage approval", "Collect option fee and sign lease + option agreements (separate documents)", "Collect rent, pay the owner, keep the spread", "Tenant-buyer exercises: you buy at your strike and sell at theirs in a simultaneous close", "If they don't exercise, keep the option fee and remarket"],
          fx: [["Front-end = option fee in − option fee out", ""], ["Monthly spread = rent in − rent out", ""], ["Back-end = their strike − credits − your strike − closing", ""]],
          flags: ["Some states treat long lease options as executory contracts or equitable interests with strict rules (Texas Property Code 5.0621+ is the best-known example)", "Most tenant-buyers never exercise. Underwrite the 'no exercise' case as your base case", "Keep option consideration and rent clearly separate on paper", "Record a memorandum of option to protect your position"]
        }
      });
      V.flow(root.querySelector("#loFlow"), () => App._loFlow);
    },
    update() {
      const D = App.D, S = App.S("leaseoption"), r = F.leaseOption(D, S);
      App.slot("kpis", U.kpis([
        { l: "Total profit if exercised", v: $(r.total), big: 1, tone: r.total > 0 ? "good" : "bad", m: U.math(`front ${$(r.front)} + spread ${$(r.spreadM)} × ${r.term} + back ${$(r.back)}${S.mode === "own" ? " − your down" : ""}`, $(r.total)) },
        { l: "If they don't buy", v: $(r.noExercise), tone: r.noExercise > 0 ? "good" : "bad", sub: "fee + spread, you keep the house" },
        { l: "Front-end", v: $(r.front), sub: "option fee spread" }, { l: "Monthly spread", v: U.mo(r.spreadM), tone: r.spreadM >= 0 ? "good" : "bad" },
        { l: "Back-end", v: $(r.back), m: U.math(`${$(S.tbStrike)} − credits ${$(r.credits + (S.feeCredit ? S.tbFee : 0))} − ${S.mode === "sandwich" ? "your strike" : "loan payoff"} ${$(r.strikeOut)} − closing ${$(r.closeCost)}`, $(r.back)) },
        { l: "Cash at risk", v: $(r.atRisk), sub: isFinite(r.roi) ? `ROI ${P(r.roi, 0)}` : "" }
      ]));
      App.slot("layers", U.stack([{ l: "Front-end", v: Math.max(0, r.front), c: "var(--c2)" }, { l: `Spread × ${r.term} mo`, v: Math.max(0, r.spreadM * r.term), c: "var(--c4)" }, { l: "Back-end", v: Math.max(0, r.back), c: "var(--good)" }]) +
        `<p class="fine">${S.mode === "sandwich" ? "Your capital at risk is only the option fee you paid the owner plus marketing." : `As the owner your PITI is ${U.mo(r.pitiOwn)}; your loan payoff at exercise is ${$(r.strikeOut)}.`}</p>`);
      App._loFlow = { src: [{ l: "Tenant rent", v: S.tbRent, c: "var(--c2)" }, ...(r.spreadM < 0 ? [{ l: "Your pocket", v: -r.spreadM, c: "var(--bad)" }] : [])],
        dst: [{ l: S.mode === "sandwich" ? "Rent to owner" : "Your PITI", v: r.monthlyOut - S.reserve, c: "var(--c1)" }, { l: "Repair reserve", v: +S.reserve || 0, c: "var(--c7)" }, ...(r.spreadM > 0 ? [{ l: "Your spread", v: r.spreadM, c: "var(--good)" }] : [])], unit: "/mo" };
      const ex = [], no = []; for (let m = 0; m <= r.term; m++) { const base = r.front + r.spreadM * m - (S.mode === "own" ? 0 : 0); no.push([m, base]); ex.push([m, base + (m === r.term ? r.back - (S.mode === "own" ? D.price * S.ownDown / 100 : 0) : 0)]); }
      App.slot("time", U.line([{ name: "Tenant-buyer exercises", c: "var(--good)", pts: ex }, { name: "No exercise", c: "var(--c6)", pts: no, dash: 1 }], { xfmt: v => "M" + v, h: 200 }));
    }
  });
})(window);
