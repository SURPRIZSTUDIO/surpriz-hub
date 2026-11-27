/* SÜRPRIZ HÜB — interface. */
(function () {
  const api = window.hub;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const ICONS = {
    compos: '<path d="M4 5h16v14H4z M4 9h16"/>',
    project: '<path d="M3 6.5h6l2 2h10V19H3z"/>',
    anchor: '<path d="M12 3v18 M3 12h18 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>',
    curves: '<path d="M3 20C10 20 14 4 21 4"/>',
    keys: '<path d="M7 8l4 4-4 4-4-4z M17 8l4 4-4 4-4-4z"/>',
    colors: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    expressions: '<path d="M9 4C7 4 6 5 6 7v2c0 1-1 2-2 3 1 1 2 2 2 3v2c0 2 1 3 3 3 M15 4c2 0 3 1 3 3v2c0 1 1 2 2 3-1 1-2 2-2 3v2c0 2-1 3-3 3"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5"/>',
    export: '<path d="M12 3v12 M7 10l5 5 5-5 M5 21h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    download: '<path d="M12 4v11 M7 10l5 5 5-5 M5 20h14"/>',
    doc: '<path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6"/>'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
  // Tuile d'un addon : son icône (catalogue en ligne ou copie fournie avec l'app), sinon le Ü du hub.
  const MARK = document.getElementById("mark-tpl").innerHTML;
  const appIcon = (a, lg) => `<div class="app-icon${lg ? " lg" : ""}">${a && a.iconUrl ? `<img src="${esc(a.iconUrl)}" alt="">` : MARK}</div>`;
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (img && img.tagName === "IMG" && img.parentElement && img.parentElement.classList.contains("app-icon")) img.outerHTML = MARK;
  }, true);

  const state = { lang: "fr", view: "list", filter: "all", detail: null, catalog: null, source: null, status: {}, info: {} };
  const T = () => window.HUB_TEXT[state.lang];
  const L = (o) => (o && typeof o === "object") ? (o[state.lang] || o.fr || "") : (o || "");

  function cmpVer(a, b) {
    const pa = String(a || "0").split(".").map(Number), pb = String(b || "0").split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d < 0 ? -1 : 1;
    }
    return 0;
  }

  function stateOf(addon) {
    const st = state.status[addon.id];
    if (!st) return "loading";
    if (st.installed) return cmpVer(st.version, addon.version) < 0 ? "update" : "installed";
    return st.legacy && st.legacy.length ? "old" : "none";
  }

  function statusPill(addon) {
    const s = stateOf(addon), st = state.status[addon.id] || {};
    const map = {
      loading: ["", T().loading],
      installed: ["installed", T().st_installed + (st.version ? " · v" + st.version : "")],
      update: ["update", T().st_update + " · v" + st.version + " → v" + addon.version],
      old: ["update", T().st_old],
      none: ["", T().st_none]
    };
    const [cls, txt] = map[s];
    return `<span class="status ${cls}"><i></i>${esc(txt)}</span>`;
  }

  function primaryAction(addon) {
    const s = stateOf(addon);
    if (s === "loading") return `<button class="btn primary" disabled>${esc(T().b_install)}</button>`;
    if (s === "installed") return `<button class="btn secondary" data-act="install" data-id="${addon.id}">${esc(T().b_reinstall)}</button>`;
    const label = s === "update" ? T().b_update : T().b_install;
    return `<button class="btn primary" data-act="install" data-id="${addon.id}">${icon("download")}${esc(label)}</button>`;
  }

  function hostNote(addon) {
    const st = state.status[addon.id];
    if (!st || !st.host) return "";
    const h = st.host;
    if (h.running) return `<div class="host-note warn"><span class="dot"></span>${esc(T().host_running)}</div>`;
    if (h.installed && h.installed.length) return `<div class="host-note"><span class="dot"></span>${esc(T().host_found(h.installed[0]))}</div>`;
    return `<div class="host-note warn"><span class="dot"></span>${esc(T().host_missing)}</div>`;
  }

  /* ---------- Barre latérale ---------- */
  function renderNav() {
    const c = state.catalog;
    if (!c) return;
    const hosts = {};
    c.addons.forEach((a) => { hosts[a.host] = (hosts[a.host] || 0) + 1; });
    let html = `<button class="nav-item${state.filter === "all" ? " on" : ""}" data-filter="all"><span class="dot"></span>${esc(T().nav_all)}<span class="count">${c.addons.length}</span></button>`;
    html += `<div class="nav-label">${state.lang === "fr" ? "Logiciels" : "Software"}</div>`;
    Object.keys(hosts).forEach((h) => {
      html += `<button class="nav-item${state.filter === h ? " on" : ""}" data-filter="${esc(h)}"><span class="dot"></span>${esc(T().hosts[h] || h)}<span class="count">${hosts[h]}</span></button>`;
    });
    (c.soon || []).forEach((s) => {
      html += `<button class="nav-item" disabled><span class="dot"></span>${esc(T().hosts[s.host] || s.name)}<span class="soon">${esc(T().nav_soon)}</span></button>`;
    });
    $("nav").innerHTML = html;
    document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === state.lang));
  }

  /* ---------- Liste ---------- */
  function renderList() {
    const c = state.catalog;
    const list = c.addons.filter((a) => state.filter === "all" || a.host === state.filter);
    const first = list[0];
    let html = `
      <div class="head-row">
        <div>
          <p class="kicker">${esc(T().kicker)}</p>
          <h1 class="h-title">${T().title}</h1>
          <p class="lead">${esc(T().lead)}</p>
        </div>
        ${first ? hostNote(first) : ""}
      </div>
      <hr class="rule">`;
    list.forEach((a) => {
      const st = state.status[a.id] || {};
      const legacyN = (st.legacy || []).length;
      html += `
      <article class="feature">
        <div class="feature-body">
          <div class="f-head">
            ${appIcon(a, false)}
            <div>
              <div class="f-name">${esc(a.name)}</div>
              <div class="chips"><span class="chip">${esc(T().hosts[a.host])}</span><span class="chip mono">v${esc(a.version)}</span><span class="chip">${esc(T().os_both)}</span></div>
            </div>
          </div>
          <p class="f-tag">${esc(L(a.tagline))}</p>
          ${statusPill(a)}
          ${legacyN && stateOf(a) !== "loading" ? `<p class="note">${esc(T().legacy_note(legacyN))}</p>` : ""}
          <div class="actions">
            ${primaryAction(a)}
            <button class="btn ghost" data-act="detail" data-id="${a.id}">${esc(T().b_details)} →</button>
          </div>
        </div>
        <div class="feature-shot">${(a.shotUrls[state.lang] || [])[0] ? `<img src="${esc(a.shotUrls[state.lang][0])}" alt="">` : ""}</div>
      </article>`;
    });
    if (state.filter === "all" && (c.soon || []).length) {
      html += `<div class="soon-row">
        <div class="soon-card"><strong>${esc(T().soon_title)}</strong><span>${esc(T().soon_text)}</span></div>
        <div class="soon-card">${(c.soon || []).map((s) => `<span class="chip">${esc(T().hosts[s.host] || s.name)} · ${esc(T().nav_soon)}</span>`).join("")}</div>
      </div>`;
    }
    $("view").innerHTML = html;
  }

  /* ---------- Fiche détaillée ---------- */
  function renderDetail() {
    const a = state.catalog.addons.find((x) => x.id === state.detail);
    const st = state.status[a.id] || {};
    const s = stateOf(a);
    const legacyN = (st.legacy || []).length;
    let html = `
      <button class="back" data-act="list">${icon("back")}${esc(T().b_back)}</button>
      <div class="hero">
        <div>
          <div class="hero-title">${appIcon(a, true)}<h1 class="h-title">${esc(a.name)}</h1></div>
          <p class="lead">${esc(L(a.tagline))}</p>
        </div>
        <div class="box">
          ${statusPill(a)}
          <dl class="meta">
            <dt>${esc(T().meta_version)}</dt><dd>v${esc(a.version)}</dd>
            <dt>${esc(T().meta_host)}</dt><dd>${esc(L(a.requires))}</dd>
            <dt>${esc(T().meta_os)}</dt><dd>${esc(T().os_both)}</dd>
          </dl>
          ${primaryAction(a)}
          ${legacyN && s !== "loading" ? `<p class="note">${esc(T().legacy_note(legacyN))}</p>` : ""}
          ${hostNote(a)}
          ${a.guides ? `<button class="btn ghost" data-act="guide" data-id="${a.id}">${icon("doc")}${esc(T().b_guide)}</button>` : ""}
          ${st.installed ? `<button class="btn ghost" data-act="reveal" data-id="${a.id}">${esc(T().b_reveal)}</button>
          <button class="btn ghost danger" data-act="uninstall" data-id="${a.id}">${esc(T().b_uninstall)}</button>` : ""}
        </div>
      </div>
      <h2 class="sec-title">${esc(T().tools_title)}<span>${String(a.tools.length).padStart(2, "0")}</span></h2>
      <div class="tools">
        ${a.tools.map((t) => `<div class="tool">${icon(t.icon)}<strong>${esc(L(t.name))}</strong><p>${esc(L(t.text))}</p></div>`).join("")}
      </div>
      <h2 class="sec-title">${esc(T().shots_title)}</h2>
      <div class="shots">${(a.shotUrls[state.lang] || []).map((u) => `<img src="${esc(u)}" alt="">`).join("")}</div>`;
    $("view").innerHTML = html;
  }

  function renderChrome() {
    const n = $("net");
    if (state.source) {
      n.className = "net " + state.source;
      n.textContent = T()["net_" + state.source];
    }
    const hub = state.catalog && state.catalog.hub;
    const b = $("banner");
    const newer = !!(hub && hub.version && cmpVer(hub.version, state.info.version) > 0);
    const su = (hub && hub.selfUpdate) || {};
    const btn = (act, label, ghost) => `<button class="btn ${ghost ? "ghost" : "primary"} sm" data-act="${act}">${esc(label)}</button>`;
    let text = null, buttons = "";
    if (state.updateFailed) {
      text = state.info.platform === "darwin" ? T().hub_failed_mac : T().hub_failed_win;
      buttons = (newer && su.ok ? btn("hubupdate", T().b_retry) : "") + btn("hubfetch", T().b_get, newer && su.ok);
    } else if (state.info.platform === "darwin" && state.info.inApplications === false) {
      text = (newer ? T().hub_update(hub.version) + " " : "") + T().hub_move;
      buttons = btn("hubmove", T().b_move);
    } else if (newer) {
      text = T().hub_update(hub.version) + (!su.ok && su.reason === "readonly" ? " " + T().hub_readonly : "");
      buttons = su.ok ? btn("hubupdate", T().b_hubupdate) : btn("hubfetch", T().b_get);
    }
    if (text) { b.innerHTML = `<span>${esc(text)}</span><span class="banner-actions">${buttons}</span>`; b.hidden = false; }
    else b.hidden = true;
  }

  function render() {
    renderNav();
    renderChrome();
    if (!state.catalog) return;
    if (state.view === "detail") renderDetail(); else renderList();
  }

  async function refreshStatus(id) {
    const ids = id ? [id] : state.catalog.addons.map((a) => a.id);
    await Promise.all(ids.map(async (x) => {
      try { state.status[x] = await api.status(x); } catch (e) { state.status[x] = { installed: false, legacy: [], host: null }; }
    }));
    render();
  }

  /* ---------- Installation ---------- */
  function openSheet(kicker, title, keys) {
    $("sheet-kicker").textContent = kicker;
    $("sheet-title").textContent = title;
    $("sheet-steps").innerHTML = keys.map((k) => `<li data-key="${k}"><span class="ico"></span><span>${esc(T()["step_" + k])}</span></li>`).join("");
    $("sheet-msg").innerHTML = "";
    $("sheet-actions").innerHTML = "";
    $("sheet").hidden = false;
  }
  function setStep(key, cls) {
    const li = document.querySelector(`#sheet-steps li[data-key="${key}"]`);
    if (li) li.className = cls;
  }
  function closeSheet() { $("sheet").hidden = true; }

  async function doInstall(id) {
    const a = state.catalog.addons.find((x) => x.id === id);
    const keys = ["download", "allow", "clean", "copy"];
    openSheet(T().sheet_install, a.name + " v" + a.version, keys);
    setStep("allow", "doing");
    let res;
    try { res = await api.install(id); } catch (e) { res = { ok: false, steps: [{ key: "copy", ok: false, detail: String(e.message || e) }] }; }
    const byKey = {};
    (res.steps || []).forEach((s) => { byKey[s.key] = s; });
    for (const k of keys) {
      setStep(k, "doing");
      await sleep(320);
      const s = byKey[k];
      if (!s) { setStep(k, "warn"); continue; }
      setStep(k, s.ok ? "ok" : (k === "clean" ? "warn" : "err"));
    }
    let msg = "";
    if (byKey.payload) msg = `<p>${esc(T().step_payload)}</p>`;
    else if (res.ok) {
      msg = `<p>${T().done_install(esc(a.cep.menu || a.name))}</p>`;
      if (res.hostRunning) msg += `<p class="muted">${esc(T().done_restart)}</p>`;
    } else {
      const bad = (res.steps || []).find((s) => !s.ok && s.key !== "clean");
      msg = `<p>${esc(T().failed)}</p><p><code>${esc(bad ? bad.detail : "?")}</code></p>`;
    }
    if (byKey.clean && !byKey.clean.ok) msg += `<p class="muted">${esc(T().blocked)}</p>`;
    $("sheet-msg").innerHTML = msg;
    $("sheet-actions").innerHTML = `<button class="btn primary" data-act="close">${esc(T().b_done)}</button>`;
    await refreshStatus(id);
  }

  let armedAt = 0;
  async function doUninstall(id, btn) {
    if (Date.now() - armedAt > 2500) {
      armedAt = Date.now();
      btn.classList.add("armed");
      btn.textContent = T().confirm_uninstall;
      setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.textContent = T().b_uninstall; } }, 2500);
      return;
    }
    armedAt = 0;
    const a = state.catalog.addons.find((x) => x.id === id);
    openSheet(T().sheet_uninstall, a.name, ["remove"]);
    setStep("remove", "doing");
    const res = await api.uninstall(id);
    await sleep(320);
    setStep("remove", res.ok ? "ok" : "warn");
    $("sheet-msg").innerHTML = `<p>${esc(T().done_uninstall)}</p>` + (res.ok ? "" : `<p class="muted">${esc(T().blocked)}</p>`);
    $("sheet-actions").innerHTML = `<button class="btn primary" data-act="close">${esc(T().b_done)}</button>`;
    await refreshStatus(id);
  }

  /* ---------- Mise à jour du hub ---------- */
  async function doHubUpdate() {
    const hub = state.catalog.hub;
    const keys = ["hdl", "hcheck", "hprep", "hrestart"];
    const map = { download: "hdl", check: "hcheck", prepare: "hprep", restart: "hrestart" };
    openSheet(T().sheet_hub, "SÜRPRIZ HÜB " + hub.version, keys);
    state.updateFailed = false;
    let current = null;
    const off = api.onUpdateProgress((info) => {
      const k = map[info.step];
      if (!k) return;
      if (current && current !== k) setStep(current, "ok");
      current = k;
      setStep(k, "doing");
      if (k === "hdl" && info.total) {
        const li = document.querySelector('#sheet-steps li[data-key="hdl"] span:last-child');
        if (li) li.textContent = T().step_hdl + " · " + Math.min(100, Math.round((info.received / info.total) * 100)) + " %";
      }
    });
    let res;
    try { res = await api.selfUpdate(); } catch (e) { res = { ok: false, step: "download", detail: String(e.message || e) }; }
    off();
    if (res.ok) {
      setStep("hrestart", "doing");
      $("sheet-msg").innerHTML = `<p>${esc(T().hub_restarting)}</p>`;
      return;
    }
    const failed = map[res.step] || "hdl";
    for (const k of keys) { if (k === failed) break; setStep(k, "ok"); }
    setStep(failed, "err");
    $("sheet-msg").innerHTML = `<p>${esc(T().hub_update_err)}</p><p><code>${esc(res.detail || "?")}</code></p>`;
    $("sheet-actions").innerHTML = `<button class="btn ghost" data-act="close">${esc(T().b_close)}</button><button class="btn primary" data-act="hubfetch">${esc(T().b_get)}</button>`;
  }

  /** Télécharge la nouvelle version dans Téléchargements (quand le hub ne peut pas se remplacer tout seul). */
  async function doHubFetch() {
    const hub = state.catalog.hub;
    openSheet(T().sheet_get, "SÜRPRIZ HÜB " + hub.version, ["hdl"]);
    setStep("hdl", "doing");
    const off = api.onUpdateProgress((info) => {
      if (!info.total) return;
      const li = document.querySelector('#sheet-steps li[data-key="hdl"] span:last-child');
      if (li) li.textContent = T().step_hdl + " · " + Math.min(100, Math.round((info.received / info.total) * 100)) + " %";
    });
    let res;
    try { res = await api.fetchHub(); } catch (e) { res = { ok: false, detail: String(e.message || e) }; }
    off();
    if (res.ok) {
      setStep("hdl", "ok");
      const msg = state.info.platform === "darwin" ? T().hub_got_mac(esc(res.name)) : T().hub_got_win(esc(res.name));
      $("sheet-msg").innerHTML = `<p>${msg}</p>`;
      $("sheet-actions").innerHTML = `<button class="btn ghost" data-act="hubreveal">${esc(T().b_show)}</button><button class="btn primary" data-act="close">${esc(T().b_done)}</button>`;
    } else {
      setStep("hdl", "err");
      $("sheet-msg").innerHTML = `<p>${esc(T().get_err)}</p><p><code>${esc(res.detail || "?")}</code></p>`;
      $("sheet-actions").innerHTML = `<button class="btn ghost" data-act="close">${esc(T().b_close)}</button><button class="btn primary" data-act="hubget">${esc(T().b_page)}</button>`;
    }
  }

  async function doHubMove() {
    const res = await api.moveToApps();
    if (res && res.ok) return; // l'app se rouvre depuis Applications
    openSheet(T().sheet_hub, "SÜRPRIZ HÜB", []);
    $("sheet-msg").innerHTML = `<p>${esc(T().move_failed)}</p>` + (res && res.detail ? `<p><code>${esc(res.detail)}</code></p>` : "");
    $("sheet-actions").innerHTML = `<button class="btn primary" data-act="close">${esc(T().b_close)}</button>`;
  }

  /* ---------- Événements ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act], [data-filter], [data-lang]");
    if (!b || b.disabled) return;
    if (b.dataset.filter) { state.filter = b.dataset.filter; state.view = "list"; render(); $("view").scrollTop = 0; return; }
    if (b.dataset.lang) {
      state.lang = b.dataset.lang;
      try { localStorage.setItem("hub.lang", state.lang); } catch (err) { /* stockage indisponible */ }
      document.documentElement.lang = state.lang;
      render(); return;
    }
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case "install": doInstall(id); break;
      case "uninstall": doUninstall(id, b); break;
      case "detail": state.view = "detail"; state.detail = id; render(); $("view").scrollTop = 0; break;
      case "list": state.view = "list"; render(); $("view").scrollTop = 0; break;
      case "guide": api.openGuide(id, state.lang); break;
      case "reveal": api.reveal(id); break;
      case "close": closeSheet(); break;
      case "hubget": if (state.catalog.hub && state.catalog.hub.download) api.openLink(state.catalog.hub.download); break;
      case "hubupdate": doHubUpdate(); break;
      case "hubfetch": doHubFetch(); break;
      case "hubreveal": api.revealFetched(); break;
      case "hubmove": doHubMove(); break;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("sheet").hidden && $("sheet-actions").children.length) closeSheet(); });
  $("ig").addEventListener("click", () => api.openLink("https://www.instagram.com/surprizstudio"));
  async function loadCatalog(force) {
    const res = await api.catalog(force);
    state.catalog = res.catalog;
    state.source = res.source;
  }
  window.addEventListener("focus", async () => {
    if (!state.catalog || !$("sheet").hidden) return;
    await loadCatalog(false);
    refreshStatus();
  });

  /* ---------- Démarrage ---------- */
  (async function start() {
    state.info = await api.info();
    let saved = null;
    try { saved = localStorage.getItem("hub.lang"); } catch (e) { /* stockage indisponible */ }
    state.lang = saved || (/^fr/i.test(state.info.locale || "") ? "fr" : "en");
    document.documentElement.lang = state.lang;
    $("ver").textContent = "HÜB " + state.info.version;
    try { state.updateFailed = await api.updateFailed(); } catch (e) { state.updateFailed = false; }
    await loadCatalog(true);
    render();
    refreshStatus();
  })();
})();
