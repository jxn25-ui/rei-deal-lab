/* REI Deal Lab — glossary: auto-linked key terms with hover bubbles, plus the Glossary tab */
(function (G) {
  const { U, App } = G;
  const TERMS = REI.terms;
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  TERMS.forEach(t => t.id = slug(t.t));
  const byId = Object.fromEntries(TERMS.map(t => [t.id, t]));
  const byName = Object.fromEntries(TERMS.map(t => [t.t.toLowerCase(), t]));

  /* alias → term; acronyms (all caps / mixed like CoC, CapEx) must match case exactly */
  const alias = new Map();
  const isCaseSensitive = s => /^[A-Z0-9&\-]{2,7}$/.test(s) || /^(CoC|CapEx|Sub2)$/.test(s);
  TERMS.forEach(t => [t.t, ...(t.a || [])].forEach(a => { const k = a.toLowerCase(); if (!alias.has(k)) alias.set(k, { term: t, cs: isCaseSensitive(a) ? a : null }); }));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = [...alias.keys()].sort((a, b) => b.length - a.length).map(esc).join("|");
  const RX = new RegExp(`(?<![A-Za-z0-9])(?:${pattern})(?:s|es)?(?![A-Za-z0-9])`, "gi");
  const lookup = m => {
    let k = m.toLowerCase(), hit = alias.get(k);
    if (!hit && /e?s$/i.test(m)) hit = alias.get(k.replace(/es$/, "")) || alias.get(k.replace(/s$/, ""));
    if (!hit) return null;
    if (hit.cs && !m.startsWith(hit.cs)) return null;
    return hit.term;
  };

  const SKIP = "input,textarea,select,option,script,style,svg,canvas,code.no-gl,.gt,#gpop,.nav,.seg,.cb,.mm,.brow,[data-go],h1,.eyebrow,.mh-tabs,.kpi-v,.chip,.tag,.btn,.gl-card,.big-v,.dstats,.ri-c,.sb-seg,.hb-v,.to-r b,.given dd";
  const BLOCK = ".kpi,.fs,.card,.pb-grid section,.pb-what,.verdict,.lab-h,.ri,.scr,.mh-txt,.fld,.hb,tr";
  const Gloss = G.Gloss = { on: App.LS.get("rdl.gloss", true) };

  Gloss.link = root => {
    if (!root || App.cur === "glossary") return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => {
      if (!n.nodeValue || n.nodeValue.length < 2 || !/[A-Za-z]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement; if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT; } });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue; RX.lastIndex = 0; let m, last = 0, frag = null;
      const block = node.parentElement.closest(BLOCK) || root;
      while ((m = RX.exec(text))) {
        const term = lookup(m[0]); if (!term) continue;
        if (block.querySelector(`.gt[data-k="${term.id}"]`) || (frag && frag.querySelector && frag.querySelector(`.gt[data-k="${term.id}"]`))) continue;
        frag = frag || document.createDocumentFragment();
        frag.append(text.slice(last, m.index));
        const s = document.createElement("span"); s.className = "gt"; s.dataset.k = term.id; s.tabIndex = 0; s.textContent = m[0];
        s.setAttribute("aria-describedby", "gpop"); frag.append(s); last = m.index + m[0].length;
      }
      if (frag) { frag.append(text.slice(last)); node.replaceWith(frag); }
    });
  };
  let tmr;
  Gloss.schedule = () => { clearTimeout(tmr); tmr = setTimeout(() => { try { Gloss.link(App.root); } catch (e) { console.error(e); } }, 60); };

  /* ---------- bubble ---------- */
  const pop = document.createElement("div");
  pop.id = "gpop"; pop.setAttribute("role", "tooltip"); pop.hidden = true;
  let cur = null, hideT, showT, pinned = false;
  const render = t => `<div class="gp-h"><b>${U.esc(t.t)}</b><span>${U.esc(t.c)}</span></div><p>${U.esc(t.d)}</p>
    ${t.f ? `<code>${U.esc(t.f)}</code>` : ""}${t.u ? `<p class="gp-u"><em>In this tool</em>${U.esc(t.u)}</p>` : ""}
    <div class="gp-f"><button type="button" class="link" data-gopen="${t.id}">Open in Glossary</button>${t.tab && App.mods[t.tab] && t.tab !== App.cur ? `<button type="button" class="link" data-go="${t.tab}">Go to ${U.esc(App.mods[t.tab].nav)}</button>` : ""}</div>`;
  const place = el => {
    const r = el.getBoundingClientRect(), pw = Math.min(340, innerWidth - 24);
    pop.style.width = pw + "px";
    let x = Math.max(12, Math.min(innerWidth - pw - 12, r.left + r.width / 2 - pw / 2));
    pop.style.left = x + "px"; pop.style.top = "0px"; pop.hidden = false;
    const ph = pop.offsetHeight; let y = r.bottom + 8, below = true;
    if (y + ph > innerHeight - 12 && r.top - ph - 8 > 12) { y = r.top - ph - 8; below = false; }
    pop.style.top = Math.max(12, y) + "px"; pop.dataset.side = below ? "b" : "t";
    pop.style.setProperty("--ax", Math.max(14, Math.min(pw - 14, r.left + r.width / 2 - x)) + "px");
  };
  Gloss.show = (el, pin) => {
    if (!Gloss.on && !pin) return;
    const t = byId[el.dataset.k]; if (!t) return;
    clearTimeout(hideT); if (cur) cur.classList.remove("act");
    cur = el; el.classList.add("act"); pinned = !!pin;
    pop.innerHTML = render(t); place(el);
    requestAnimationFrame(() => pop.classList.add("on"));
  };
  Gloss.hide = now => {
    clearTimeout(showT); clearTimeout(hideT);
    const go = () => { pop.classList.remove("on"); pop.hidden = true; if (cur) cur.classList.remove("act"); cur = null; pinned = false; };
    now ? go() : hideT = setTimeout(go, 180);
  };
  Gloss.open = id => { Gloss.hide(true); Gloss.target = id; App.go("glossary"); if (App.cur === "glossary") App.mods.glossary.focus(); };
  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(pop);
    document.body.classList.toggle("gl-off", !Gloss.on);
    const b = document.getElementById("glossBtn");
    const sync = () => { b.setAttribute("aria-pressed", Gloss.on); b.title = Gloss.on ? "Hover definitions are on" : "Hover definitions are off"; document.body.classList.toggle("gl-off", !Gloss.on); };
    sync();
    b.addEventListener("click", () => { Gloss.on = !Gloss.on; App.LS.set("rdl.gloss", Gloss.on); sync(); App.toast(Gloss.on ? "Hover definitions on: point at any underlined term" : "Hover definitions off. Click a term to still see it."); });
    document.addEventListener("pointerover", e => {
      if (e.pointerType === "touch") return;
      const g = e.target.closest && e.target.closest(".gt");
      if (g) { if (pinned && cur !== g) return; clearTimeout(hideT); clearTimeout(showT); if (cur !== g) showT = setTimeout(() => Gloss.show(g), 220); return; }
      if (e.target.closest && e.target.closest("#gpop")) { clearTimeout(hideT); return; }
      if (cur && !pinned) Gloss.hide();
      clearTimeout(showT);
    });
    document.addEventListener("click", e => {
      const op = e.target.closest("[data-gopen]"); if (op) { e.preventDefault(); Gloss.open(op.dataset.gopen); return; }
      if (e.target.closest("#gpop [data-go]")) { Gloss.hide(true); return; }
      const g = e.target.closest(".gt");
      if (g) { e.preventDefault(); e.stopPropagation(); if (cur === g && pinned) Gloss.hide(true); else Gloss.show(g, true); return; }
      if (!e.target.closest("#gpop") && cur) Gloss.hide(true);
    }, true);
    document.addEventListener("focusin", e => { const g = e.target.closest && e.target.closest(".gt"); if (g) Gloss.show(g); });
    document.addEventListener("focusout", e => { if (e.target.closest && e.target.closest(".gt") && !pinned) Gloss.hide(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && cur) { const c = cur; Gloss.hide(true); c.focus && c.focus(); } if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("gt")) { e.preventDefault(); Gloss.show(e.target, true); } });
    addEventListener("scroll", () => { if (cur) { if (pinned) place(cur); else Gloss.hide(true); } }, true);
    addEventListener("resize", () => cur && place(cur));
  });

  /* ---------- Glossary tab ---------- */
  const CATS = [...new Set(TERMS.map(t => t.c))];
  App.reg({
    id: "glossary", nav: "Glossary",
    render(root) {
      const sorted = TERMS.slice().sort((a, b) => a.t.localeCompare(b.t, undefined, { sensitivity: "base", numeric: true }));
      const letters = [...new Set(sorted.map(t => /[A-Z]/i.test(t.t[0]) ? t.t[0].toUpperCase() : "#"))];
      root.innerHTML = `<header class="mh"><div class="mh-txt"><p class="eyebrow">Learn & train</p><h1>Glossary</h1>
        <p class="lede">${TERMS.length} terms used across the tool, each with a plain-English definition, how it's used here, and the formula where there is one. Anywhere else in the app, point at a <span class="gt demo" tabindex="-1">dotted-underlined term</span> to see its definition in a bubble.</p></div></header>
        <div class="tb-bar"><input id="glSearch" type="search" placeholder="Search terms or definitions: capex, seasoning, DSCR…" aria-label="Search the glossary">
          <div class="chips" id="glCats"><button type="button" class="cb on" data-cat="">All</button>${CATS.map(c => `<button type="button" class="cb" data-cat="${U.esc(c)}">${U.esc(c)}</button>`).join("")}</div></div>
        <nav class="gl-az" aria-label="Jump to letter">${letters.map(l => `<button type="button" data-l="${l}">${l}</button>`).join("")}</nav>
        <p class="fine" id="glCount"></p>
        <div class="gl-list">${sorted.map(t => `<article class="gl-card card" id="g-${t.id}" data-cat="${U.esc(t.c)}" data-l="${/[A-Z]/i.test(t.t[0]) ? t.t[0].toUpperCase() : "#"}" data-q="${U.esc([t.t, ...(t.a || []), t.d, t.u || "", t.c].join(" ").toLowerCase())}">
          <div class="card-h"><h3>${U.esc(t.t)}</h3>${t.a && t.a.length ? `<span class="sub">${U.esc(t.a.slice(0, 3).join(" · "))}</span>` : ""}<span class="tag">${U.esc(t.c)}</span></div>
          <p class="gl-d">${U.esc(t.d)}</p>
          ${t.f ? `<code class="fx-line">${U.esc(t.f)}</code>` : ""}
          ${t.u ? `<p class="gl-u"><em>In this tool</em>${U.esc(t.u)}</p>` : ""}
          <div class="gl-foot">${(t.r || []).filter(n => byName[n.toLowerCase()]).map(n => `<button type="button" class="cb" data-gj="${byName[n.toLowerCase()].id}">${U.esc(n)}</button>`).join("")}
            ${t.tab && App.mods[t.tab] ? `<button type="button" class="link" data-go="${t.tab}">Open ${U.esc(App.mods[t.tab].nav)} →</button>` : ""}</div></article>`).join("")}</div>`;
      let cat = "";
      const filter = () => {
        const q = root.querySelector("#glSearch").value.toLowerCase().trim(); let n = 0;
        root.querySelectorAll(".gl-card").forEach(el => { const show = (!cat || el.dataset.cat === cat) && (!q || el.dataset.q.includes(q)); el.hidden = !show; if (show) n++; });
        root.querySelector("#glCount").textContent = `${n} of ${TERMS.length} terms`;
      };
      this.filter = filter; this.setCat = c => { cat = c; root.querySelectorAll("#glCats .cb").forEach(x => x.classList.toggle("on", x.dataset.cat === c)); };
      root.querySelector("#glSearch").addEventListener("input", filter);
      root.querySelector("#glCats").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; this.setCat(b.dataset.cat); filter(); });
      root.querySelector(".gl-az").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (!b) return; this.reset(); const el = root.querySelector(`.gl-card[data-l="${b.dataset.l}"]`); el && el.scrollIntoView({ behavior: "smooth", block: "start" }); });
      root.querySelector(".gl-list").addEventListener("click", e => { const b = e.target.closest("[data-gj]"); if (b) { Gloss.target = b.dataset.gj; this.focus(); } });
      filter();
      if (Gloss.target) setTimeout(() => this.focus(), 60);
    },
    reset() { const s = App.root.querySelector("#glSearch"); if (s && s.value) s.value = ""; this.setCat(""); this.filter(); },
    focus() {
      const id = Gloss.target; Gloss.target = null; if (!id) return;
      this.reset();
      const el = App.root.querySelector("#g-" + id); if (!el) return;
      el.scrollIntoView({ behavior: "auto", block: "center" });
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    },
    update() { }
  });
})(window);
