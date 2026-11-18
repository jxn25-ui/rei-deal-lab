/* REI Deal Lab — finance engine. Pure functions, no DOM.
   Convention: every rate/percent input is a percent number (6.875 = 6.875%). */
(function (G) {
  const p = v => (+v || 0) / 100;
  const n = v => (+v || 0);
  const F = {};

  /* ---------- core time-value math ---------- */
  F.pmt = (ratePct, years, principal) => {
    const N = Math.round(years * 12), r = p(ratePct) / 12;
    if (!(principal > 0) || N <= 0) return 0;
    return r === 0 ? principal / N : principal * r / (1 - Math.pow(1 + r, -N));
  };
  F.io = (ratePct, principal) => principal > 0 ? principal * p(ratePct) / 12 : 0;
  /* balance after k monthly payments */
  F.bal = (ratePct, years, principal, k) => {
    const N = years * 12, r = p(ratePct) / 12;
    if (!(principal > 0) || k >= N) return 0;
    if (k <= 0) return principal;
    if (r === 0) return principal * (1 - k / N);
    const pm = F.pmt(ratePct, years, principal);
    return principal * Math.pow(1 + r, k) - pm * (Math.pow(1 + r, k) - 1) / r;
  };
  /* yearly amortization: [{yr, interest, principal, balance}] */
  F.amort = (ratePct, years, principal) => {
    const out = []; const r = p(ratePct) / 12; const pm = F.pmt(ratePct, years, principal);
    let b = principal;
    for (let y = 1; y <= years; y++) {
      let I = 0, P = 0;
      for (let m = 0; m < 12 && b > 0.005; m++) { const i = b * r; const pr = Math.min(pm - i, b); I += i; P += pr; b -= pr; }
      out.push({ yr: y, interest: I, principal: P, balance: Math.max(0, b) });
    }
    return out;
  };
  F.npv = (ratePct, cfs) => cfs.reduce((s, c, i) => s + c / Math.pow(1 + p(ratePct), i), 0);
  F.irr = cfs => {
    if (!cfs.some(c => c > 0) || !cfs.some(c => c < 0)) return NaN;
    let lo = -0.99, hi = 10, f = r => cfs.reduce((s, c, i) => s + c / Math.pow(1 + r, i), 0);
    if (f(lo) * f(hi) > 0) return NaN;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
    return ((lo + hi) / 2) * 100;
  };
  /* bisection: find x in [lo,hi] where fn(x) == target (fn monotonic) */
  F.solve = (fn, lo, hi, target = 0) => {
    let a = lo, b = hi, fa = fn(a) - target, fb = fn(b) - target;
    if (fa * fb > 0) return NaN;
    for (let i = 0; i < 90; i++) {
      const m = (a + b) / 2, fm = fn(m) - target;
      if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  };

  /* ---------- market: taxes + insurance ---------- */
  F.market = D => {
    const st = REI.states[D.state] || REI.states.OH;
    const city = D.city ? REI.cities.find(c => c.n === D.city && c.s === st.code) : null;
    const ownerAdj = st.ti ? st.to / st.ti : 1;
    const invTax = city ? city.t : st.ti;
    const autoTax = D.owner ? +(invTax * ownerAdj).toFixed(2) : invTax;
    const costMult = city ? city.m : st.cost;
    const insBase = city && city.i ? city.i : st.ins;
    const coverage = Math.round(n(D.sqft) * 150 * costMult / 1000) * 1000;   // replacement-cost estimate
    const landlordAdj = D.owner ? 1 : 1.15;                                   // DP-3 landlord policy premium
    const autoIns = Math.round(insBase * (coverage / 300000) * landlordAdj / 10) * 10;
    return {
      st, city, costMult, insBase, coverage, landlordAdj, autoTax, autoIns,
      taxRate: D.taxAuto ? autoTax : n(D.taxRate),
      insAnnual: D.insAuto ? autoIns : n(D.insAnnual),
      label: (city ? city.n + ", " : D.cityName ? D.cityName + ", " : "") + st.name
    };
  };

  /* ---------- operating expenses (monthly) ---------- */
  F.opex = o => {
    const gpi = n(o.rent) + n(o.other);
    const vac = gpi * p(o.vac);
    const egi = gpi - vac;
    const items = [
      { k: "tax", label: "Property taxes", m: n(o.taxM) },
      { k: "ins", label: "Insurance", m: n(o.insM) },
      { k: "hoa", label: "HOA", m: n(o.hoa) },
      { k: "maint", label: "Repairs & maintenance", m: gpi * p(o.maint) },
      { k: "capex", label: "CapEx reserve", m: gpi * p(o.capex) },
      { k: "mgmt", label: "Property management", m: egi * p(o.mgmt) },
      { k: "util", label: "Owner-paid utilities", m: n(o.util) },
      { k: "otherx", label: "Other (lawn, pest, etc.)", m: n(o.otherExp) }
    ];
    const opexM = items.reduce((s, i) => s + i.m, 0);
    return { gpi, vac, egi, items, opexM, noiM: egi - opexM };
  };

  /* shared financing block for rentals */
  F.loanBlock = (price, L) => {
    if (L.type === "cash") return { loan: 0, pi: 0, mi: 0, down: price, points: 0, ufmip: 0 };
    const downAmt = price * p(L.down);
    let loan = price - downAmt, ufmip = 0;
    if (L.type === "fha") { ufmip = loan * p(L.ufmip); loan += ufmip; }
    const pi = F.pmt(L.rate, L.term, loan);
    let mi = 0;
    if (L.type === "fha") mi = loan * p(L.mip) / 12;
    else if (L.type === "conv" && n(L.down) < 20) mi = loan * p(L.pmi) / 12;
    return { loan, pi, mi, down: downAmt, points: (loan - ufmip) * p(L.points), ufmip };
  };

  const taxIns = (D, basis) => { const M = F.market(D); return { M, taxM: basis * p(M.taxRate) / 12, insM: M.insAnnual / 12 }; };

  /* ================= BUY & HOLD ================= */
  F.rental = (D, S) => {
    const price = n(S.price ?? D.price), rehab = S.useDealRepairs ? n(D.repairs) : n(S.rehab);
    const closing = price * p(S.closingPct);
    const L = F.loanBlock(price, S);
    const { M, taxM, insM } = taxIns(D, price);
    const ox = F.opex({ rent: D.rent, other: S.otherInc, vac: S.vac, maint: S.maint, capex: S.capex, mgmt: S.mgmt,
      util: S.util, otherExp: S.otherExp, hoa: D.hoa, taxM, insM });
    const debtM = L.pi + L.mi;
    const piti = L.pi + taxM + insM + L.mi + n(D.hoa);
    const cfM = ox.noiM - debtM;
    const cash = L.down + closing + rehab + L.points;
    const noiA = ox.noiM * 12, cfA = cfM * 12;
    const allIn = price + closing + rehab;
    const coc = cash > 0 ? cfA / cash * 100 : NaN;
    const cap = price > 0 ? noiA / price * 100 : 0;
    const yoc = allIn > 0 ? noiA / allIn * 100 : 0;
    const dscr = debtM > 0 ? ox.noiM / debtM : Infinity;
    const grm = D.rent > 0 ? price / (n(D.rent) * 12) : 0;
    const onePct = (price + rehab) > 0 ? n(D.rent) / (price + rehab) * 100 : 0;
    const ber = ox.gpi > 0 ? (ox.opexM + debtM) / ox.gpi * 100 : 0;
    const fiftyCF = n(D.rent) * 0.5 - debtM;
    /* projection */
    const yrs = Math.max(1, Math.round(n(S.hold) || 10));
    const value0 = S.useDealRepairs && n(D.arv) ? n(D.arv) : Math.max(n(D.asIs) || price, price);
    const bldgBasis = allIn * (1 - p(S.landPct));
    const depA = bldgBasis / 27.5, taxSaveA = depA * p(S.bracket);
    const proj = []; let cum = 0;
    for (let y = 1; y <= 30; y++) {
      const g = Math.pow(1 + p(S.rentGrowth), y - 1), e = Math.pow(1 + p(S.expGrowth), y - 1);
      const noi = (ox.egi * g - (ox.opexM - ox.items[0].m - ox.items[1].m) * g - (ox.items[0].m + ox.items[1].m) * e) * 12;
      const cf = noi - debtM * 12;
      const value = value0 * Math.pow(1 + p(S.appr), y);
      const bal = L.loan > 0 ? F.bal(S.rate, S.term, L.loan, y * 12) : 0;
      const prevBal = L.loan > 0 ? F.bal(S.rate, S.term, L.loan, (y - 1) * 12) : 0;
      cum += cf;
      proj.push({ y, noi, cf, value, bal, equity: value - bal, paydown: prevBal - bal, cumCF: cum,
        appr: value - value0 * Math.pow(1 + p(S.appr), y - 1), tax: y <= 27 ? taxSaveA : 0 });
    }
    const h = proj[yrs - 1];
    const saleNet = h.value * (1 - p(S.sellCost)) - h.bal;
    const cfs = [-cash, ...proj.slice(0, yrs).map(r => r.cf)]; cfs[yrs] += saleNet;
    const irr = F.irr(cfs);
    const totalBack = proj.slice(0, yrs).reduce((s, r) => s + r.cf, 0) + saleNet;
    const em = cash > 0 ? totalBack / cash : NaN;
    const y1 = proj[0];
    const roi1 = cash > 0 ? (y1.cf + y1.paydown + y1.appr + y1.tax) / cash * 100 : NaN;
    return { price, rehab, closing, L, M, taxM, insM, ox, debtM, piti, cfM, cfA, cash, noiA, allIn, coc, cap, yoc, dscr, grm,
      onePct, ber, fiftyCF, proj, irr, em, saleNet, roi1, y1, yrs, depA, taxSaveA, value0 };
  };

  /* ================= FIX & FLIP ================= */
  F.flip = (D, S, priceOverride) => {
    const price = n(priceOverride ?? S.price ?? D.price), arv = n(D.arv), rehab = n(D.repairs);
    const buyClose = price * p(S.buyClosing);
    let pLoan = 0, rLoan = 0;
    if (S.finance === "hml") {
      pLoan = price * p(S.ltc); rLoan = rehab * p(S.rehabPct);
      const cap = arv * p(S.maxArv);
      if (pLoan + rLoan > cap) { const over = pLoan + rLoan - cap; const cut = Math.min(over, rLoan); rLoan -= cut; pLoan -= (over - cut); }
    }
    const loan = pLoan + rLoan;
    const months = n(S.months);
    const interest = loan > 0 ? p(S.rate) / 12 * months * (pLoan + (S.dutch ? 1 : 0.5) * rLoan) : 0;
    const points = loan * p(S.points), fees = loan > 0 ? n(S.lenderFees) : 0;
    const M = F.market(D);
    const holdM = price * p(M.taxRate) / 12 + M.insAnnual * 1.25 / 12 + n(S.utilities) + n(D.hoa) + n(S.misc);
    const holding = holdM * months;
    const sellPct = p(S.commission) + p(S.sellClosing);
    const selling = arv * sellPct + n(S.concessions);
    const finCost = interest + points + fees;
    const total = price + buyClose + rehab + finCost + holding + selling;
    const profit = arv - total;
    const cash = price + buyClose + rehab - loan + points + fees + interest + holding;
    const roi = cash > 0 ? profit / cash * 100 : NaN;
    const annRoi = months > 0 ? roi * 12 / months : NaN;
    const margin = arv > 0 ? profit / arv * 100 : 0;
    const mao70 = arv * 0.7 - rehab;
    const fixed = total - selling;
    const breakEven = (fixed + n(S.concessions)) / (1 - sellPct);
    return { price, arv, rehab, buyClose, pLoan, rLoan, loan, months, interest, points, fees, finCost, holdM, holding, selling,
      sellPct, total, profit, cash, roi, annRoi, margin, mao70, breakEven, M };
  };
  F.flipMaxOffer = (D, S, targetProfit) => F.solve(x => F.flip(D, S, x).profit, 0, Math.max(1, n(D.arv)), targetProfit);

  /* ================= WHOLESALE ================= */
  F.wholesale = (D, S, flipS) => {
    const arv = n(D.arv), rehab = n(D.repairs);
    const buyerMAO = arv * p(S.buyerPct) - rehab;
    const yourMAO = buyerMAO - n(S.fee);
    const contract = n(S.contract ?? D.price);
    const spread = buyerMAO - contract;
    const assignNet = spread - n(S.marketing);
    const tf = S.useTF ? contract * p(S.tfPct) : 0;
    const dcNet = spread - n(S.dcCosts) - tf - n(S.marketing);
    const buyerFlip = flipS ? F.flip(D, flipS, Math.max(0, buyerMAO)) : null;
    const pctOfArv = arv > 0 ? contract / arv * 100 : 0;
    return { arv, rehab, buyerMAO, yourMAO, contract, spread, assignNet, dcNet, tf, buyerFlip, pctOfArv };
  };

  /* ================= WHOLETAIL ================= */
  F.wholetail = (D, S) => {
    const price = n(S.price ?? D.price), sale = n(D.arv) * p(S.salePct), rep = n(S.repairs);
    const buyClose = price * p(S.buyClosing);
    const loan = S.finance === "hml" ? price * p(S.ltc) : 0;
    const months = n(S.months);
    const interest = p(S.rate) / 12 * months * loan, points = loan * p(S.points);
    const M = F.market(D);
    const holdM = price * p(M.taxRate) / 12 + M.insAnnual * 1.25 / 12 + n(S.utilities);
    const holding = holdM * months;
    const selling = sale * (p(S.commission) + p(S.sellClosing)) + n(S.concessions);
    const total = price + buyClose + rep + interest + points + holding + selling;
    const profit = sale - total;
    const cash = price + buyClose + rep - loan + points + interest + holding;
    const roi = cash > 0 ? profit / cash * 100 : NaN;
    return { price, sale, rep, buyClose, loan, months, interest, points, holdM, holding, selling, total, profit, cash, roi,
      annRoi: months > 0 ? roi * 12 / months : NaN };
  };

  /* ================= NOVATION ================= */
  F.novation = (D, S, cashOffer) => {
    const list = n(S.salePrice), sellerNet = n(S.payoff) + n(S.sellerCash);
    const commission = list * p(S.commission), closing = list * p(S.closing);
    const holding = n(S.holdM) * n(S.months);
    const costs = commission + closing + n(S.concessions) + n(S.repairs) + holding + n(S.marketing);
    const profit = list - costs - sellerNet;
    const cash = n(S.repairs) + holding + n(S.marketing);
    const roi = cash > 0 ? profit / cash * 100 : NaN;
    const asIs = n(D.asIs);
    const sellerSelfList = asIs * (1 - 0.06 - 0.02) - n(S.payoff);
    const sellerCashOffer = Math.max(0, n(cashOffer) * 0.99 - n(S.payoff));
    return { list, sellerNet, commission, closing, holding, costs, profit, cash, roi, sellerSelfList, sellerCashOffer,
      sellerNovation: n(S.sellerCash) };
  };

  /* ================= BRRRR ================= */
  F.brrrr = (D, S, priceOverride) => {
    const price = n(priceOverride ?? S.price ?? D.price), rehab = n(D.repairs), arv = n(D.arv);
    const closing = price * p(S.closingPct);
    const hml = S.acq === "hml";
    const pLoan = hml ? price * p(S.ltc) : 0, rLoan = hml ? rehab * p(S.rehabPct) : 0, loan1 = pLoan + rLoan;
    const rehabM = n(S.rehabMonths), toRefi = Math.max(rehabM, n(S.monthsToRefi));
    const interest = hml ? p(S.rate) / 12 * (rehabM * (pLoan + 0.5 * rLoan) + (toRefi - rehabM) * loan1) : 0;
    const points = loan1 * p(S.points), fees = hml ? n(S.lenderFees) : 0;
    const M = F.market(D);
    const vacHoldM = price * p(M.taxRate) / 12 + M.insAnnual * 1.25 / 12 + n(S.utilities) + n(D.hoa);
    const vacantMonths = Math.min(toRefi, rehabM + n(S.leaseUp));
    const rentedMonths = Math.max(0, toRefi - vacantMonths);
    const taxBasis = S.taxBasis === "arv" ? arv : price;
    const taxM = taxBasis * p(M.taxRate) / 12, insM = M.insAnnual / 12;
    const ox = F.opex({ rent: D.rent, vac: S.vac, maint: S.maint, capex: S.capex, mgmt: S.mgmt, util: S.util, hoa: D.hoa, taxM, insM });
    const holding = vacHoldM * vacantMonths;
    const rentNet = ox.noiM * rentedMonths;
    const downIn = price + closing + rehab - loan1;
    const cashIn = downIn + points + fees + interest + holding - rentNet;
    const newLoan = arv * p(S.refiLtv);
    const refiCosts = newLoan * p(S.refiCostPct);
    const cashOut = newLoan - loan1 - refiCosts;          // net to you after paying off acquisition debt
    const cashLeft = cashIn - cashOut;
    const pi = F.pmt(S.refiRate, S.refiTerm, newLoan);
    const piti = pi + taxM + insM + n(D.hoa);
    const cfM = ox.noiM - pi, cfA = cfM * 12;
    const coc = cashLeft > 0 ? cfA / cashLeft * 100 : Infinity;
    const equity = arv - newLoan;
    const allIn = price + closing + rehab + points + fees + interest + holding;
    const dscr = pi > 0 ? ox.noiM / pi : Infinity;
    const recovered = cashIn > 0 ? Math.min(cashOut / cashIn, 9) * 100 : 0;
    return { price, rehab, arv, closing, pLoan, rLoan, loan1, interest, points, fees, holding, rentNet, rehabM, toRefi, vacantMonths,
      rentedMonths, downIn, cashIn, newLoan, refiCosts, cashOut, cashLeft, pi, piti, taxM, insM, ox, cfM, cfA, coc, equity, allIn, dscr, recovered, M };
  };
  F.brrrrMaxPrice = (D, S) => F.solve(x => -F.brrrr(D, S, x).cashLeft, 0, Math.max(1, n(D.arv)), 0);
  /* snowball: recycle capital across BRRRRs */
  F.snowball = o => {
    let cash = n(o.start), doors = 0, cfM = 0, equity = 0; const rows = [];
    const cycle = Math.max(1, n(o.cycleMonths));
    const need = Math.max(n(o.cashIn), 1), left = n(o.cashLeft);
    let clock = 0, inFlight = [];
    for (let m = 1; m <= n(o.years) * 12; m++) {
      cash += n(o.save) + (o.reinvest ? cfM : 0);
      inFlight = inFlight.filter(d => { if (m >= d.done) { cash += need - left; doors++; cfM += n(o.cfPer); equity += n(o.eqPer); return false; } return true; });
      while (cash >= need && inFlight.length < n(o.maxParallel || 1)) { cash -= need; inFlight.push({ done: m + cycle }); }
      if (m % 3 === 0) rows.push({ m, doors, cfM, equity, cash });
    }
    return rows;
  };

  /* ================= SUBJECT-TO ================= */
  F.sub2 = (D, S) => {
    const bal = n(S.balance);
    const exPI = S.manualPI ? n(S.exPI) : F.pmt(S.exRate, S.exYears, bal);
    const M = F.market(D);
    const taxM = n(D.asIs) * p(M.taxRate) / 12, insM = M.insAnnual / 12;
    const escrow = S.escrowAuto ? taxM + insM : n(S.escrow);
    const piti = exPI + escrow + n(D.hoa);
    const repairs = S.useDealRepairs ? n(D.repairs) : n(S.repairs);
    const entry = n(S.arrears) + n(S.sellerCash) + n(S.closing) + repairs;
    const basis = bal + entry;
    const value = repairs > 0 ? n(D.arv) : n(D.asIs);
    const equity = value - bal - entry + repairs * 0;   // equity after your cash in
    const ox = F.opex({ rent: D.rent, vac: S.vac, maint: S.maint, capex: S.capex, mgmt: S.mgmt, hoa: D.hoa, taxM: escrow * (taxM / (taxM + insM || 1)), insM: escrow * (insM / (taxM + insM || 1)) });
    const cfM = ox.noiM - exPI, cfA = cfM * 12;
    const coc = entry > 0 ? cfA / entry * 100 : Infinity;
    const newPI = F.pmt(D.rate, 30, bal);
    const rateSave = newPI - exPI;
    const paydown1 = bal - F.bal(S.exRate, S.exYears, bal, 12);
    /* wrap exit */
    const wrapLoan = n(S.wrapPrice) - n(S.wrapDown);
    const wrapPI = F.pmt(S.wrapRate, S.wrapTerm, wrapLoan);
    const wrapSpread = wrapPI - exPI;
    const wrapFront = n(S.wrapDown) - entry;
    const wrapBackAt = yrs => F.bal(S.wrapRate, S.wrapTerm, wrapLoan, yrs * 12) - F.bal(S.exRate, S.exYears, bal, yrs * 12);
    const wrapHold = n(S.wrapHold);
    const wrapTotal = wrapFront + wrapSpread * 12 * wrapHold + wrapBackAt(wrapHold);
    return { bal, exPI, escrow, piti, repairs, entry, basis, value, equity, ox, cfM, cfA, coc, newPI, rateSave, paydown1, taxM, insM,
      wrapLoan, wrapPI, wrapSpread, wrapFront, wrapBack: wrapBackAt(wrapHold), wrapTotal, M,
      ltv: value > 0 ? bal / value * 100 : 0 };
  };

  /* ================= SELLER FINANCE ================= */
  F.sellerFin = (D, S) => {
    const price = n(S.price), down = price * p(S.downPct), loan = price - down;
    const pi = S.io ? F.io(S.rate, loan) : F.pmt(S.rate, S.amort, loan);
    const M = F.market(D);
    const taxM = price * p(M.taxRate) / 12, insM = M.insAnnual / 12;
    const ox = F.opex({ rent: D.rent, vac: S.vac, maint: S.maint, capex: S.capex, mgmt: S.mgmt, hoa: D.hoa, taxM, insM });
    const cfM = ox.noiM - pi, cfA = cfM * 12;
    const cash = down + n(S.closing) + (S.useDealRepairs ? n(D.repairs) : 0);
    const coc = cash > 0 ? cfA / cash * 100 : Infinity;
    const balloonM = n(S.balloon) * 12;
    const balloon = S.io ? loan : F.bal(S.rate, S.amort, loan, balloonM);
    const totalInt = pi * balloonM - (loan - balloon);
    const bankDown = price * 0.25, bankLoan = price - bankDown;
    const bankPI = F.pmt(D.rate, 30, bankLoan);
    const bankCF = ox.noiM - bankPI;
    /* present value of the seller's note to the seller (what the deal costs you in today's dollars) */
    const pv = (pr, dn, rt, am, bl, io) => {
      const L = pr * p(dn); const ln = pr - L; const pm = io ? F.io(rt, ln) : F.pmt(rt, am, ln);
      const bb = io ? ln : F.bal(rt, am, ln, bl * 12); const d = p(S.discount) / 12; let s = L;
      for (let m = 1; m <= bl * 12; m++) s += pm / Math.pow(1 + d, m);
      return s + bb / Math.pow(1 + d, bl * 12);
    };
    const pvA = pv(price, S.downPct, S.rate, S.amort, S.balloon, S.io);
    const pvB = pv(n(S.altPrice), S.altDownPct, S.altRate, S.amort, S.balloon, false);
    return { price, down, loan, pi, taxM, insM, ox, cfM, cfA, cash, coc, balloon, balloonM, totalInt, bankPI, bankCF, bankDown, pvA, pvB, M,
      altPI: F.pmt(S.altRate, S.amort, n(S.altPrice) * (1 - p(S.altDownPct))) };
  };

  /* ================= LEASE OPTION / RENT-TO-OWN ================= */
  F.leaseOption = (D, S) => {
    const term = n(S.term), credits = n(S.credit) * term;
    const M = F.market(D);
    let monthlyOut, frontOut, strikeOut, ownCost = 0, pitiOwn = 0;
    if (S.mode === "sandwich") {
      monthlyOut = n(S.sRent) + n(S.reserve); frontOut = n(S.sFee); strikeOut = n(S.sStrike);
    } else {
      const loan = n(D.price) * (1 - p(S.ownDown));
      pitiOwn = F.pmt(D.rate, 30, loan) + n(D.price) * p(M.taxRate) / 12 + M.insAnnual / 12 + n(D.hoa);
      monthlyOut = pitiOwn + n(S.reserve); frontOut = 0;
      strikeOut = F.bal(D.rate, 30, loan, term);          // your loan payoff at exercise
      ownCost = n(D.price) * p(S.ownDown);
    }
    const spreadM = n(S.tbRent) - monthlyOut;
    const front = n(S.tbFee) - frontOut;
    const exerciseNet = n(S.tbStrike) - n(S.tbFee) * (S.feeCredit ? 1 : 0) - credits;
    const closeCost = n(S.tbStrike) * p(S.closePct);
    const back = exerciseNet - strikeOut - closeCost - (S.mode === "own" ? 0 : 0);
    const ownEquityIn = S.mode === "own" ? ownCost : 0;
    const total = front + spreadM * term + back - ownEquityIn;
    const noExercise = front + spreadM * term;
    const atRisk = S.mode === "sandwich" ? frontOut + n(S.marketing) : ownCost + n(S.marketing);
    return { term, credits, monthlyOut, frontOut, strikeOut, spreadM, front, back, total, noExercise, atRisk, pitiOwn, closeCost, exerciseNet,
      roi: atRisk > 0 ? total / atRisk * 100 : Infinity };
  };

  G.F = F;
  if (typeof module !== "undefined") module.exports = F;
})(typeof window !== "undefined" ? window : globalThis);
