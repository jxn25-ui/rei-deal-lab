/* REI Deal Lab — formatting, form fields, KPI tiles, SVG charts */
(function (G) {
  const U = {};
  const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  U.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.$ = v => !isFinite(v) ? (v > 0 ? "∞" : "—") : (v < 0 ? "−$" : "$") + nf0.format(Math.abs(Math.round(v)));
  U.$c = v => !isFinite(v) ? "—" : (v < 0 ? "−$" : "$") + nf2.format(Math.abs(v));
  U.$k = v => { if (!isFinite(v)) return "—"; const a = Math.abs(v), s = v < 0 ? "−$" : "$";
    return a >= 1e6 ? s + (a / 1e6).toFixed(2) + "M" : a >= 1e4 ? s + Math.round(a / 1000) + "k" : a >= 1000 ? s + (a / 1000).toFixed(1) + "k" : s + Math.round(a); };
  U.pct = (v, d = 1) => !isFinite(v) ? (v > 0 ? "∞" : "—") : (v < 0 ? "−" : "") + Math.abs(v).toFixed(d) + "%";
  U.x = (v, d = 2) => !isFinite(v) ? "∞" : v.toFixed(d) + "×";
  U.num = (v, d = 0) => !isFinite(v) ? "—" : d ? (+v).toFixed(d) : nf0.format(Math.round(v));
  U.mo = v => U.$(v) + "/mo";
  U.tone = (v, good, warn) => v >= good ? "good" : v >= warn ? "warn" : "bad";

  /* ---------- path get/set ---------- */
  U.get = (o, path) => path.split(".").reduce((a, k) => a == null ? a : a[k], o);
  U.set = (o, path, v) => { const ks = path.split("."); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null) a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };

  /* ---------- fields ----------
     def: {k, l, t: money|pct|num|yrs|mo|sel|tog|text, min, max, step, opts:[[v,label]], hint, s: slider? } */
  U.fmtField = (t, v) => {
    if (v === "" || v == null || (typeof v === "number" && !isFinite(v))) return "";
    if (t === "money") return nf0.format(Math.round(+v));
    if (t === "pct") return String(+(+v).toFixed(3));
    if (t === "text") return v;
    return String(+(+v).toFixed(2));
  };
  U.parse = s => { const x = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isFinite(x) ? x : 0; };
  const unit = { money: ["$", ""], pct: ["", "%"], yrs: ["", "yrs"], mo: ["", "mo"], num: ["", ""], sqft: ["", "sf"], text: ["", ""] };
  U.field = (def, val) => {
    const id = "f-" + def.k.replace(/\./g, "-");
    const hint = def.hint ? `<span class="hint" tabindex="0" data-tip="${U.esc(def.hint)}">?</span>` : "";
    if (def.t === "sel") {
      return `<div class="fld fld-sel"><label for="${id}">${U.esc(def.l)}${hint}</label>
        <select id="${id}" data-path="${def.k}" data-t="sel">${def.opts.map(o => `<option value="${U.esc(o[0])}"${String(o[0]) === String(val) ? " selected" : ""}>${U.esc(o[1])}</option>`).join("")}</select></div>`;
    }
    if (def.t === "tog") {
      return `<div class="fld fld-tog"><label class="tog" for="${id}"><input type="checkbox" id="${id}" data-path="${def.k}" data-t="tog"${val ? " checked" : ""}><span class="tog-ui" aria-hidden="true"></span><span>${U.esc(def.l)}</span>${hint}</label></div>`;
    }
    if (def.t === "seg") {
      return `<div class="fld"><span class="lbl">${U.esc(def.l)}${hint}</span><div class="seg" role="radiogroup" data-path="${def.k}">${def.opts.map(o =>
        `<button type="button" role="radio" aria-checked="${String(o[0]) === String(val)}" data-val="${U.esc(o[0])}" class="${String(o[0]) === String(val) ? "on" : ""}">${U.esc(o[1])}</button>`).join("")}</div></div>`;
    }
    const [pre, suf] = unit[def.t] || ["", ""];
    const slider = def.s && def.max != null ? `<input type="range" class="rng" tabindex="-1" aria-hidden="true" data-path="${def.k}" data-t="${def.t}" min="${def.min ?? 0}" max="${def.max}" step="${def.step ?? 1}" value="${+val || 0}">` : "";
    return `<div class="fld${def.s ? " has-rng" : ""}"><label for="${id}">${U.esc(def.l)}${hint}</label>
      <div class="inp"><span class="pre">${pre}</span><input id="${id}" type="text" inputmode="${def.t === "text" ? "text" : "decimal"}" autocomplete="off" data-path="${def.k}" data-t="${def.t}" value="${U.esc(U.fmtField(def.t, val))}"><span class="suf">${suf}</span></div>${slider}</div>`;
  };
  U.fieldset = (title, defs, state, extra = "") =>
    `<fieldset class="fs"><legend>${U.esc(title)}</legend><div class="fs-grid">${defs.map(d => U.field(d, U.get(state, d.k))).join("")}</div>${extra}</fieldset>`;

  /* keep inputs in sync with state without clobbering the one being typed in */
  U.sync = (root, state) => {
    root.querySelectorAll("[data-path]").forEach(el => {
      const v = U.get(state, el.dataset.path);
      if (el.classList.contains("seg")) { el.querySelectorAll("button").forEach(b => { const on = String(b.dataset.val) === String(v); b.classList.toggle("on", on); b.setAttribute("aria-checked", on); }); return; }
      if (el === document.activeElement && el.type !== "range") return;
      if (el.type === "checkbox") el.checked = !!v;
      else if (el.tagName === "SELECT") el.value = v;
      else if (el.type === "range") { if (document.activeElement !== el) el.value = +v || 0; }
      else el.value = U.fmtField(el.dataset.t, v);
    });
  };

  /* ---------- KPI tiles ---------- */
  U.kpi = k => `<button type="button" class="kpi ${k.tone || ""}${k.big ? " big" : ""}" aria-expanded="false">
      <span class="kpi-l">${U.esc(k.l)}</span><span class="kpi-v">${k.v}</span>${k.sub ? `<span class="kpi-s">${k.sub}</span>` : ""}
      ${k.m ? `<span class="kpi-m">${k.m}</span>` : ""}</button>`;
  U.kpis = list => `<div class="kpis">${list.map(U.kpi).join("")}</div>`;
  U.math = (expr, res) => `<code>${expr}</code><b>= ${res}</b>`;

  /* ---------- ledger ---------- */
  U.ledger = (rows, title) => `<div class="ledger">${title ? `<h4>${U.esc(title)}</h4>` : ""}<table>${rows.map(r => {
    if (r.sep) return `<tr class="sep"><td colspan="2"></td></tr>`;
    return `<tr class="${r.c || ""}"><td>${r.l}${r.n ? `<small>${r.n}</small>` : ""}</td><td>${r.v}</td></tr>`;
  }).join("")}</table></div>`;

  /* ---------- SVG charts ---------- */
  const W = 640;
  U.barsH = (rows, o = {}) => {
    const fmt = o.fmt || U.$, max = Math.max(1, ...rows.map(r => Math.abs(r.v)));
    return `<div class="hbars" style="--lw:${o.lw || 150}px" role="img" aria-label="${U.esc(o.label || "Bar chart")}">${rows.map((r, i) =>
      `<div class="hb" style="--i:${i}"><span class="hb-l">${U.esc(r.l)}</span><span class="hb-t"><i style="width:${Math.max(1, Math.abs(r.v) / max * 100)}%;background:${r.c || (r.v < 0 ? "var(--bad)" : "var(--accent)")}"></i></span><span class="hb-v">${fmt(r.v)}${r.tag ? `<small>${U.esc(r.tag)}</small>` : ""}</span></div>`).join("")}</div>`;
  };
  U.waterfall = (steps, o = {}) => {
    const h = 250, top = 18, bot = 54, ch = h - top - bot, n = steps.length, gap = 10, bw = (W - 20 - gap * (n - 1)) / n;
    let run = 0; const pts = steps.map(s => { let a, b; if (s.type === "start" || s.type === "end") { a = 0; b = s.v; run = s.v; } else { a = run; b = run + s.v; run = b; } return { ...s, a, b }; });
    const vals = pts.flatMap(p => [p.a, p.b, 0]); const mx = Math.max(...vals), mn = Math.min(...vals), rng = mx - mn || 1;
    const Y = v => top + (mx - v) / rng * ch;
    return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${U.esc(o.label || "Waterfall")}">
      <line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" class="axis"/>
      ${pts.map((p, i) => {
        const x = 10 + i * (bw + gap), y = Math.min(Y(p.a), Y(p.b)), hh = Math.max(2, Math.abs(Y(p.a) - Y(p.b)));
        const col = p.type === "start" ? "var(--c2)" : p.type === "end" ? (p.b >= 0 ? "var(--good)" : "var(--bad)") : p.v < 0 ? "var(--c1)" : "var(--good)";
        const label = p.l.split(" ");
        return `<rect x="${x}" y="${y}" width="${bw}" height="${hh}" rx="2" style="fill:${col};--d:${i * 50}ms" class="rise"/>
          ${i < n - 1 ? `<line x1="${x + bw}" x2="${x + bw + gap}" y1="${Y(p.b)}" y2="${Y(p.b)}" class="axis dash"/>` : ""}
          <text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" class="cv sm">${U.$k(p.type === "start" || p.type === "end" ? p.b : p.v)}</text>
          <text x="${x + bw / 2}" y="${h - bot + 16}" text-anchor="middle" class="ct sm">${U.esc(label.slice(0, 2).join(" "))}</text>
          ${label.length > 2 ? `<text x="${x + bw / 2}" y="${h - bot + 30}" text-anchor="middle" class="ct sm">${U.esc(label.slice(2).join(" "))}</text>` : ""}`;
      }).join("")}</svg>`;
  };
  U.donut = (segs, center, sub) => {
    const tot = segs.reduce((s, x) => s + Math.max(0, x.v), 0) || 1, R = 70, r = 46, cx = 90, cy = 90; let a0 = -Math.PI / 2;
    const arcs = segs.filter(s => s.v > 0).map(s => {
      const a1 = a0 + s.v / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
      const P = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
      const d = s.v / tot > 0.9999 ? `M${cx - R},${cy}a${R},${R} 0 1,0 ${R * 2},0a${R},${R} 0 1,0 ${-R * 2},0M${cx - r},${cy}a${r},${r} 0 1,1 ${r * 2},0a${r},${r} 0 1,1 ${-r * 2},0`
        : `M${P(R, a0)}A${R},${R} 0 ${large},1 ${P(R, a1)}L${P(r, a1)}A${r},${r} 0 ${large},0 ${P(r, a0)}Z`;
      a0 = a1; return `<path d="${d}" style="fill:${s.c}" fill-rule="evenodd"><title>${U.esc(s.l)}: ${U.$(s.v)}</title></path>`;
    }).join("");
    return `<div class="donut-wrap"><svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Breakdown">${arcs}
      <text x="90" y="88" text-anchor="middle" class="cv dn">${center}</text><text x="90" y="106" text-anchor="middle" class="ct sm">${sub || ""}</text></svg>
      <ul class="legend">${segs.filter(s => s.v > 0).map(s => `<li><i style="background:${s.c}"></i><span>${U.esc(s.l)}</span><b>${U.$(s.v)}</b></li>`).join("")}</ul></div>`;
  };
  /* line/area chart. series: [{name, c, pts:[[x,y]], area, dash}] */
  U.line = (series, o = {}) => {
    const h = o.h || 240, l = 58, r = 14, t = 14, b = 28, cw = W - l - r, ch = h - t - b;
    const xs = series.flatMap(s => s.pts.map(p => p[0])), ys = series.flatMap(s => s.pts.map(p => p[1])).concat(o.zero === false ? [] : [0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(...ys), y1 = Math.max(...ys); if (y1 === y0) y1 = y0 + 1;
    const pad = (y1 - y0) * 0.06; y1 += pad; if (y0 < 0) y0 -= pad;
    const X = v => l + (v - x0) / ((x1 - x0) || 1) * cw, Y = v => t + (y1 - v) / (y1 - y0) * ch;
    const fmt = o.fmt || U.$k, ticks = 4;
    let g = "";
    for (let i = 0; i <= ticks; i++) { const v = y0 + (y1 - y0) * i / ticks; g += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${l - 8}" y="${Y(v) + 4}" text-anchor="end" class="ct sm">${fmt(v)}</text>`; }
    const xt = o.xticks || [x0, Math.round((x0 + x1) / 2), x1];
    xt.forEach(v => g += `<text x="${X(v)}" y="${h - 8}" text-anchor="middle" class="ct sm">${o.xfmt ? o.xfmt(v) : v}</text>`);
    if (y0 < 0) g += `<line x1="${l}" x2="${W - r}" y1="${Y(0)}" y2="${Y(0)}" class="axis"/>`;
    const paths = series.map(s => {
      const d = s.pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
      const area = s.area ? `<path d="${d}L${X(s.pts[s.pts.length - 1][0])},${Y(Math.max(0, y0))}L${X(s.pts[0][0])},${Y(Math.max(0, y0))}Z" style="fill:${s.c};opacity:.14"/>` : "";
      const last = s.pts[s.pts.length - 1];
      return `${area}<path d="${d}" class="ln${s.dash ? " dash" : ""}" style="stroke:${s.c}"/><circle cx="${X(last[0])}" cy="${Y(last[1])}" r="4" style="fill:${s.c}"/>`;
    }).join("");
    const legend = `<div class="legend row">${series.map(s => `<span><i style="background:${s.c}"></i>${U.esc(s.name)}</span>`).join("")}</div>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${U.esc(o.label || "Line chart")}">${g}${paths}</svg>${legend}`;
  };
  /* stacked horizontal bar (single row) used for ARV breakdowns */
  U.stack = (segs, o = {}) => {
    const tot = segs.reduce((s, x) => s + Math.max(0, x.v), 0) || 1;
    return `<div class="stackbar" role="img" aria-label="${U.esc(o.label || "Breakdown")}">${segs.filter(s => s.v > 0).map((s, i) =>
      `<div class="sb-seg" style="flex:${s.v / tot};background:${s.c};--d:${i * 80}ms" title="${U.esc(s.l)}: ${U.$(s.v)}"><span>${U.esc(s.l)}</span><b>${U.$k(s.v)}</b></div>`).join("")}</div>`;
  };
  U.pill = (txt, tone) => `<span class="pill ${tone || ""}">${txt}</span>`;
  U.verdict = (tone, title, body) => `<div class="verdict ${tone}"><span class="vd-dot"></span><div><b>${title}</b><p>${body}</p></div></div>`;

  /* playbook block */
  U.playbook = pb => `<div class="pb">
    <p class="pb-what">${pb.what}</p>
    <div class="pb-grid">
      <section><h4>Use it when</h4><ul>${pb.when.map(x => `<li>${x}</li>`).join("")}</ul></section>
      <section><h4>How the deal moves</h4><ol>${pb.steps.map(x => `<li>${x}</li>`).join("")}</ol></section>
      <section><h4>Formulas to know cold</h4><ul class="fx">${pb.fx.map(x => `<li><code>${x[0]}</code><span>${x[1]}</span></li>`).join("")}</ul></section>
      <section><h4>Red flags & risk</h4><ul>${pb.flags.map(x => `<li>${x}</li>`).join("")}</ul></section>
    </div></div>`;

  G.U = U;
})(window);
