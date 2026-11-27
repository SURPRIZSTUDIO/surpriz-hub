/* Hub : licence, découverte et affichage des modules. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var C = window.SZ_CONFIG;
  var modules = [];     // { id, name, order, mount }
  var manifests = {};   // id -> module.json
  var active = null;
  var loadErrors = [];

  /* ---------- Barre d'état ---------- */
  var statusTimer;
  function status(msg, kind) {
    var el = $("status");
    el.textContent = msg || "";
    el.className = "status" + (kind ? " " + kind : "");
    clearTimeout(statusTimer);
    if (msg && kind === "ok") statusTimer = setTimeout(function () { status(""); }, 4000);
  }

  /* Interprète les retours "OK:..." / "ERR:..." de l'ExtendScript. */
  function report(res) {
    if (!res) { status("After Effects n'a rien renvoyé. Ouvre la console (localhost:8088) pour le détail.", "err"); return res; }
    if (res === "EvalScript error.") { status("Erreur ExtendScript : le code du module n'est pas chargé dans After Effects.", "err"); return res; }
    if (res.indexOf("ERR:") === 0) status(res.slice(4), "err");
    else if (res.indexOf("OK:") === 0) status(res.slice(3), res.indexOf("\n") > -1 ? "" : "ok");
    else if (res) status(res);
    return res;
  }

  /* ---------- Sauvegarde sur disque ----------
     Les réglages (palettes, presets, expressions, disposition…) sont gardés dans le navigateur
     du panneau ET recopiés dans un fichier, pour survivre à une mise à jour ou réinstallation :
     Mac : ~/Library/Application Support/SUR-CORE/donnees.json
     Windows : %APPDATA%\SUR-CORE\donnees.json */
  var disk = (function () {
    var node = SZBridge.node;
    if (!node || !SZBridge.inAE) return null;
    try {
      var fs = node("fs"), path = node("path"), os = node("os");
      var base = process.platform === "win32"
        ? (process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"))
        : path.join(os.homedir(), "Library", "Application Support");
      var dir = path.join(base, "SUR-CORE"), file = path.join(dir, "donnees.json"), timer = null;
      function write() {
        timer = null;
        try {
          var out = {};
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k.indexOf("sz_") === 0) out[k] = localStorage.getItem(k);
          }
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(file + ".tmp", JSON.stringify(out, null, 1));
          fs.renameSync(file + ".tmp", file);
        } catch (e) { console.warn("Sauvegarde Toolkit impossible : " + e.message); }
      }
      return {
        file: file,
        load: function () {
          if (!fs.existsSync(file)) return null;
          try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; }
        },
        save: function () {
          clearTimeout(timer);
          timer = setTimeout(write, 250);
        },
        flush: function () { if (timer) { clearTimeout(timer); write(); } }
      };
    } catch (e) { return null; }
  })();
  // Panneau fermé ou rechargé juste après une modification : on écrit tout de suite, sinon elle serait perdue
  // (au lancement suivant, le fichier remplace ce que le panneau avait gardé).
  if (disk) { window.addEventListener("beforeunload", disk.flush); window.addEventListener("pagehide", disk.flush); }
  // Au lancement, le fichier fait foi (sauf s'il n'existe pas encore : on le crée).
  if (disk) {
    var saved = disk.load();
    if (saved) { try { Object.keys(saved).forEach(function (k) { localStorage.setItem(k, saved[k]); }); } catch (e) {} }
    else disk.save();
  }

  /* Questions venant d'After Effects : « ASK:<index de l'argument>|<réglage auto>|<question>|<bouton> ».
     Si le réglage « hub.<réglage auto> » est activé, on accepte sans demander ; sinon la barre du bas propose Oui / Annuler.
     En cas d'accord, l'action est relancée avec l'argument indiqué à true. */
  function askBar(question, yes) {
    return new Promise(function (resolve) {
      var el = $("status");
      el.className = "status ask";
      el.innerHTML = '<span class="ask-q"></span><span class="ask-row"><button class="btn" data-a="0">Annuler</button><button class="btn primary" data-a="1"></button></span>';
      el.querySelector(".ask-q").textContent = question;
      el.querySelector('[data-a="1"]').textContent = yes;
      el.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () { el.innerHTML = ""; el.className = "status"; resolve(b.dataset.a === "1"); };
      });
    });
  }
  function askAndRerun(fn, args, res) {
    var parts = res.slice(4).split("|"), idx = +parts[0], key = parts[1], q = parts[2], yes = parts[3] || "OK";
    var auto = key && api.store.get("hub." + key, false);
    return (auto ? Promise.resolve(true) : askBar(q, yes)).then(function (ok) {
      if (!ok) { status("Annulé."); return "ERR:Annulé"; }
      var a = args.slice(0);
      while (a.length < idx) a.push(null);
      a[idx] = true;
      return SZBridge.call(fn, a).then(report);
    });
  }

  /* API exposée aux modules */
  var api = {
    call: SZBridge.call,
    run: function (fn, args) {
      return SZBridge.call(fn, args).then(function (res) {
        return res && res.indexOf("ASK:") === 0 ? askAndRerun(fn, args || [], res) : report(res);
      });
    },
    status: status,
    // Ré-affiche l'onglet courant (après un changement de réglages en bloc)
    reload: function () { if (active) { var top = $("view").scrollTop; showModule(active); $("view").scrollTop = top; } },
    store: {
      get: function (k, d) { try { var v = localStorage.getItem("sz_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) {
        try { localStorage.setItem("sz_" + k, JSON.stringify(v)); } catch (e) {}
        if (disk) disk.save();
      }
    }
  };

  /* ---------- Enregistrement des modules ---------- */
  window.SZ = {
    register: function (mod) {
      var m = manifests[mod.id] || {};
      mod.name = mod.name || m.name || mod.id;
      mod.order = mod.order != null ? mod.order : (m.order || 99);
      modules.push(mod);
    }
  };

  function listModuleDirs() {
    var req = SZBridge.node;
    if (req && SZBridge.inAE) {
      var fs = req("fs"), path = req("path");
      var dir = path.join(SZBridge.extensionPath(), "modules");
      return Promise.resolve(fs.readdirSync(dir).filter(function (d) {
        return fs.existsSync(path.join(dir, d, "module.json"));
      }).map(function (d) {
        var json = JSON.parse(fs.readFileSync(path.join(dir, d, "module.json"), "utf8"));
        json.dir = d;
        return json;
      }));
    }
    // Hors AE : liste statique pour prévisualiser l'interface.
    return fetch("modules/modules.json").then(function (r) { return r.json(); })
      .then(function (ids) {
        return Promise.all(ids.map(function (d) {
          return fetch("modules/" + d + "/module.json").then(function (r) { return r.json(); })
            .then(function (j) { j.dir = d; return j; });
        }));
      });
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { console.warn("Module introuvable : " + src); resolve(); };
      document.body.appendChild(s);
    });
  }

  function loadModules() {
    return listModuleDirs().then(function (list) {
      list.forEach(function (m) { manifests[m.id] = m; });
      var root = SZBridge.extensionPath();
      return Promise.all(list.map(function (m) {
        var host = root + "/modules/" + m.dir + "/host.jsx";
        // Évalué au niveau global (pas dans une fonction) pour que le module reste accessible.
        var jsx = SZBridge.inAE
          ? SZBridge.evalScript(
              'try { var __f = new File(' + JSON.stringify(host) + ');' +
              ' __f.exists ? ($.evalFile(__f), "OK") : "ERR:fichier introuvable ' + host.replace(/["\\]/g, "") + '"; }' +
              ' catch (e) { "ERR:" + e.toString() + " (ligne " + e.line + ")"; }')
          : Promise.resolve("OK");
        return jsx.then(function (r) {
          if (r.indexOf("OK") !== 0) loadErrors.push(m.name + " : " + (r.indexOf("ERR:") === 0 ? r.slice(4) : (r || "aucune réponse")));
          return loadScript("modules/" + m.dir + "/panel.js");
        });
      }));
    }).then(function () {
      modules.sort(function (a, b) { return a.order - b.order; });
    });
  }

  /* ---------- Icônes des onglets ---------- */
  var ICONS = {
    formats: "M4 5h16v14H4z M4 9h16",
    anchor: "M12 3v18 M3 12h18 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
    curves: "M3 20C10 20 14 4 21 4",
    keys: "M7 8l4 4-4 4-4-4z M17 8l4 4-4 4-4-4z",
    colors: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
    expressions: "M9 4C7 4 6 5 6 7v2c0 1-1 2-2 3 1 1 2 2 2 3v2c0 2 1 3 3 3 M15 4c2 0 3 1 3 3v2c0 1 1 2 2 3-1 1-2 2-2 3v2c0 2-1 3-3 3",
    layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5",
    project: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    "export": "M12 3v12 M7 10l5 5 5-5 M5 21h14"
  };
  function icon(id) {
    var d = ICONS[id];
    if (!d) return '<span class="tab-letter">' + id.charAt(0).toUpperCase() + "</span>";
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  /* ---------- Disposition (ordre, onglets visibles, noms) ---------- */
  var DEFAULT_VISIBLE = ["formats", "anchor", "curves", "keys", "expressions"];
  function layout() {
    var L = api.store.get("hub.layout", null);
    if (!L) L = { order: [], hidden: null, labels: false };
    var ids = tabModules().map(function (m) { return m.id; });
    // ordre : celui enregistré, puis les nouveaux modules à la fin
    var order = (L.order || []).filter(function (id) { return ids.indexOf(id) >= 0; });
    ids.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    var hidden = L.hidden || ids.filter(function (id) { return DEFAULT_VISIBLE.indexOf(id) < 0; });
    return { order: order, hidden: hidden, labels: !!L.labels };
  }
  function saveLayout(L) { api.store.set("hub.layout", L); }
  function mod(id) { return modules.filter(function (m) { return m.id === id; })[0]; }
  // Modules intégrés dans un autre onglet (embedIn) : pas d'onglet à eux.
  function tabModules() { return modules.filter(function (m) { return !m.embedIn; }); }
  /* Logo Toolkit (vectoriel, couleur d'accent) + crédits en bas de chaque onglet. */
  var LOGO = '<svg class="tk-logo" viewBox="0 0 2000 1035" fill="currentColor" aria-label="Toolkit"><path fill-rule="evenodd" d="M517 0a517 517 0 0 1 483 333A517 517 0 0 1 1483 0a517 517 0 1 1 0 1034 517 517 0 0 1-483-333A517 517 0 0 1 517 1034 517 517 0 1 1 517 0Zm0 76a441 441 0 1 0 0 882 441 441 0 1 0 0-882Zm966 0a441 441 0 1 0 0 882 441 441 0 1 0 0-882Z"/><path d="M209 228h616v136H587l238 238v192L585 555v289H449V555L209 794V602l238-238H209Z"/><path d="M1194 209h136v238l238-238h192l-239 240h289v136h-289l239 240h-192l-238-238v238h-136Z"/></svg>';
  function credits() {
    return '<footer class="credits">' + LOGO +
      '<b>Toolkit</b><span>· par Sürpriz · v' + C.VERSION + '</span></footer>';
  }
  function mountFull(m, el) {
    m.mount(el, api);
    modules.forEach(function (x) { if (x.embedIn === m.id) x.mount(el, api); });
  }
  function ordered() { return layout().order.map(mod).filter(Boolean); }

  /* ---------- Onglets ---------- */
  function renderTabs() {
    var nav = $("tabs"), L = layout();
    nav.innerHTML = "";
    nav.hidden = false;
    nav.classList.toggle("labels", L.labels);
    ordered().forEach(function (m) {
      var hiddenTab = L.hidden.indexOf(m.id) >= 0;
      if (hiddenTab && active !== m.id) return;
      var b = document.createElement("button");
      b.className = "tab" + (active === m.id ? " on" : "") + (hiddenTab ? " temp" : "");
      b.title = m.name;
      b.innerHTML = icon(m.id) + '<span class="tab-name">' + esc(m.name) + "</span>";
      b.onclick = function () { showModule(m.id); };
      nav.appendChild(b);
    });
    $("btn-menu").hidden = !L.hidden.length;
    renderQuick();
  }

  /* ---------- Menu ☰ : onglets rangés ---------- */
  function closeMenu() { $("menu").hidden = true; document.removeEventListener("mousedown", outside, true); }
  function outside(e) { if (!$("menu").contains(e.target) && e.target.closest("#btn-menu") == null) closeMenu(); }
  $("btn-menu").onclick = function () {
    var menu = $("menu");
    if (!menu.hidden) return closeMenu();
    var L = layout();
    menu.innerHTML = L.order.filter(function (id) { return L.hidden.indexOf(id) >= 0 && mod(id); }).map(function (id) {
      return '<button data-id="' + id + '">' + icon(id) + "<span>" + esc(mod(id).name) + "</span></button>";
    }).join("") + '<hr><button data-act="custom"><span>Personnaliser…</span></button>';
    menu.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        closeMenu();
        if (b.dataset.act === "custom") showSettings();
        else showModule(b.dataset.id);
      };
    });
    menu.hidden = false;
    setTimeout(function () { document.addEventListener("mousedown", outside, true); }, 0);
  };

  /* ---------- Sections repliables ---------- */
  function makeCollapsible(view, modId) {
    var key = "hub.collapsed." + modId, closed = api.store.get(key, []);
    var kids = Array.prototype.slice.call(view.children), current = null;
    kids.forEach(function (node) {
      var title = node.classList.contains("section-title") ? node
        : (node.classList.contains("c-head") ? node.querySelector(".section-title") : null);
      if (title) {
        var name = title.textContent.trim();
        var body = document.createElement("div");
        body.className = "sec-body";
        node.parentNode.insertBefore(body, node.nextSibling);
        node.classList.add("sec-head");
        var isClosed = closed.indexOf(name) >= 0;
        node.classList.toggle("closed", isClosed);
        body.hidden = isClosed;
        title.addEventListener("click", function () {
          var c = !body.hidden;
          body.hidden = c;
          node.classList.toggle("closed", c);
          var list = api.store.get(key, []).filter(function (x) { return x !== name; });
          if (c) list.push(name);
          api.store.set(key, list);
        });
        current = body;
        return;
      }
      if (current) current.appendChild(node);
    });
  }

  /* Textes d'aide longs → petit « i » à côté du titre de section, bulle au survol.
     Les textes courts et les textes dynamiques (avec un id) restent visibles. */
  var TIP_MIN = 80, tipEl = null;
  function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
  function showTip(btn, html) {
    hideTip();
    var app = $("app"), a = btn.getBoundingClientRect(), r = app.getBoundingClientRect();
    tipEl = document.createElement("div");
    tipEl.className = "sz-tip";
    tipEl.innerHTML = html;
    app.appendChild(tipEl);
    var w = Math.min(260, r.width - 16);
    tipEl.style.width = w + "px";
    tipEl.style.left = Math.max(8, Math.min(a.left - r.left - 12, r.width - w - 8)) + "px";
    var top = a.bottom - r.top + 6;
    if (top + tipEl.offsetHeight > r.height - 8) top = Math.max(8, a.top - r.top - tipEl.offsetHeight - 6);
    tipEl.style.top = top + "px";
  }
  function infoTips(view) {
    view.querySelectorAll(".sec-body").forEach(function (body) {
      var head = body.previousElementSibling;
      var title = head && (head.classList.contains("section-title") ? head : head.querySelector(".section-title"));
      if (!title) return;
      var hints = Array.prototype.filter.call(body.querySelectorAll(".hint"), function (h) {
        return !h.id && h.textContent.trim().length >= TIP_MIN;
      });
      if (!hints.length) return;
      hints.forEach(function (h) { h.classList.add("hint-tip"); });
      var b = document.createElement("button");
      b.className = "info-btn";
      b.type = "button";
      b.innerHTML = SZIcon("info");
      title.appendChild(b);
      function html() { return hints.map(function (h) { return "<p>" + h.innerHTML + "</p>"; }).join(""); }
      var wait = null;
      b.addEventListener("mouseenter", function () { wait = setTimeout(function () { showTip(b, html()); }, 900); });
      b.addEventListener("mouseleave", function () { clearTimeout(wait); hideTip(); });
      b.addEventListener("click", function (e) { e.stopPropagation(); clearTimeout(wait); if (tipEl) hideTip(); else showTip(b, html()); });
    });
  }

  /* ---------- Accès rapide (actions épinglées) ---------- */
  function pins() { return api.store.get("hub.pins", []); }
  function savePins(p) { api.store.set("hub.pins", p); renderQuick(); }

  function renderQuick() {
    var bar = $("quick"), P = pins();
    var hintOff = api.store.get("hub.quickHintOff", false);
    if (!P.length) {
      bar.hidden = hintOff;
      bar.innerHTML = '<span class="q-hint">Clic droit sur un bouton pour l\'épingler ici</span><button class="q-x" title="Masquer">' + SZIcon("close") + '</button>';
      bar.querySelector(".q-x").onclick = function () { api.store.set("hub.quickHintOff", true); bar.hidden = true; };
      return;
    }
    bar.hidden = false;
    bar.innerHTML = P.map(function (p, i) {
      return '<button class="q-btn" data-i="' + i + '" title="' + esc(p.mod ? (mod(p.mod) ? mod(p.mod).name + " · " : "") + p.label : p.label) + ' (clic droit : retirer)">' +
        (p.mod ? icon(p.mod) : "") + "<span>" + esc(p.label) + "</span></button>";
    }).join("");
    bar.querySelectorAll(".q-btn").forEach(function (b) {
      var p = P[+b.dataset.i];
      b.onclick = function () { runPin(p); };
      b.oncontextmenu = function (e) {
        e.preventDefault();
        var list = pins(); list.splice(+b.dataset.i, 1); savePins(list);
        status("« " + p.label + " » retiré de l'accès rapide.", "ok");
      };
    });
  }

  /* Exécute une action épinglée : appel direct, ou clic rejoué dans le module monté hors écran. */
  function runPin(p) {
    if (p.fn) return api.run(p.fn, p.args || []);
    var m = mod(p.mod);
    if (!m) return status("Le module de cette action n'est plus installé.", "err");
    var host = $("offscreen");
    host.innerHTML = "";
    var box = document.createElement("div");
    host.appendChild(box);
    mountFull(m, box);
    var target = box.querySelector(p.sel);
    if (!target) { host.innerHTML = ""; return status("Action introuvable : réépingle-la depuis son onglet.", "err"); }
    target.dispatchEvent(new MouseEvent(p.dbl ? "dblclick" : "click", { bubbles: true }));
    setTimeout(function () { if (host.firstChild === box) host.innerHTML = ""; }, 60000);
  }

  /* Sélecteur stable pour retrouver un bouton dans un module. */
  function selectorFor(btn) {
    if (btn.id) return "#" + btn.id;
    var sel = btn.tagName.toLowerCase(), any = false;
    Array.prototype.forEach.call(btn.attributes, function (a) {
      if (a.name.indexOf("data-") === 0 || a.name === "title") { sel += "[" + a.name + '="' + a.value.replace(/"/g, '\\"') + '"]'; any = true; }
    });
    return any ? sel : null;
  }
  function labelFor(btn) {
    var c = btn.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll("small, svg, em, i"), function (n) { n.remove(); });
    var t = c.textContent.replace(/\s+/g, " ").trim().replace(/^[^0-9A-Za-zÀ-ÿ#]+/, "");
    if (t.length < 2) t = btn.title || t;
    return t.slice(0, 28);
  }

  /* Ce qui n'est pas une action : choix d'option (segments), réglages numériques, jetons de texte,
     boutons qui ouvrent un formulaire ou changent l'affichage. Les modules peuvent ajouter data-nopin. */
  var NOPIN = ".seg:not(.seg-act), .num, .pk, .pk-pop, #x-tokens, #p-tokens, .info-btn, .pl-more, .switch, summary, [data-nopin]," +
    "#f-add, #f-from, #f-cancel, #f-ok, #f-bgbox, #cv-onion, #cv-save-ok, #c-big, #c-rep-from," +
    "#c-imp, #c-exp, #c-new, #c-proj-save, #c-scan, #ex-import, #ex-export, #ex-add, #ex-capture, #ex-cancel, #ex-save," +
    "#x-prof-save, #x-prof-del, #x-prof-ok, #x-pick, #x-reload";
  $("view").addEventListener("contextmenu", function (e) {
    var btn = e.target.closest("button, [data-pin]");
    if (!btn || !active) return;
    e.preventDefault();
    if (btn.closest(NOPIN)) {
      return status(btn.closest(".seg:not(.seg-act)") ? "C'est un réglage, pas une action : il est pris en compte par le bouton qui applique (ex. « Appliquer »). Épingle plutôt ce bouton-là."
        : "Ce bouton ne peut pas être épinglé.", "err");
    }
    var m = mod(active), pin = null;
    if (m && m.pin) pin = m.pin(btn, api);            // le module peut fournir une action directe
    if (!pin) {
      var sel = selectorFor(btn);
      if (!sel) return status("Ce bouton ne peut pas être épinglé.", "err");
      pin = { sel: sel, label: labelFor(btn), dbl: false };
    }
    pin.mod = pin.mod || active;
    pin.label = pin.label || labelFor(btn);
    var list = pins();
    if (list.some(function (x) { return x.mod === pin.mod && (x.sel ? x.sel === pin.sel : x.label === pin.label); })) {
      return status("« " + pin.label + " » est déjà dans l'accès rapide.");
    }
    list.push(pin);
    savePins(list);
    status("« " + pin.label + " » épinglé dans l'accès rapide.", "ok");
  });

  /* ---------- Affichage d'un module ---------- */
  function showModule(id) {
    var m0 = mod(id);
    if (m0 && m0.embedIn) m0 = mod(m0.embedIn);
    var m = m0 || ordered().filter(function (x) { return layout().hidden.indexOf(x.id) < 0; })[0] || modules[0];
    if (!m) { $("view").innerHTML = '<p class="empty">Aucun module installé.</p>'; return; }
    active = m.id;
    api.store.set("lastModule", m.id);
    renderTabs();
    var v = $("view");
    hideTip();
    v.onscroll = hideTip;
    v.innerHTML = "";
    v.scrollTop = 0;
    v.classList.remove("settings");
    mountFull(m, v);
    makeCollapsible(v, m.id);
    infoTips(v);
    v.insertAdjacentHTML("beforeend", credits());
  }

  /* ---------- Réglages : personnaliser + licence ---------- */
  /* Mini aim trainer : 20 s pour toucher un maximum de cibles. Compact (150 px de haut), record mémorisé. */
  function aimTrainer(after, onClose) {
    var box = document.createElement("div");
    box.className = "aim";
    box.innerHTML = '<div class="aim-bar"><span class="aim-info"></span><button class="icon-btn" title="Fermer">' + SZIcon("close") + '</button></div><div class="aim-zone"></div>';
    after.parentNode.insertBefore(box, after.nextSibling);
    box.scrollIntoView({ block: "nearest" });
    var zone = box.querySelector(".aim-zone"), info = box.querySelector(".aim-info");
    var best = api.store.get("hub.aimBest", 0), score = 0, miss = 0, left = 20, timer = null, target = null;
    function hud() { info.textContent = left > 0 && timer ? ("Score " + score + " · " + left + " s · Record " + best) : ("Record " + best); }
    function spawn() {
      if (target) target.remove();
      target = document.createElement("i");
      target.className = "aim-t";
      var w = zone.clientWidth, h = zone.clientHeight, r = 11;
      target.style.left = (r + Math.random() * (w - 2 * r) - r) + "px";
      target.style.top = (r + Math.random() * (h - 2 * r) - r) + "px";
      target.onmousedown = function (e) { e.stopPropagation(); score++; hud(); spawn(); };
      zone.appendChild(target);
    }
    function end() {
      clearInterval(timer); timer = null; if (target) { target.remove(); target = null; }
      var acc = score + miss ? Math.round(score / (score + miss) * 100) : 0;
      if (score > best) { best = score; api.store.set("hub.aimBest", best); }
      zone.innerHTML = '<button class="btn primary aim-go">Rejouer</button><p class="aim-res">' + score + ' cibles · précision ' + acc + ' %' + (score === best && score ? ' · nouveau record !' : '') + '</p>';
      zone.querySelector(".aim-go").onclick = start; hud();
    }
    function start() {
      zone.innerHTML = ""; score = 0; miss = 0; left = 20;
      timer = setInterval(function () { left--; hud(); if (left <= 0) end(); }, 1000);
      hud(); spawn();
    }
    zone.addEventListener("mousedown", function () { if (timer) miss++; });
    box.querySelector(".icon-btn").onclick = function () { clearInterval(timer); box.remove(); onClose(); };
    zone.innerHTML = '<button class="btn primary aim-go">Jouer</button><p class="aim-res">Touche un maximum de cibles en 20 s</p>';
    zone.querySelector(".aim-go").onclick = start;
    hud();
    return box;
  }

  function showSettings() {
    active = null;
    renderTabs();
    var v = $("view"), L = layout();
    v.classList.add("settings");
    v.scrollTop = 0;
    v.innerHTML =
      '<div class="set-head"><h2>Réglages</h2><button class="btn primary" id="set-done">Terminé</button></div>' +

      '<div class="section-title">Langue</div>' +
      '<div class="seg" id="set-lang"><button data-v="fr">Français</button><button data-v="en">English</button></div>' +
      '<p class="hint left mt-s" id="set-lang-hint" hidden>Appliqué en cliquant sur Terminé · Applied when you click Done</p>' +

      '<div class="section-title mt">Onglets</div>' +
      '<p class="hint left">Glisse pour changer l\'ordre. Les onglets décochés passent dans le menu ☰.</p>' +
      '<div class="set-list" id="set-tabs">' + L.order.filter(mod).map(function (id) {
        var vis = L.hidden.indexOf(id) < 0;
        return '<div class="set-row" draggable="true" data-id="' + id + '"><i class="grip">' + SZIcon("grip") + '</i>' + icon(id) +
          '<span>' + esc(mod(id).name) + '</span>' +
          '<label class="switch"><input type="checkbox"' + (vis ? " checked" : "") + '><span class="track"></span></label></div>';
      }).join("") + '</div>' +
      '<label class="switch mt-s"><input type="checkbox" id="set-labels"' + (L.labels ? " checked" : "") + '><span class="track"></span>Afficher le nom sous les icônes</label>' +

      '<div class="section-title mt">Pipette</div>' +
      '<label class="switch"><input type="checkbox" id="set-loupe"' + (api.store.get("hub.pipetteLoupe", false) ? " checked" : "") + '><span class="track"></span>Loupe (zoom sur les pixels) <span class="beta">bêta</span></label>' +

      '<div class="section-title mt">Courbes</div>' +
      '<label class="switch"><input type="checkbox" id="set-autosep"' + (api.store.get("hub.autoSeparate", false) ? " checked" : "") + '><span class="track"></span>Séparer les dimensions automatiquement</label>' +
      '<p class="hint left">Quand une courbe dépasse du carré (Back…) sur une Position, la séparation X / Y est faite sans te demander.</p>' +

      '<div class="section-title mt">Accès rapide</div>' +
      '<p class="hint left">Clic droit sur n\'importe quel bouton d\'un onglet pour l\'épingler en haut du panneau. Glisse pour réordonner.</p>' +
      '<div class="set-list" id="set-pins"></div>' +

      '<div class="btn-row mt"><button class="btn grow" id="set-reset">Réinitialiser la disposition</button></div>' +
      credits();

    // Langue : choisie ici, appliquée en cliquant sur « Terminé » (le panneau se recharge alors)
    var curLang = window.SZI18N ? SZI18N.lang : "en", pendingLang = curLang;
    function drawLang() {
      v.querySelectorAll("#set-lang button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === pendingLang); });
      $("set-lang-hint").hidden = pendingLang === curLang;
    }
    v.querySelectorAll("#set-lang button").forEach(function (b) {
      b.onclick = function () { pendingLang = b.dataset.v; drawLang(); };
    });
    drawLang();

    // Onglets : visibilité
    v.querySelectorAll("#set-tabs .set-row").forEach(function (row) {
      row.querySelector("input").onchange = function () {
        var Lx = layout(), id = row.dataset.id, i = Lx.hidden.indexOf(id);
        if (this.checked && i >= 0) Lx.hidden.splice(i, 1);
        if (!this.checked && i < 0) {
          if (Lx.order.length - Lx.hidden.length <= 1) { this.checked = true; return status("Garde au moins un onglet visible.", "err"); }
          Lx.hidden.push(id);
        }
        saveLayout(Lx); renderTabs();
      };
    });
    sortable($("set-tabs"), function (ids) { var Lx = layout(); Lx.order = ids; saveLayout(Lx); renderTabs(); });

    $("set-labels").onchange = function () { var Lx = layout(); Lx.labels = this.checked; saveLayout(Lx); renderTabs(); };
    $("set-autosep").onchange = function () { api.store.set("hub.autoSeparate", this.checked); };

    // Easter egg : 3 clics rapides sur le logo Toolkit → mini aim trainer
    (function () {
      var logo = v.querySelector(".credits .tk-logo"), hits = [], game = null;
      if (!logo) return;
      logo.style.cursor = "pointer";
      logo.addEventListener("click", function () {
        var now = Date.now();
        hits = hits.filter(function (t) { return now - t < 900; }).concat(now);
        if (hits.length >= 3 && !game) { hits = []; game = aimTrainer(v.querySelector(".credits"), function () { game = null; }); }
      });
    })();
    $("set-loupe").onchange = function () { api.store.set("hub.pipetteLoupe", this.checked); window.SZ_PIPETTE_LOUPE = this.checked; };

    function drawPins() {
      var P = pins(), box = $("set-pins");
      if (!P.length) { box.innerHTML = '<p class="sw-empty">Aucune action épinglée pour l\'instant.</p>'; return; }
      box.innerHTML = P.map(function (p, i) {
        return '<div class="set-row" draggable="true" data-id="' + i + '"><i class="grip">' + SZIcon("grip") + '</i>' + (p.mod ? icon(p.mod) : "") +
          '<span>' + esc(p.label) + '<small>' + esc(mod(p.mod) ? mod(p.mod).name : "") + '</small></span><button class="icon-btn" title="Retirer">' + SZIcon("close") + '</button></div>';
      }).join("");
      box.querySelectorAll(".set-row button").forEach(function (b) {
        b.onclick = function () { var list = pins(); list.splice(+b.parentNode.dataset.id, 1); savePins(list); drawPins(); };
      });
      sortable(box, function (idx) { var P0 = pins(); savePins(idx.map(function (i) { return P0[+i]; })); drawPins(); });
    }
    drawPins();

    $("set-done").onclick = function () {
      if (pendingLang !== curLang) {
        api.store.set("lang", pendingLang);
        if (window.SZI18N) SZI18N.setLang(pendingLang);
        status(pendingLang === "en" ? "Switching to English…" : "Passage en français…");
        setTimeout(function () { location.reload(); }, 450);   // laisse le temps d'écrire le fichier de sauvegarde
        return;
      }
      showModule(api.store.get("lastModule"));
    };
    var armed = false;
    $("set-reset").onclick = function () {
      if (!armed) { armed = true; this.textContent = "Clique à nouveau pour confirmer"; return; }
      api.store.set("hub.layout", null); api.store.set("hub.quickHintOff", false);
      status("Disposition réinitialisée.", "ok"); showSettings();
    };
  }

  /* Liste réordonnable par glisser-déposer. onChange(ids) */
  function sortable(list, onChange) {
    var drag = null;
    list.querySelectorAll(".set-row").forEach(function (row) {
      row.addEventListener("dragstart", function (e) { drag = row; row.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", ""); } catch (x) {} });
      row.addEventListener("dragend", function () {
        row.classList.remove("dragging"); drag = null;
        onChange(Array.prototype.map.call(list.querySelectorAll(".set-row"), function (r) { return r.dataset.id; }));
      });
      row.addEventListener("dragover", function (e) {
        if (!drag || drag === row) return;
        e.preventDefault();
        var r = row.getBoundingClientRect();
        list.insertBefore(drag, e.clientY < r.top + r.height / 2 ? row : row.nextSibling);
      });
    });
  }

  /* ---------- Démarrage ---------- */
  var modulesReady = null;

  // Réglage « Loupe de la pipette » lu par js/screenpick.js
  window.SZ_PIPETTE_LOUPE = api.store.get("hub.pipetteLoupe", false);

  function boot() {
    // Accès libre : plus de licence, le panneau charge directement les outils.
    $("badge").hidden = true;
    $("btn-settings").title = "Réglages";
    document.body.classList.remove("locked");
    modulesReady = modulesReady || loadModules();
    modulesReady.then(function () {
      showModule(api.store.get("lastModule"));
      if (loadErrors.length) status("Chargement :\n" + loadErrors.join("\n"), "err");
    });
  }

  $("btn-settings").onclick = function () {
    if (!modulesReady) return;
    if (active === null && $("view").classList.contains("settings")) showModule(api.store.get("lastModule"));
    else showSettings();
  };

  boot();
})();
