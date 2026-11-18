/* REI Deal Lab — canvas motion graphics engine */
(function (G) {
  const V = { items: [], running: false };
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  V.reduced = mq.matches; mq.addEventListener?.("change", e => V.reduced = e.matches);
  V.col = {};
  V.readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    ["fg", "muted", "line", "panel", "bg", "accent", "good", "bad", "warn", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"].forEach(k => V.col[k] = cs.getPropertyValue("--" + k).trim() || "#888");
  };
  V.resolve = c => { if (!c) return V.col.accent; const m = /var\(--([\w-]+)\)/.exec(c); return m ? (V.col[m[1]] || "#888") : c; };
  const alpha = (hex, a) => { const c = V.resolve(hex); if (c[0] !== "#") return c; let h = c.slice(1); if (h.length === 3) h = h.split("").map(x => x + x).join(""); const n = parseInt(h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  V.alpha = alpha;
  const fontMono = '500 12px "JetBrains Mono", ui-monospace, monospace', fontSans = '500 12px "IBM Plex Sans", system-ui, sans-serif';
  const money = v => (v < 0 ? "−$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US");

  V.mount = (canvas, draw, opt = {}) => {
    const it = { canvas, ctx: canvas.getContext("2d"), draw, st: {}, w: 0, h: 0, opt };
    const fit = () => { const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); it.w = r.width; it.h = r.height; canvas.width = Math.max(1, r.width * d); canvas.height = Math.max(1, r.height * d); it.ctx.setTransform(d, 0, 0, d, 0, 0); };
    it.ro = new ResizeObserver(fit); it.ro.observe(canvas); fit();
    if (opt.scrub) {
      const set = e => { const r = canvas.getBoundingClientRect(); it.st.scrub = Math.max(0, Math.min(1, (e.clientX - r.left - (opt.padL || 0)) / (r.width - (opt.padL || 0) - (opt.padR || 0)))); it.st.scrubAt = performance.now(); };
      canvas.addEventListener("pointerdown", e => { it.st.drag = true; canvas.setPointerCapture(e.pointerId); set(e); });
      canvas.addEventListener("pointermove", e => { if (it.st.drag) set(e); });
      canvas.addEventListener("pointerup", () => it.st.drag = false);
    }
    V.items.push(it); V.start(); return it;
  };
  V.clear = () => { V.items.forEach(i => i.ro.disconnect()); V.items = []; };
  V.start = () => { if (V.running) return; V.running = true; requestAnimationFrame(V.tick); };
  V.tick = t => {
    V.items = V.items.filter(i => i.canvas.isConnected || (i.ro.disconnect(), false));
    if (!V.items.length) { V.running = false; return; }
    if (!document.hidden) V.items.forEach(i => { if (i.w > 0) { i.ctx.clearRect(0, 0, i.w, i.h); try { i.draw(i.ctx, i.w, i.h, V.reduced ? 0 : t / 1000, i.st); } catch (e) { console.error(e); } } });
    requestAnimationFrame(V.tick);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };

  /* ---------- Cash-flow river (animated Sankey) ----------
     get() -> { src:[{l,v,c}], dst:[{l,v,c}], unit } */
  V.flow = (canvas, get) => V.mount(canvas, (x, w, h, t, st) => {
    const D = get(); if (!D) return;
    const all = [...D.src.map((s, i) => ["s" + i, s.v]), ...D.dst.map((s, i) => ["d" + i, s.v])];
    st.cur = st.cur || {};
    all.forEach(([k, v]) => { st.cur[k] = st.cur[k] == null ? v : lerp(st.cur[k], v, 0.12); });
    const narrow = w < 520;
    const L = narrow ? 8 : 128, R = narrow ? 128 : 196, top = 10, bot = 10, nodeW = 10;
    const src = D.src.map((s, i) => ({ ...s, v: Math.max(0, st.cur["s" + i]) })), dst = D.dst.map((s, i) => ({ ...s, v: Math.max(0, st.cur["d" + i]) }));
    const T = Math.max(1, src.reduce((a, s) => a + s.v, 0), dst.reduce((a, s) => a + s.v, 0));
    const gapD = 5, gapS = 10;
    const usable = h - top - bot - Math.max(0, dst.length - 1) * gapD;
    const k = usable / T;
    const x0 = L, x1 = w - R;
    let y = top + (h - top - bot - (src.reduce((a, s) => a + s.v, 0) * k + (src.length - 1) * gapS)) / 2;
    src.forEach(s => { s.y = y; s.h = s.v * k; s.fill = 0; y += s.h + gapS; });
    y = top; dst.forEach(d => { d.y = y; d.h = d.v * k; d.fill = 0; y += d.h + gapD; });
    /* links */
    const links = []; let si = 0;
    dst.forEach(d => { let need = d.v; while (need > 1e-6 && si < src.length) { const s = src[si], take = Math.min(need, s.v - s.fill); if (take > 1e-6) { links.push({ s, d, v: take, ys: s.y + s.fill * k, yd: d.y + (d.v - need) * k, c: d.c }); s.fill += take; need -= take; } if (s.v - s.fill <= 1e-6) si++; } });
    const xm = (x0 + nodeW + x1) / 2;
    links.forEach((ln, i) => {
      const th = ln.v * k, a0 = x0 + nodeW, a1 = x1;
      x.beginPath(); x.moveTo(a0, ln.ys); x.bezierCurveTo(xm, ln.ys, xm, ln.yd, a1, ln.yd); x.lineTo(a1, ln.yd + th); x.bezierCurveTo(xm, ln.yd + th, xm, ln.ys + th, a0, ln.ys + th); x.closePath();
      x.fillStyle = alpha(ln.c, 0.2); x.fill();
      /* particles */
      const N = Math.max(2, Math.round(ln.v / T * 150));
      x.fillStyle = V.resolve(ln.c);
      for (let j = 0; j < N; j++) {
        const seed = Math.sin((i + 1) * 91.7 + j * 12.9898) * 43758.5453, r = seed - Math.floor(seed);
        const sp = 0.10 + r * 0.08, tt = ((j / N) + t * sp + r) % 1;
        const px = bez(a0, xm, xm, a1, tt), off = (r * 0.8 + 0.1) * th;
        const py = bez(ln.ys, ln.ys, ln.yd, ln.yd, tt) + off;
        x.globalAlpha = 0.35 + 0.65 * Math.sin(tt * Math.PI); x.beginPath(); x.arc(px, py, Math.min(2.2, 0.6 + th / 14), 0, 7); x.fill();
      }
      x.globalAlpha = 1;
    });
    /* nodes + labels */
    x.textBaseline = "middle";
    src.forEach(s => {
      x.fillStyle = V.resolve(s.c); x.fillRect(x0, s.y, nodeW, Math.max(1, s.h));
      if (!narrow) { x.textAlign = "right"; x.font = fontSans; x.fillStyle = V.col.muted; x.fillText(s.l, x0 - 10, s.y + s.h / 2 - 8); x.font = fontMono; x.fillStyle = V.col.fg; x.fillText(money(s.v) + (D.unit || ""), x0 - 10, s.y + s.h / 2 + 8); }
    });
    dst.forEach(d => {
      x.fillStyle = V.resolve(d.c); x.fillRect(x1, d.y, nodeW, Math.max(1, d.h));
      if (d.v < 0.5 && dst.length > 7) return;
      const cy = d.y + d.h / 2; x.textAlign = "left";
      x.font = fontSans; x.fillStyle = V.col.muted; x.fillText(d.l, x1 + nodeW + 8, cy - (d.h > 22 ? 7 : 0) );
      x.font = fontMono; x.fillStyle = V.resolve(d.c);
      if (d.h > 22) x.fillText(money(d.v), x1 + nodeW + 8, cy + 8); else { const tw = x.measureText(d.l).width; x.font = fontMono; x.fillText(money(d.v), x1 + nodeW + 8 + Math.min(tw, 110) + 8 + 0, cy); }
    });
  });

  /* ---------- Capital curve (BRRRR / flips) ----------
     get() -> { span, phases:[{a,b,l,c}], lines:[{l,c,pts:[[m,v]]}], marks:[{m,l}] } */
  V.capital = (canvas, get) => V.mount(canvas, (x, w, h, t, st) => {
    const D = get(); if (!D) return;
    const L = 64, R = 18, T = 40, B = 30, cw = w - L - R, ch = h - T - B;
    const ys = D.lines.flatMap(l => l.pts.map(p => p[1])).concat([0]);
    let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = (y1 - y0) * 0.1 || 1; y1 += pad; y0 = y0 < 0 ? y0 - pad : 0;
    const X = m => L + m / D.span * cw, Y = v => T + (y1 - v) / (y1 - y0) * ch;
    /* playhead */
    const cyc = 9, dur = 6.5;
    let ph = V.reduced ? 1 : Math.min(1, ((t % cyc) / dur));
    if (st.scrub != null && performance.now() - st.scrubAt < 4000) ph = st.scrub; else if (st.scrub != null && !st.drag) st.scrub = null;
    const pm = ph * D.span;
    /* phases */
    D.phases.forEach(p => {
      const a = X(p.a), b = X(p.b), on = pm >= p.a;
      x.fillStyle = alpha(p.c, on ? 0.16 : 0.06); x.fillRect(a, T, b - a, ch);
      x.fillStyle = alpha(p.c, on ? 1 : 0.35); x.fillRect(a, 10, b - a - 2, 4);
      x.font = '600 10px "JetBrains Mono", monospace'; x.textAlign = "left"; x.textBaseline = "alphabetic"; x.fillStyle = on ? V.resolve(p.c) : V.col.muted;
      if (b - a > 40) x.fillText(p.l.toUpperCase(), a + 2, 30);
    });
    /* grid */
    x.strokeStyle = V.col.line; x.lineWidth = 1; x.font = fontMono; x.fillStyle = V.col.muted; x.textAlign = "right"; x.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4; x.globalAlpha = .6; x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(w - R, Y(v)); x.stroke(); x.globalAlpha = 1; x.fillText((Math.abs(v) >= 1000 ? (v < 0 ? "−" : "") + "$" + Math.round(Math.abs(v) / 1000) + "k" : money(v)), L - 8, Y(v)); }
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    for (let m = 0; m <= D.span; m += Math.max(1, Math.round(D.span / 8))) x.fillText("M" + m, X(m), h - 10);
    if (y0 < 0) { x.strokeStyle = V.col.muted; x.beginPath(); x.moveTo(L, Y(0)); x.lineTo(w - R, Y(0)); x.stroke(); }
    /* lines up to playhead */
    const valAt = (pts, m) => { let v = pts[0][1]; for (let i = 0; i < pts.length; i++) { if (pts[i][0] <= m) v = pts[i][1]; else break; } return v; };
    D.lines.forEach(l => {
      x.strokeStyle = V.resolve(l.c); x.lineWidth = 2.5; x.lineJoin = "round"; x.beginPath();
      let first = true, prevV = null;
      for (let i = 0; i < l.pts.length; i++) {
        const [m, v] = l.pts[i]; if (m > pm) break;
        if (first) { x.moveTo(X(m), Y(v)); first = false; } else { x.lineTo(X(m), Y(prevV)); x.lineTo(X(m), Y(v)); }
        prevV = v;
      }
      if (prevV != null) x.lineTo(X(pm), Y(prevV));
      x.stroke();
      if (l.fill && prevV != null) { x.lineTo(X(pm), Y(0)); x.lineTo(X(l.pts[0][0]), Y(0)); x.closePath(); x.fillStyle = alpha(l.c, 0.10); x.fill(); }
    });
    /* playhead + readout */
    x.strokeStyle = V.col.fg; x.globalAlpha = .5; x.setLineDash([3, 4]); x.beginPath(); x.moveTo(X(pm), T); x.lineTo(X(pm), T + ch); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
    const cur = D.phases.find(p => pm >= p.a && pm <= p.b) || D.phases[D.phases.length - 1];
    const rows = D.lines.map(l => [l.l, valAt(l.pts, pm), l.c]);
    const bw = 196, bh = 22 + rows.length * 18, bx = Math.min(w - R - bw, Math.max(L, X(pm) + 10)), by = T + 8;
    x.fillStyle = alpha(V.col.panel, 0.92); x.strokeStyle = V.col.line; x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, 8) : x.rect(bx, by, bw, bh); x.fill(); x.stroke();
    x.textAlign = "left"; x.font = '600 11px "JetBrains Mono", monospace'; x.fillStyle = V.resolve(cur.c); x.fillText(`MONTH ${pm.toFixed(1)} · ${cur.l.toUpperCase()}`, bx + 10, by + 16);
    rows.forEach((r, i) => { x.font = fontSans; x.fillStyle = V.col.muted; x.fillText(r[0], bx + 10, by + 34 + i * 18); x.font = fontMono; x.textAlign = "right"; x.fillStyle = V.resolve(r[2]); x.fillText(money(r[1]), bx + bw - 10, by + 34 + i * 18); x.textAlign = "left"; });
  }, { scrub: true, padL: 64, padR: 18 });

  /* ---------- Amortization tide ----------
     get() -> { rows:[{yr,interest,principal,balance}], loan } */
  V.amort = (canvas, get) => V.mount(canvas, (x, w, h, t, st) => {
    const D = get(); if (!D || !D.rows.length) return;
    const L = 56, R = 56, T = 16, B = 28, cw = w - L - R, ch = h - T - B, n = D.rows.length;
    const maxPay = Math.max(...D.rows.map(r => r.interest + r.principal)) || 1;
    const bw = cw / n;
    let ph = V.reduced ? 1 : Math.min(1, (t % 10) / 7);
    if (st.scrub != null && performance.now() - st.scrubAt < 4000) ph = st.scrub;
    const upto = ph * n;
    x.font = fontMono; x.fillStyle = V.col.muted; x.textBaseline = "middle";
    x.textAlign = "right"; [0, .5, 1].forEach(f => { x.fillText("$" + Math.round(maxPay * f / 1000) + "k/yr", L - 6, T + ch * (1 - f)); });
    x.textAlign = "left"; [0, .5, 1].forEach(f => { x.fillText("$" + Math.round(D.loan * f / 1000) + "k", w - R + 6, T + ch * (1 - f)); });
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    D.rows.forEach((r, i) => {
      if (i > upto) return;
      const grow = Math.min(1, upto - i);
      const hi = r.interest / maxPay * ch * grow, hp = r.principal / maxPay * ch * grow, xx = L + i * bw + 1;
      x.fillStyle = V.col.c1; x.fillRect(xx, T + ch - hi, bw - 2, hi);
      x.fillStyle = V.col.c2; x.fillRect(xx, T + ch - hi - hp, bw - 2, hp);
      if ((i + 1) % 5 === 0 || i === 0) { x.fillStyle = V.col.muted; x.fillText("Y" + r.yr, xx + bw / 2, h - 8); }
    });
    /* balance line */
    x.strokeStyle = V.col.fg; x.lineWidth = 2; x.beginPath(); x.moveTo(L, T);
    D.rows.forEach((r, i) => { if (i < upto) x.lineTo(L + (i + 1) * bw, T + ch * (1 - r.balance / D.loan)); }); x.stroke();
    const yi = Math.min(n - 1, Math.max(0, Math.floor(upto - 0.001)));
    const r = D.rows[yi], share = r.interest / (r.interest + r.principal) * 100;
    const bx = Math.min(w - R - 210, L + yi * bw + bw + 8), by = T + 6;
    x.fillStyle = alpha(V.col.panel, .92); x.strokeStyle = V.col.line; x.beginPath(); x.roundRect ? x.roundRect(bx, by, 200, 74, 8) : x.rect(bx, by, 200, 74); x.fill(); x.stroke();
    x.textAlign = "left"; x.font = '600 11px "JetBrains Mono", monospace'; x.fillStyle = V.col.fg; x.fillText("YEAR " + r.yr, bx + 10, by + 18);
    x.font = fontSans; x.fillStyle = V.col.c1; x.fillText(`Interest ${share.toFixed(0)}% · ${money(r.interest)}`, bx + 10, by + 38);
    x.fillStyle = V.col.c2; x.fillText(`Principal ${(100 - share).toFixed(0)}% · ${money(r.principal)}`, bx + 10, by + 54);
    x.fillStyle = V.col.muted; x.fillText(`Balance ${money(r.balance)}`, bx + 10, by + 68);
  }, { scrub: true, padL: 56, padR: 56 });

  /* ---------- Stacked area reveal (wealth engines) ----------
     get() -> { years, layers:[{l,c,vals:[]}] } */
  V.stackArea = (canvas, get) => V.mount(canvas, (x, w, h, t, st) => {
    const D = get(); if (!D) return;
    const L = 60, R = 16, T = 14, B = 26, cw = w - L - R, ch = h - T - B, n = D.years;
    const tot = Array.from({ length: n }, (_, i) => D.layers.reduce((s, l) => s + Math.max(0, l.vals[i]), 0));
    const mx = Math.max(1, ...tot);
    let ph = V.reduced ? 1 : Math.min(1, (t % 11) / 8);
    if (st.scrub != null && performance.now() - st.scrubAt < 4000) ph = st.scrub;
    const upto = Math.max(1, ph * (n - 1));
    const X = i => L + i / (n - 1) * cw, Y = v => T + ch - v / mx * ch;
    x.font = fontMono; x.fillStyle = V.col.muted; x.textAlign = "right"; x.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) { const v = mx * i / 4; x.strokeStyle = V.col.line; x.globalAlpha = .5; x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(w - R, Y(v)); x.stroke(); x.globalAlpha = 1; x.fillText("$" + Math.round(v / 1000) + "k", L - 6, Y(v)); }
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    for (let i = 0; i < n; i += 5) x.fillText("Y" + (i + 1), X(i), h - 8);
    const base = new Array(n).fill(0);
    D.layers.forEach(l => {
      x.beginPath(); const lim = Math.floor(upto);
      for (let i = 0; i <= lim; i++) x.lineTo(X(i), Y(base[i] + Math.max(0, l.vals[i])));
      const fr = upto - lim; if (lim + 1 < n) { const a = base[lim] + Math.max(0, l.vals[lim]), b = base[lim + 1] + Math.max(0, l.vals[lim + 1]); x.lineTo(X(lim + fr), Y(a + (b - a) * fr)); }
      if (lim + 1 < n) { const a = base[lim], b = base[lim + 1]; x.lineTo(X(lim + fr), Y(a + (b - a) * fr)); }
      for (let i = lim; i >= 0; i--) x.lineTo(X(i), Y(base[i]));
      x.closePath(); x.fillStyle = alpha(l.c, .75); x.fill();
      for (let i = 0; i < n; i++) base[i] += Math.max(0, l.vals[i]);
    });
    const yi = Math.min(n - 1, Math.round(upto));
    x.strokeStyle = V.col.fg; x.setLineDash([3, 4]); x.beginPath(); x.moveTo(X(upto), T); x.lineTo(X(upto), T + ch); x.stroke(); x.setLineDash([]);
    const bx = Math.min(w - R - 200, X(upto) + 10), by = T + 4, bh = 26 + D.layers.length * 17;
    x.fillStyle = alpha(V.col.panel, .92); x.strokeStyle = V.col.line; x.beginPath(); x.roundRect ? x.roundRect(bx, by, 190, bh, 8) : x.rect(bx, by, 190, bh); x.fill(); x.stroke();
    x.textAlign = "left"; x.font = '600 11px "JetBrains Mono", monospace'; x.fillStyle = V.col.fg; x.fillText(`YEAR ${yi + 1} · ${money(tot[yi])}`, bx + 10, by + 17);
    D.layers.slice().reverse().forEach((l, i) => { x.font = fontSans; x.fillStyle = V.resolve(l.c); x.fillText(l.l, bx + 10, by + 36 + i * 17); x.textAlign = "right"; x.font = fontMono; x.fillText(money(l.vals[yi]), bx + 180, by + 36 + i * 17); x.textAlign = "left"; });
  }, { scrub: true, padL: 60, padR: 16 });

  /* ---------- Ambient hero: property grid w/ flowing dollars (Deal Hub header) ---------- */
  V.pulse = (canvas, get) => V.mount(canvas, (x, w, h, t) => {
    const D = get() || { cf: 0 };
    const pos = D.cf >= 0, c = pos ? V.col.good : V.col.bad;
    x.strokeStyle = alpha(V.col.line, .8); x.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 24) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
    for (let gy = 0; gy < h; gy += 24) { x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke(); }
    const N = Math.min(60, 8 + Math.abs(D.cf) / 12);
    for (let i = 0; i < N; i++) {
      const r = (Math.sin(i * 77.7) * 1e4) % 1, r2 = Math.abs((Math.sin(i * 13.1) * 1e4) % 1);
      const tt = (t * (0.05 + Math.abs(r) * 0.06) + Math.abs(r)) % 1;
      const px = pos ? tt * w : (1 - tt) * w, py = 10 + r2 * (h - 20) + Math.sin(tt * 6 + i) * 4;
      x.fillStyle = alpha(c, 0.15 + 0.6 * Math.sin(tt * Math.PI)); x.fillRect(Math.round(px / 24) * 24 - 2 + (px % 24), py, 3, 3);
    }
  });

  G.V = V;
})(window);
