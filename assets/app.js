/* ============================================================
   Simón Movilidad · Client Portal — lógica de la aplicación
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.PORTAL_DATA || {};
  const CFG = window.PORTAL_CONFIG || {};
  const LS_KEY = "simon_portal_insumos_v1";

  const ESTADOS = ["Pendiente", "Solicitado", "Recibido", "No aplica"];

  // ---- helpers ------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let toastTimer;
  function toast(msg, kind) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 2600);
  }

  // ---- local persistence of insumo edits ---------------------------------
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch { return {}; }
  }
  function saveLocal(state) {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
  let localState = loadLocal();

  // ---- Google Sheets write (Apps Script Web App) --------------------------
  const hasEndpoint = !!(CFG.APPS_SCRIPT_URL && CFG.APPS_SCRIPT_URL.trim());

  async function pushToSheet(payload) {
    if (!hasEndpoint) return { ok: false, local: true };
    try {
      // text/plain evita el preflight CORS con Apps Script
      const res = await fetch(CFG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      return { ok: res.ok && out.ok !== false, data: out };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // ---- Views --------------------------------------------------------------
  const content = $("#content");
  const viewTitle = $("#viewTitle");
  const viewSub = $("#viewSub");

  function setSyncBadge() {
    const b = $("#syncBadge");
    const txt = $("#syncText");
    if (hasEndpoint) { b.className = "sync-badge live"; txt.textContent = "Sheets · en vivo"; }
    else { b.className = "sync-badge local"; txt.textContent = "Modo local"; }
  }

  // ----- Resumen -----
  function viewResumen() {
    viewTitle.textContent = "Resumen";
    viewSub.textContent = DATA.proyecto || "";
    const totalIns = DATA.insumos.length;
    const st = localState;
    const recibidos = DATA.insumos.filter(
      (i) => (st[i.num] && st[i.num].estado) === "Recibido"
    ).length;
    const abiertas = countTipo("abierta");
    const prof = countTipo("profundizar");

    content.innerHTML = "";
    const hero = el("div", "hero");
    hero.innerHTML =
      `<div class="eyebrow">${esc(DATA.agencia)} · Discovery</div>
       <h2>${esc(DATA.cliente)} — ${esc(DATA.subtitulo)}</h2>
       <p>Portal de la sesión de Discovery. Consolida los <b>insumos previos</b> que debe entregar
       Simón y la <b>batería de preguntas</b> por bloque, filtrada a las que están
       <b>abiertas</b> o requieren <b>profundizar</b> — las ya resueltas en el kickoff quedan fuera.</p>`;
    content.appendChild(hero);

    const grid = el("div", "grid cards-3");
    grid.appendChild(statCard("accent", DATA.totalQuestions, "Preguntas activas", "en " + DATA.sections.length + " bloques"));
    grid.appendChild(statCard("blue", abiertas, "Abiertas", "sin respuesta previa"));
    grid.appendChild(statCard("amber", prof, "Por profundizar", "parciales del kickoff"));
    grid.appendChild(statCard("accent", recibidos + "/" + totalIns, "Insumos recibidos", "solicitados a Simón"));
    content.appendChild(grid);

    // sheet link
    const cta = el("div", "card");
    cta.style.marginTop = "16px";
    cta.innerHTML =
      `<div class="sec-head" style="margin:0 0 10px"><h3>Insumos → Google Sheets</h3></div>
       <p class="muted" style="margin-bottom:12px">Los cambios de estado de los insumos se registran en la hoja
       de cálculo compartida${hasEndpoint ? " en tiempo real." : ". <b>Modo local activo:</b> configura el endpoint en <code>assets/config.js</code> para escribir al Sheet."}</p>
       <a class="sheet-link" target="_blank" rel="noopener" href="${esc(DATA.sheetUrl)}">▦ Abrir Google Sheet de insumos ↗</a>`;
    content.appendChild(cta);
  }

  function statCard(color, k, l, sub) {
    const c = el("div", "card stat " + color);
    c.innerHTML = `<div class="k">${esc(k)}</div><div class="l">${esc(l)}</div><div class="sub">${esc(sub)}</div>`;
    return c;
  }
  function countTipo(tipo) {
    let n = 0;
    DATA.sections.forEach((s) => s.subs.forEach((sub) => sub.items.forEach((q) => { if (q.tipo === tipo) n++; })));
    return n;
  }

  // ----- Insumos -----
  function viewInsumos() {
    viewTitle.textContent = "Insumos previos";
    viewSub.textContent = "Solicitados a Simón antes de la sesión";
    content.innerHTML = "";

    const note = el("div", hasEndpoint ? "callout" : "callout");
    note.innerHTML = hasEndpoint
      ? `Cada cambio de <b>Estado</b> u <b>Observaciones</b> se guarda automáticamente en el
         <a href="${esc(DATA.sheetUrl)}" target="_blank" rel="noopener">Google Sheet</a> compartido.`
      : `<b>Modo local:</b> los cambios se guardan en este navegador. Para escribirlos al
         <a href="${esc(DATA.sheetUrl)}" target="_blank" rel="noopener">Google Sheet</a>, despliega el Apps Script
         (<code>apps-script/Code.gs</code>) y pega su URL en <code>assets/config.js</code>.`;
    content.appendChild(note);

    const wrap = el("div", "table-wrap");
    const table = el("table", "insumos");
    table.innerHTML =
      `<thead><tr>
        <th style="width:36px">#</th>
        <th>Insumo</th>
        <th style="width:120px">Responsable</th>
        <th style="width:150px">Estado</th>
        <th style="width:200px">Observaciones</th>
      </tr></thead>`;
    const tbody = el("tbody");

    DATA.insumos.forEach((ins) => {
      const saved = localState[ins.num] || {};
      const estado = saved.estado || (ins.estado === "Pendiente" ? "Pendiente" : ins.estado) || "Pendiente";
      const obs = saved.observaciones != null ? saved.observaciones : ins.observaciones || "";

      const tr = el("tr");
      tr.innerHTML =
        `<td class="ins-num">${esc(ins.num)}</td>
         <td>
           <div class="ins-name">${esc(ins.insumo)}</div>
           <div class="ins-detail">${esc(ins.detalle)}</div>
         </td>
         <td class="muted">${esc(ins.responsable_simon || "—")}</td>
         <td></td>
         <td></td>`;

      // estado select
      const sel = el("select", "estado");
      sel.setAttribute("data-v", estado);
      ESTADOS.forEach((op) => {
        const o = el("option", null, op);
        o.value = op;
        if (op === estado) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => {
        sel.setAttribute("data-v", sel.value);
        onInsumoChange(ins, { estado: sel.value }, sel);
      });
      tr.children[3].appendChild(sel);

      // observaciones input
      const inp = el("input", "obs");
      inp.type = "text";
      inp.placeholder = "Nota…";
      inp.value = obs;
      let debTimer;
      inp.addEventListener("input", () => {
        clearTimeout(debTimer);
        debTimer = setTimeout(() => onInsumoChange(ins, { observaciones: inp.value }, inp), 700);
      });
      tr.children[4].appendChild(inp);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
    content.appendChild(wrap);
  }

  async function onInsumoChange(ins, patch, node) {
    // merge + persist locally
    const cur = localState[ins.num] || {};
    localState[ins.num] = Object.assign({}, cur, patch);
    saveLocal(localState);

    const now = new Date().toISOString();
    const payload = {
      action: "updateInsumo",
      num: ins.num,
      insumo: ins.insumo,
      estado: localState[ins.num].estado || "Pendiente",
      observaciones: localState[ins.num].observaciones || "",
      updatedAt: now,
      updatedBy: "portal",
    };

    if (!hasEndpoint) { toast("Guardado localmente", "ok"); return; }

    if (node) node.style.opacity = ".55";
    const r = await pushToSheet(payload);
    if (node) node.style.opacity = "1";
    if (r.ok) toast("Sincronizado con Google Sheets", "ok");
    else toast("No se pudo escribir al Sheet (guardado local)", "err");
  }

  // ----- Preguntas -----
  let qFilter = "todas";
  let qSearch = "";

  function viewPreguntas() {
    viewTitle.textContent = "Preguntas Discovery";
    viewSub.textContent = DATA.totalQuestions + " preguntas · abiertas y por profundizar";
    content.innerHTML = "";

    // filters
    const bar = el("div", "filters");
    const mk = (id, label) => {
      const c = el("button", "chip" + (qFilter === id ? " active" : ""), label);
      c.addEventListener("click", () => { qFilter = id; renderBlocks(); syncChips(bar); });
      c.dataset.id = id;
      return c;
    };
    bar.appendChild(mk("todas", "Todas"));
    bar.appendChild(mk("abierta", "○ Abiertas"));
    bar.appendChild(mk("profundizar", "◑ Por profundizar"));
    const search = el("input", "search");
    search.type = "search";
    search.placeholder = "Buscar en las preguntas…";
    search.value = qSearch;
    search.addEventListener("input", () => { qSearch = search.value.toLowerCase(); renderBlocks(); });
    bar.appendChild(search);
    content.appendChild(bar);

    const holder = el("div", null);
    holder.id = "blocksHolder";
    content.appendChild(holder);
    renderBlocks();
  }

  function syncChips(bar) {
    bar.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.id === qFilter));
  }

  function matches(q) {
    if (qFilter !== "todas" && q.tipo !== qFilter) return false;
    if (qSearch) {
      const hay = (q.pregunta + " " + (q.variable || "") + " " + (q.nota || "")).toLowerCase();
      if (!hay.includes(qSearch)) return false;
    }
    return true;
  }

  function renderBlocks() {
    const holder = $("#blocksHolder");
    holder.innerHTML = "";
    let shown = 0;

    DATA.sections.forEach((sec, idx) => {
      const visSubs = sec.subs
        .map((sub) => ({ subbloque: sub.subbloque, items: sub.items.filter(matches) }))
        .filter((sub) => sub.items.length);
      const cnt = visSubs.reduce((a, s) => a + s.items.length, 0);
      if (!cnt) return;
      shown += cnt;

      const block = el("div", "block" + (idx < 4 || qSearch || qFilter !== "todas" ? " open" : ""));
      const num = sec.bloque.match(/^(\d+|Complementarias|Cierre)/);
      const numLabel = /^\d/.test(sec.bloque) ? sec.bloque.split("·")[0].trim() : "◆";
      const title = sec.bloque.includes("·") ? sec.bloque.split("·").slice(1).join("·").trim() : sec.bloque;

      const head = el("div", "block-head");
      head.innerHTML =
        `<div class="block-num">${esc(numLabel)}</div>
         <div class="block-title">${esc(title || sec.bloque)}</div>
         <div class="block-meta">${cnt} ${cnt === 1 ? "pregunta" : "preguntas"}</div>
         <div class="chev">▶</div>`;
      head.addEventListener("click", () => block.classList.toggle("open"));
      block.appendChild(head);

      const body = el("div", "block-body");
      visSubs.forEach((sub) => {
        if (sub.subbloque) body.appendChild(el("div", "subhead", esc(sub.subbloque)));
        sub.items.forEach((q) => body.appendChild(renderQ(q)));
      });
      block.appendChild(body);
      holder.appendChild(block);
    });

    if (!shown) {
      holder.appendChild(el("div", "card", `<p class="muted">Sin preguntas para este filtro.</p>`));
    }
  }

  function renderQ(q) {
    const wrap = el("div", "q");
    const tag = el("div", "q-tag " + q.tipo, q.tipo === "abierta" ? "○ Abierta" : "◑ Profundizar");
    const main = el("div", "q-main");
    let inner = `<div class="q-text">${esc(q.pregunta)}</div>`;
    inner += `<div class="q-foot">`;
    if (q.variable && q.variable !== "—")
      inner += `<span class="q-var"><b>Variable:</b> ${esc(q.variable)}</span>`;
    inner += `</div>`;
    if (q.nota)
      inner += `<div class="q-note"><b>Contexto kickoff:</b> ${esc(q.nota.replace(/^\[Del kickoff\]\s*/, ""))}</div>`;
    main.innerHTML = inner;
    wrap.appendChild(tag);
    wrap.appendChild(main);
    return wrap;
  }

  // ---- Router -------------------------------------------------------------
  const views = { resumen: viewResumen, insumos: viewInsumos, preguntas: viewPreguntas };
  function go(view) {
    (views[view] || viewResumen)();
    document.querySelectorAll(".nav-item").forEach((n) =>
      n.classList.toggle("active", n.dataset.view === view));
    $("#sidebar").classList.remove("open");
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".nav-item").forEach((n) =>
    n.addEventListener("click", () => go(n.dataset.view)));
  $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  // ---- init ---------------------------------------------------------------
  setSyncBadge();
  go("resumen");
})();
