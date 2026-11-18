/* REI Deal Lab — Drills (number reps), Method Match, Deal Library */
(function (G) {
  const { U, F, App } = G, $ = U.$, P = U.pct;
  const ri = (a, b, s = 1) => Math.round((a + Math.random() * (b - a)) / s) * s;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const c2 = U.$c;

  /* Each generator returns { q, given:[[label,value]], ans, unit:'$'|'%'|'x', tol, steps:[] } */
  const GEN = {
    pi: { n: "P&I payment", g() { const loan = ri(120000, 420000, 5000), rate = ri(5.5, 8.5, 0.125), yrs = pick([30, 30, 15]); const a = F.pmt(rate, yrs, loan);
      return { q: "What is the monthly principal & interest payment?", given: [["Loan", $(loan)], ["Rate", P(rate, 3)], ["Term", yrs + " years"]], ans: a, unit: "$", tol: 0.005,
        steps: [`r = ${rate}% ÷ 12 = ${(rate / 12).toFixed(4)}% per month`, `n = ${yrs} × 12 = ${yrs * 12} payments`, `P&I = ${$(loan)} × r ÷ (1 − (1 + r)^−${yrs * 12})`, `= ${c2(a)}`] }; } },
    piti: { n: "Full PITI", g() { const price = ri(140000, 450000, 5000), down = pick([20, 25]), rate = ri(6, 8, 0.125), tax = ri(0.6, 2.3, 0.05), ins = ri(1200, 4200, 100);
      const L = price * (1 - down / 100), pi = F.pmt(rate, 30, L), t = price * tax / 1200, i = ins / 12;
      return { q: "What is the total monthly PITI?", given: [["Price", $(price)], ["Down", down + "%"], ["Rate (30 yr)", P(rate, 3)], ["Tax rate", P(tax, 2)], ["Insurance", $(ins) + "/yr"]], ans: pi + t + i, unit: "$", tol: 0.01,
        steps: [`Loan = ${$(price)} × ${100 - down}% = ${$(L)}`, `P&I = ${c2(pi)}`, `Taxes = ${$(price)} × ${tax}% ÷ 12 = ${c2(t)}`, `Insurance = ${$(ins)} ÷ 12 = ${c2(i)}`, `PITI = ${c2(pi + t + i)}`] }; } },
    mao: { n: "70% rule MAO", g() { const arv = ri(140000, 420000, 5000), rep = ri(12000, 85000, 500), pct = pick([65, 70, 70, 75]), fee = pick([0, 0, 10000, 15000]);
      const a = arv * pct / 100 - rep - fee;
      return { q: fee ? "What's your maximum offer to the seller (wholesale)?" : "What is the maximum allowable offer?", given: [["ARV", $(arv)], ["Repairs", $(rep)], ["Buyer rule", pct + "%"], ...(fee ? [["Your fee", $(fee)]] : [])], ans: a, unit: "$", tol: 0.003,
        steps: [`${$(arv)} × ${pct}% = ${$(arv * pct / 100)}`, `− repairs ${$(rep)}${fee ? ` − fee ${$(fee)}` : ""}`, `MAO = ${$(a)}`] }; } },
    coc: { n: "Cash-on-cash", g() { const rent = ri(1300, 3200, 25), opex = Math.round(rent * ri(0.35, 0.5, 0.01)), pi = ri(700, 1600, 5), cash = ri(35000, 110000, 1000);
      const cf = rent - opex - pi, a = cf * 12 / cash * 100;
      return { q: "What is the cash-on-cash return?", given: [["Rent", $(rent) + "/mo"], ["Operating expenses (incl. vacancy, T&I)", $(opex) + "/mo"], ["P&I", $(pi) + "/mo"], ["Total cash invested", $(cash)]], ans: a, unit: "%", tol: 0.15, abs: 1,
        steps: [`Cash flow = ${$(rent)} − ${$(opex)} − ${$(pi)} = ${$(cf)}/mo`, `Annual = ${$(cf * 12)}`, `CoC = ${$(cf * 12)} ÷ ${$(cash)} = ${P(a, 2)}`] }; } },
    cap: { n: "Cap rate", g() { const rent = ri(1200, 3500, 25), vac = pick([5, 6, 8]), opexA = ri(6000, 16000, 100), price = ri(150000, 450000, 5000);
      const noi = rent * 12 * (1 - vac / 100) - opexA, a = noi / price * 100;
      return { q: "What is the cap rate?", given: [["Rent", $(rent) + "/mo"], ["Vacancy", vac + "%"], ["Operating expenses", $(opexA) + "/yr"], ["Price", $(price)]], ans: a, unit: "%", tol: 0.1, abs: 1,
        steps: [`Gross = ${$(rent * 12)}/yr`, `EGI = ${$(rent * 12)} × ${100 - vac}% = ${$(rent * 12 * (1 - vac / 100))}`, `NOI = EGI − ${$(opexA)} = ${$(noi)}`, `Cap = ${$(noi)} ÷ ${$(price)} = ${P(a, 2)}`] }; } },
    dscr: { n: "DSCR", g() { const rent = ri(1400, 3500, 25), opex = Math.round(rent * ri(0.3, 0.45, 0.01)), pi = ri(800, 2000, 5);
      const a = (rent - opex) / pi;
      return { q: "What is the DSCR?", given: [["Rent", $(rent) + "/mo"], ["Operating expenses", $(opex) + "/mo"], ["P&I", $(pi) + "/mo"]], ans: a, unit: "x", tol: 0.02, abs: 1,
        steps: [`NOI = ${$(rent)} − ${$(opex)} = ${$(rent - opex)}/mo`, `DSCR = ${$(rent - opex)} ÷ ${$(pi)} = ${a.toFixed(2)}×`, a >= 1.25 ? "Meets a 1.25 lender minimum" : "Below a 1.25 lender minimum"] }; } },
    fifty: { n: "50% rule", g() { const rent = ri(1200, 3200, 25), pi = ri(500, 1500, 5), a = rent / 2 - pi;
      return { q: "Using the 50% rule, what's the estimated monthly cash flow?", given: [["Rent", $(rent) + "/mo"], ["P&I", $(pi) + "/mo"]], ans: a, unit: "$", tol: 2, absD: 1, steps: [`${$(rent)} × 50% = ${$(rent / 2)}`, `− P&I ${$(pi)} = ${$(a)}`] }; } },
    one: { n: "1% rule", g() { const p = ri(80000, 300000, 1000), rh = ri(0, 50000, 500), rent = ri(900, 3000, 25), a = rent / (p + rh) * 100;
      return { q: "What is the rent-to-price ratio?", given: [["Price", $(p)], ["Rehab", $(rh)], ["Rent", $(rent) + "/mo"]], ans: a, unit: "%", tol: 0.02, abs: 1, steps: [`${$(rent)} ÷ (${$(p)} + ${$(rh)}) = ${P(a, 2)}`, a >= 1 ? "Passes the 1% rule" : "Fails the 1% rule"] }; } },
    grm: { n: "GRM", g() { const p = ri(120000, 500000, 5000), rent = ri(1000, 3800, 25), a = p / (rent * 12);
      return { q: "What is the gross rent multiplier?", given: [["Price", $(p)], ["Rent", $(rent) + "/mo"]], ans: a, unit: "x", tol: 0.05, abs: 1, steps: [`${$(p)} ÷ (${$(rent)} × 12) = ${a.toFixed(2)}`] }; } },
    flip: { n: "Flip profit", g() { const arv = ri(180000, 450000, 5000), price = Math.round(arv * ri(0.5, 0.65, 0.01) / 1000) * 1000, rep = ri(20000, 70000, 1000), hold = ri(6000, 18000, 250), sell = pick([7, 8]);
      const a = arv * (1 - sell / 100) - price - rep - hold;
      return { q: "What is the net profit?", given: [["ARV / sale price", $(arv)], ["Purchase", $(price)], ["Rehab", $(rep)], ["Financing + holding + buy closing", $(hold)], ["Selling costs", sell + "% of sale"]], ans: a, unit: "$", tol: 0.005, absD: 250,
        steps: [`Net sale = ${$(arv)} × ${100 - sell}% = ${$(arv * (1 - sell / 100))}`, `− ${$(price)} − ${$(rep)} − ${$(hold)}`, `Profit = ${$(a)}`] }; } },
    brrrr: { n: "BRRRR cash left", g() { const arv = ri(160000, 380000, 5000), price = Math.round(arv * ri(0.45, 0.6, 0.01) / 1000) * 1000, rep = ri(20000, 60000, 1000), costs = ri(5000, 14000, 250), ltv = pick([70, 75, 75, 80]), rc = pick([2, 2.5, 3]);
      const inn = price + rep + costs, L = arv * ltv / 100, out = L - L * rc / 100, a = inn - out;
      return { q: "Bought with cash. How much cash is left in the deal after the refi? (Negative = you pulled out more than you put in.)", given: [["Purchase", $(price)], ["Rehab", $(rep)], ["Closing + holding", $(costs)], ["ARV", $(arv)], ["Refi LTV", ltv + "%"], ["Refi costs", rc + "% of loan"]], ans: a, unit: "$", tol: 0.004, absD: 300,
        steps: [`Cash in = ${$(price)} + ${$(rep)} + ${$(costs)} = ${$(inn)}`, `Refi loan = ${$(arv)} × ${ltv}% = ${$(L)}`, `Cash out = ${$(L)} − ${rc}% costs = ${$(out)}`, `Left in = ${$(inn)} − ${$(out)} = ${$(a)}`] }; } },
    sub2: { n: "Sub-to cash flow", g() { const pi = ri(550, 1300, 5), esc = ri(250, 600, 5), rent = ri(1500, 2800, 25), res = pick([25, 27, 30]);
      const a = rent * (1 - res / 100) - pi - esc;
      return { q: "Taking over the loan subject-to, what's the monthly cash flow?", given: [["Existing P&I", $(pi)], ["Escrow (taxes + insurance)", $(esc)], ["Rent", $(rent)], ["Reserves (vacancy, repairs, capex, mgmt)", res + "% of rent"]], ans: a, unit: "$", tol: 0.01, absD: 3,
        steps: [`Reserves = ${$(rent)} × ${res}% = ${$(rent * res / 100)}`, `${$(rent)} − ${$(rent * res / 100)} − ${$(pi)} − ${$(esc)} = ${$(a)}`] }; } },
    ws: { n: "Wholesale spread", g() { const arv = ri(150000, 400000, 5000), rep = ri(15000, 70000, 1000), pct = pick([70, 75]), mao = arv * pct / 100 - rep, contract = Math.round(mao * ri(0.78, 0.95, 0.01) / 500) * 500;
      return { q: "A buyer pays their max. What's your assignment fee?", given: [["ARV", $(arv)], ["Repairs", $(rep)], ["Buyer formula", pct + "% of ARV − repairs"], ["Your contract", $(contract)]], ans: mao - contract, unit: "$", tol: 0.004, absD: 250,
        steps: [`Buyer MAO = ${$(arv)} × ${pct}% − ${$(rep)} = ${$(mao)}`, `Fee = ${$(mao)} − ${$(contract)} = ${$(mao - contract)}`] }; } },
    sf: { n: "Seller-finance payment", g() { const price = ri(100000, 350000, 5000), down = pick([5, 10, 15, 20]), rate = pick([0, 2, 3, 4, 5, 6]), am = pick([20, 25, 30]);
      const L = price * (1 - down / 100), a = F.pmt(rate, am, L);
      return { q: "What is the monthly payment to the seller?", given: [["Price", $(price)], ["Down", down + "%"], ["Rate", rate + "%"], ["Amortization", am + " years"]], ans: a, unit: "$", tol: 0.006,
        steps: [`Note = ${$(price)} × ${100 - down}% = ${$(L)}`, rate === 0 ? `0% note: ${$(L)} ÷ ${am * 12} = ${c2(a)}` : `pmt(${rate}%, ${am} yrs, ${$(L)}) = ${c2(a)}`] }; } },
    lo: { n: "Sandwich lease option", g() { const feeIn = ri(4000, 12000, 500), feeOut = ri(0, 2500, 500), rIn = ri(1600, 2600, 25), rOut = rIn - ri(150, 450, 25), term = pick([12, 24, 36]), sIn = ri(180000, 320000, 5000), sOut = sIn - ri(15000, 40000, 1000);
      const a = (feeIn - feeOut) + (rIn - rOut) * term + (sIn - feeIn - sOut);
      return { q: "Tenant-buyer exercises at the end of the term. Total profit? (Option fee is credited at closing; no rent credits; ignore closing costs.)", given: [["Option fee in / out", `${$(feeIn)} / ${$(feeOut)}`], ["Rent in / out", `${$(rIn)} / ${$(rOut)}`], ["Term", term + " mo"], ["Their strike / your strike", `${$(sIn)} / ${$(sOut)}`]], ans: a, unit: "$", tol: 0.004, absD: 100,
        steps: [`Front = ${$(feeIn)} − ${$(feeOut)} = ${$(feeIn - feeOut)}`, `Spread = ${$(rIn - rOut)} × ${term} = ${$((rIn - rOut) * term)}`, `Back = ${$(sIn)} − ${$(feeIn)} credit − ${$(sOut)} = ${$(sIn - feeIn - sOut)}`, `Total = ${$(a)}`] }; } },
    ann: { n: "Annualized ROI", g() { const profit = ri(15000, 70000, 500), cash = ri(30000, 120000, 1000), mo = pick([3, 4, 5, 6, 8, 9]), a = profit / cash * 12 / mo * 100;
      return { q: "What's the simple annualized ROI?", given: [["Profit", $(profit)], ["Cash invested", $(cash)], ["Months", mo]], ans: a, unit: "%", tol: 0.4, abs: 1, steps: [`ROI = ${$(profit)} ÷ ${$(cash)} = ${P(profit / cash * 100, 2)}`, `× 12 ÷ ${mo} = ${P(a, 2)}`] }; } }
  };
  App.GEN = GEN;

  const statsDefault = () => ({ cats: {}, total: 0, correct: 0, streak: 0, bestStreak: 0, sprintBest: 0, mm: { n: 0, ok: 0 } });
  const getStats = () => Object.assign(statsDefault(), App.Store.stats || {});

  App.reg({
    id: "drills", nav: "Drills",
    render(root) {
      const st = this.st = this.st || { mode: "num", cats: Object.keys(GEN), q: null, answered: false, sprint: null, mmI: -1 };
      root.innerHTML = `<header class="mh"><div class="mh-txt"><p class="eyebrow">Learn & train</p><h1>Drills</h1><p class="lede">Reps build instinct. Fresh numbers every time, graded instantly, with the full worked solution. Use a calculator like you would on a call, then try doing it in your head.</p></div>
        <div class="mh-tabs" role="tablist"><button role="tab" data-dm="num" class="${st.mode === "num" ? "on" : ""}">Number reps</button><button role="tab" data-dm="mm" class="${st.mode === "mm" ? "on" : ""}">Method Match</button></div></header>
        <div class="drill-wrap">
          <aside class="drill-side card"><div data-slot="dstats"></div>
            <div id="numSide"${st.mode === "num" ? "" : " hidden"}><h4>Formulas in rotation</h4><div class="chips col" id="dCats">${Object.entries(GEN).map(([k, g]) => `<button type="button" class="cb${st.cats.includes(k) ? " on" : ""}" data-cat="${k}">${g.n}<em data-acc="${k}"></em></button>`).join("")}</div>
            <div class="row gap"><button type="button" class="btn ghost sm" id="dAll">All</button><button type="button" class="btn ghost sm" id="dNone">None</button></div>
            <h4>Sprint</h4><p class="fine">As many correct as you can in 3 minutes.</p><button type="button" class="btn" id="dSprint">Start 3-minute sprint</button></div>
            <div id="mmSide"${st.mode === "mm" ? "" : " hidden"}><h4>Method Match</h4><p class="fine">Read the seller's situation and pick the acquisition method a seasoned investor would lead with. ${REI.scenarios.length} scenarios, shuffled.</p></div>
          </aside>
          <section class="drill-main"><div data-slot="dmain"></div></section></div>`;
      root.querySelector(".drill-wrap").addEventListener("click", e => this.click(e));
      root.querySelector(".mh-tabs").addEventListener("click", e => { const b = e.target.closest("[data-dm]"); if (!b) return; st.mode = b.dataset.dm; App.show("drills"); });
      if (st.mode === "num" && !st.q) this.next(); if (st.mode === "mm" && st.mmI < 0) this.nextMM();
      this.paint();
    },
    onStore() { this.paintStats(); },
    update() { },
    next() { const st = this.st; const cats = st.cats.length ? st.cats : Object.keys(GEN); const k = pick(cats); st.q = { k, ...GEN[k].g() }; st.answered = false; st.input = ""; },
    nextMM() { const st = this.st; st.mmOrder = st.mmOrder && st.mmOrder.length ? st.mmOrder : REI.scenarios.map((_, i) => i).sort(() => Math.random() - 0.5); st.mmI = st.mmOrder.pop(); st.mmPick = null; st.mmOpts = REI.scenarios[st.mmI].o.slice().sort(() => Math.random() - 0.5); },
    grade(val) {
      const q = this.st.q, err = Math.abs(val - q.ans);
      const tolAbs = q.abs ? q.tol : Math.max(Math.abs(q.ans) * q.tol, q.absD || 1);
      return err <= tolAbs;
    },
    record(cat, ok) {
      const s = getStats(); s.cats[cat] = s.cats[cat] || { n: 0, ok: 0 }; s.cats[cat].n++; if (ok) s.cats[cat].ok++;
      s.total++; if (ok) { s.correct++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); } else s.streak = 0;
      if (this.st.sprint && ok) this.st.sprint.score++;
      App.Store.saveStats(s);
    },
    click(e) {
      const st = this.st, t = e.target;
      const c = t.closest("[data-cat]"); if (c) { const k = c.dataset.cat; st.cats = st.cats.includes(k) ? st.cats.filter(x => x !== k) : [...st.cats, k]; c.classList.toggle("on"); return; }
      if (t.closest("#dAll")) { st.cats = Object.keys(GEN); App.root.querySelectorAll("#dCats .cb").forEach(b => b.classList.add("on")); return; }
      if (t.closest("#dNone")) { st.cats = []; App.root.querySelectorAll("#dCats .cb").forEach(b => b.classList.remove("on")); return; }
      if (t.closest("#dSprint")) { st.sprint = { end: Date.now() + 180000, score: 0 }; this.next(); this.paint(); this.tickSprint(); return; }
      if (t.closest("#dNext")) { this.next(); this.paint(); App.root.querySelector("#dAns")?.focus(); return; }
      if (t.closest("#dReveal")) { if (!st.answered) { st.answered = true; st.result = "skip"; this.record(st.q.k, false); } this.paint(); return; }
      const mo = t.closest("[data-mm]"); if (mo && st.mmPick == null) { st.mmPick = mo.dataset.mm; const s = getStats(); s.mm.n++; if (st.mmPick === REI.scenarios[st.mmI].a) s.mm.ok++; App.Store.saveStats(s); this.paint(); return; }
      if (t.closest("#mmNext")) { this.nextMM(); this.paint(); return; }
    },
    tickSprint() {
      clearInterval(this._t); this._t = setInterval(() => {
        const st = this.st, el = document.getElementById("sprintClock");
        if (!st.sprint || App.cur !== "drills") { clearInterval(this._t); return; }
        const left = Math.max(0, st.sprint.end - Date.now());
        if (el) el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")} · ${st.sprint.score} correct`;
        if (!left) { clearInterval(this._t); const s = getStats(); const sc = st.sprint.score; const best = sc > s.sprintBest; if (best) { s.sprintBest = sc; App.Store.saveStats(s); } st.sprint = null; App.toast(`Sprint over: ${sc} correct${best ? " · new best" : ""}`); this.paint(); }
      }, 250);
    },
    paintStats() {
      const s = getStats();
      App.slot("dstats", `<div class="dstats"><div><b>${s.total ? Math.round(s.correct / s.total * 100) : 0}%</b><span>accuracy</span></div><div><b>${s.streak}</b><span>streak</span></div><div><b>${s.bestStreak}</b><span>best streak</span></div><div><b>${s.sprintBest}</b><span>sprint best</span></div><div><b>${s.mm.n ? Math.round(s.mm.ok / s.mm.n * 100) + "%" : "—"}</b><span>method match</span></div></div>
        <p class="fine">${App.Store.mode === "cloud" ? "Progress saves to your account." : "Progress saves in this browser."}</p>`);
      Object.keys(GEN).forEach(k => { const el = App.root && App.root.querySelector(`[data-acc="${k}"]`); const c = s.cats[k]; if (el) el.textContent = c ? `${Math.round(c.ok / c.n * 100)}% · ${c.n}` : ""; });
    },
    paint() {
      const st = this.st; this.paintStats();
      if (st.mode === "mm") {
        const sc = REI.scenarios[st.mmI], picked = st.mmPick;
        App.slot("dmain", `<div class="card qcard"><p class="eyebrow">Method Match · the seller's situation</p><p class="scen">${sc.s}</p>
          <div class="mm-opts">${st.mmOpts.map(o => `<button type="button" class="mm${picked ? (o === sc.a ? " right" : o === picked ? " wrong" : "") : ""}" data-mm="${o}"${picked ? " disabled" : ""}>${o}</button>`).join("")}</div>
          ${picked ? `${U.verdict(picked === sc.a ? "good" : "bad", picked === sc.a ? "Right call" : `A pro would lead with ${sc.a}`, sc.e)}<div class="row"><button type="button" class="btn" id="mmNext">Next scenario</button><button type="button" class="btn ghost" data-go="${({ "Wholesale": "wholesale", "Subject-To": "sub2", "Seller finance": "sellerfin", "Novation": "novation", "BRRRR": "brrrr", "Wholetail": "wholetail", "Lease option": "leaseoption", "Buy & hold": "rental", "Fix & flip": "flip" })[sc.a]}">Open the ${sc.a} tab</button></div>` : ""}</div>`);
        return;
      }
      const q = st.q, un = q.unit;
      const fmtA = v => un === "$" ? U.$c(v) : un === "%" ? P(v, 2) : v.toFixed(2) + "×";
      App.slot("dmain", `<div class="card qcard${st.answered ? " done " + st.result : ""}">
        <div class="q-top"><p class="eyebrow">${GEN[q.k].n}</p>${st.sprint ? `<span class="sprint" id="sprintClock">3:00 · ${st.sprint.score} correct</span>` : ""}</div>
        <h2 class="q">${q.q}</h2>
        <dl class="given">${q.given.map(g => `<div><dt>${g[0]}</dt><dd>${g[1]}</dd></div>`).join("")}</dl>
        <form id="dForm" class="ansrow" autocomplete="off"><label for="dAns" class="sr">Your answer</label><div class="inp big"><span class="pre">${un === "$" ? "$" : ""}</span><input id="dAns" inputmode="decimal" placeholder="Your answer" ${st.answered ? "disabled" : ""} value="${U.esc(st.input || "")}"><span class="suf">${un === "%" ? "%" : un === "x" ? "×" : ""}</span></div>
          <button class="btn" type="submit"${st.answered ? " disabled" : ""}>Check</button><button class="btn ghost" type="button" id="dReveal"${st.answered ? " disabled" : ""}>Show me</button></form>
        ${st.answered ? `<div class="result">${st.result === "ok" ? `<b class="pos">Correct.</b> ${fmtA(q.ans)}` : st.result === "skip" ? `<b>Answer:</b> ${fmtA(q.ans)}` : `<b class="neg">Not quite.</b> You said ${fmtA(st.val)}; the answer is ${fmtA(q.ans)}.`}</div>
          <ol class="steps">${q.steps.map(s => `<li>${s}</li>`).join("")}</ol><button type="button" class="btn" id="dNext">Next rep →</button>` : `<p class="fine">Within about ${q.abs ? (un === "$" ? "$" + q.tol : q.tol + (un === "%" ? " pts" : "")) : (q.tol * 100).toFixed(1) + "%"} counts as correct.</p>`}</div>`);
      const f = App.root.querySelector("#dForm");
      f.addEventListener("submit", e => { e.preventDefault(); if (st.answered) return; const raw = App.root.querySelector("#dAns").value; if (!raw.trim()) return; const v = U.parse(raw); st.val = v; st.input = raw; const ok = this.grade(v); st.answered = true; st.result = ok ? "ok" : "bad"; this.record(q.k, ok); this.paint(); App.root.querySelector("#dNext")?.focus();
        if (st.sprint && ok) setTimeout(() => { if (st.sprint) { this.next(); this.paint(); App.root.querySelector("#dAns")?.focus(); } }, 700); });
      if (!st.answered) setTimeout(() => App.root.querySelector("#dAns")?.focus({ preventScroll: true }), 30);
    }
  });

  /* ================= DEAL LIBRARY ================= */
  App.reg({
    id: "library", nav: "Deal Library",
    render(root) {
      root.innerHTML = `<header class="mh"><div class="mh-txt"><p class="eyebrow">Saved</p><h1>Deal Library</h1><p class="lede">Every deal you save keeps its property, market, repair scope and the settings on every strategy tab. Load one to keep working, or duplicate it to test a different offer.</p></div></header>
        <div class="lib-top"><button type="button" class="btn" id="libSave">Save current deal</button><span class="fine" id="libMode"></span></div>
        <div data-slot="lib"></div>
        <details class="card io"><summary>Move deals between devices (JSON)</summary><p class="fine">Copy the current deal as JSON, or paste a deal you copied earlier and load it.</p>
          <div class="row"><button type="button" class="btn ghost sm" id="ioCopy">Copy current deal</button><button type="button" class="btn ghost sm" id="ioLoad">Load pasted JSON</button></div>
          <label for="ioText" class="sr">Deal JSON</label><textarea id="ioText" rows="5" spellcheck="false" placeholder='{"name": "..."}'></textarea></details>`;
      root.querySelector("#libSave").addEventListener("click", App.saveCurrent);
      root.querySelector("#ioCopy").addEventListener("click", () => { const txt = JSON.stringify(App.D); const ta = root.querySelector("#ioText"); ta.value = txt;
        navigator.clipboard?.writeText(txt).then(() => App.toast("Deal JSON copied"), () => { ta.select(); App.toast("Select-all is on: press Ctrl/Cmd+C"); }) ?? (ta.select()); });
      root.querySelector("#ioLoad").addEventListener("click", () => { try { const d = JSON.parse(root.querySelector("#ioText").value); App.D = App.normalize(d); App.D.id = null; App.toast(`Loaded “${App.D.name}”. Save it to keep it.`); App.go("hub"); } catch { App.toast("That isn't valid deal JSON. Paste the full text you copied."); } });
      root.querySelector('[data-slot="lib"]').addEventListener("click", e => {
        const b = e.target.closest("[data-act]"); if (!b) return; const d = App.Store.deals.find(x => x.id === b.dataset.id); if (!d) return;
        if (b.dataset.act === "load") { App.D = App.normalize(d.deal); App.D.id = d.id; App.toast(`Loaded “${d.name}”`); App.go("hub"); }
        if (b.dataset.act === "dup") { App.D = App.normalize(d.deal); App.D.id = null; App.D.name = d.name + " (copy)"; App.toast("Duplicated. Save it to keep the copy."); App.go("hub"); }
        if (b.dataset.act === "del") App.confirmBar(`Delete “${d.name}” from your library? This can't be undone.`, "Delete deal", () => App.Store.deleteDeal(d.id).then(() => App.toast("Deal deleted")).catch(() => App.toast("Couldn't delete. Try again.")));
      });
      this.onStore();
    },
    update() { },
    onStore() {
      const deals = App.Store.deals; const el = App.root.querySelector("#libMode"); if (el) el.textContent = App.Store.mode === "cloud" ? "Synced to your account · private to you" : "Saved in this browser only";
      App.slot("lib", deals.length ? `<div class="lib">${deals.map(d => {
        const D = App.normalize(d.deal), fl = F.flip(D, D.s.flip), rn = F.rental(D, D.s.rental);
        return `<article class="libc card"><div class="card-h"><h3>${U.esc(d.name)}</h3><span class="sub">${new Date(d.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div>
          <p class="fine">${U.esc(D.addr || "")} · ${U.esc(F.market(D).label)}</p>
          <div class="libm"><span>Price <b>${U.$k(D.price)}</b></span><span>ARV <b>${U.$k(D.arv)}</b></span><span>Repairs <b>${U.$k(D.repairs)}</b></span><span>Flip <b class="${fl.profit >= 0 ? "pos" : "neg"}">${U.$k(fl.profit)}</b></span><span>Rental <b class="${rn.cfM >= 0 ? "pos" : "neg"}">${U.mo(rn.cfM)}</b></span></div>
          <div class="row"><button type="button" class="btn sm" data-act="load" data-id="${d.id}">Open</button><button type="button" class="btn ghost sm" data-act="dup" data-id="${d.id}">Duplicate</button><button type="button" class="btn ghost sm danger" data-act="del" data-id="${d.id}">Delete</button></div></article>`; }).join("")}</div>`
        : `<div class="empty card"><h3>No saved deals yet</h3><p>Your library will list each property with its price, ARV, repairs, flip profit and rental cash flow. Fill in the Deal Hub, then press <b>Save deal</b> in the top bar to add your first one.</p></div>`);
    }
  });
})(window);
