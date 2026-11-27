/* Module Couleurs — bibliothèque de palettes, couleurs récentes, couleurs du projet. */
SZ.register({
  id: "colors",
  name: "Couleurs",
  order: 4,

  mount: function (el, api) {
    var st = api.store.get("colors.prefs", { mode: "fill", scope: "comp" });
    if (st.width == null) st.width = 4;
    if (st.radius == null) st.radius = 12;
    /* Bibliothèque : [{ id, name, colors:[HEX] }] + palette active.
       Reprise automatique de l'ancienne palette unique (colors.saved). */
    var lib = api.store.get("colors.palettes", null);
    if (!lib) {
      var old = api.store.get("colors.saved", []);
      lib = [{ id: "p" + Date.now(), name: "Ma palette", colors: old }];
      api.store.set("colors.palettes", lib);
    }
    var activeId = api.store.get("colors.activePalette", lib[0] && lib[0].id);
    function pal() {
      var p = lib.filter(function (x) { return x.id === activeId; })[0];
      if (!p) { if (!lib.length) lib.push({ id: "p" + Date.now(), name: "Ma palette", colors: [] }); p = lib[0]; activeId = p.id; }
      return p;
    }
    /* Plusieurs exemplaires du module peuvent exister en même temps (onglet ouvert + action épinglée
       rejouée hors écran). Chacun prévient les autres quand il enregistre, et les autres rechargent la
       bibliothèque : sinon un exemplaire resté avec une ancienne liste écraserait les couleurs ajoutées. */
    var instId = "c" + Date.now() + Math.random();
    function saveLib() {
      api.store.set("colors.palettes", lib); api.store.set("colors.activePalette", activeId);
      try { window.dispatchEvent(new CustomEvent("sz-colors-lib", { detail: instId })); } catch (e) {}
    }
    function onLibChanged(e) {
      if (!document.body.contains(el)) { window.removeEventListener("sz-colors-lib", onLibChanged); return; }
      if (e.detail === instId) return;
      lib = api.store.get("colors.palettes", lib) || lib;
      activeId = api.store.get("colors.activePalette", activeId);
      if (typeof renderAll === "function") renderAll();
    }
    window.addEventListener("sz-colors-lib", onLibChanged);
    var recent = api.store.get("colors.recent", []);
    var project = [];
    var cur = api.store.get("colors.current", "DDFF12");

    el.innerHTML =
      '<div class="seg" id="c-mode">' +
      '  <button data-v="fill">Remplissage</button><button data-v="stroke">Contour</button>' +
      '</div>' +
      '<div class="c-editor">' +
      '  <button class="c-big" id="c-big" title="Afficher / masquer le sélecteur"></button>' +
      '  <div class="c-hex"><span>#</span><input class="input" id="c-hex" maxlength="80" spellcheck="false" title="Colle un ou plusieurs codes HEX"></div>' +
      '  <button class="icon-btn" id="c-pick" title="Récupérer la couleur du calque sélectionné dans After Effects">' +
      '    ' + SZIcon("fromLayer") + '' +
      '  </button>' +
      '</div>' +
      '<div class="c-picker" id="c-picker"></div>' +
      '<div class="btn-row">' +
      '  <button class="btn primary grow" id="c-apply">Appliquer</button>' +
      '  <button class="btn btn-ic" id="c-save" title="Ajouter la couleur à la palette ouverte">' + SZIcon("plus") + '<span>Palette</span></button>' +
      '</div>' +

      '<div class="c-stroke" id="c-stroke">' +
      '  <div class="frow"><label>Épaisseur</label>' +
      '    <div class="num"><button data-w="-1">−</button><input class="input" id="c-width" type="number" min="0" step="1"><button data-w="1">+</button></div>' +
      '    <span class="unit">px</span></div>' +
      '  <div class="btn-row">' +
      '    <button class="btn btn-ic grow" id="c-add-stroke" title="Ajoute un contour aux formes et textes qui n\'en ont pas, et règle ceux qui existent">' + SZIcon("plus") + '<span>Ajouter le contour</span></button>' +
      '    <button class="btn grow" id="c-rm-stroke">Retirer le contour</button>' +
      '  </div>' +
      '  <div class="frow mt-s"><label>Style</label>' +
      '    <div class="seg" id="c-style"><button data-cap="2" data-join="2">Arrondi</button><button data-cap="1" data-join="1">Net</button><button data-cap="3" data-join="3">Carré</button></div></div>' +
      '  <div class="frow"><label>Coins</label>' +
      '    <div class="num"><input class="input" id="c-radius" type="number" min="0" step="1"></div><span class="unit">px</span>' +
      '    <button class="btn" id="c-round" title="Arrondit les angles des calques de forme (0 = retirer)">Arrondir</button></div>' +
      '</div>' +

      '<div class="c-head mt"><span class="section-title">Palettes</span>' +
      '  <button class="icon-btn" id="c-imp" title="Importer (.ase d\'Illustrator / Photoshop, .json, .txt)">' + SZIcon("import") + '</button>' +
      '  <button class="icon-btn" id="c-exp" title="Exporter la bibliothèque (.json)">' + SZIcon("export") + '</button>' +
      '  <button class="icon-btn" id="c-new" title="Nouvelle palette">' + SZIcon("plus") + '</button>' +
      '</div>' +
      '<div class="pl-list" id="c-active"></div>' +
      '<button class="pl-more" id="c-more"><span id="c-more-label"></span><i>' + SZIcon("chevron") + '</i></button>' +
      '<div class="pl-drawer" id="c-drawer" hidden>' +
      '<div class="pl-tools" id="c-tools">' +
      '  <input class="input f-text grow" id="c-search" placeholder="Rechercher…" spellcheck="false">' +
      '  <div class="seg mini" id="c-sort"><button data-v="manual" title="Ton ordre (glisser pour déplacer)">Ordre</button><button data-v="recent" title="Les plus récemment utilisées d\'abord">Récentes</button><button data-v="az" title="Ordre alphabétique">A→Z</button></div>' +
      '</div>' +
      '<div class="pl-list" id="c-lib"></div>' +
      '</div>' +

      '<div class="c-head mt"><span class="section-title">Récentes</span></div>' +
      '<div class="swatches" id="c-recent"></div>' +

      '<div class="c-head mt"><span class="section-title">Dans le projet</span>' +
      '  <div class="seg mini" id="c-scope"><button data-v="comp">Compo</button><button data-v="project">Projet</button></div>' +
      '  <button class="icon-btn" id="c-proj-save" title="Enregistrer ces couleurs comme nouvelle palette">' + SZIcon("plus") + '</button>' +
      '  <button class="icon-btn" id="c-scan" title="Actualiser">' +
      '    ' + SZIcon("refresh") + '' +
      '  </button></div>' +
      '<div class="swatches" id="c-project"></div>' +
      '<p class="hint c-hint">Clic : appliquer · Alt + clic : charger dans l\'éditeur · Maj + clic : couleur à remplacer</p>' +

      '<div class="section-title mt">Remplacer une couleur</div>' +
      '<div class="form">' +
      '  <div class="c-rep">' +
      '    <button class="c-chip" id="c-rep-from" title="Couleur à remplacer"></button>' +
      '    <div class="c-hex"><span>#</span><input class="input" id="c-rep-hex" maxlength="7" spellcheck="false" placeholder="FF5A36"></div>' +
      '    <span class="c-arrow">' + SZIcon("arrowRight") + '</span>' +
      '    <span class="c-chip" id="c-rep-to" title="Couleur courante"></span>' +
      '  </div>' +
      '  <div class="frow"><label>Où</label><div class="seg" id="c-rep-scope"><button data-v="comp">Compo active</button><button data-v="project">Tout le projet</button></div></div>' +
      '  <button class="btn" id="c-rep-go">Remplacer par la couleur courante</button>' +
      '  <details class="adv" id="c-rep-adv"><summary>Options avancées</summary>' +
      '    <div class="frow"><label>Tolérance</label><div class="num"><input class="input" id="c-rep-tol" type="number" min="0" max="60" step="1"></div><span class="unit">0 = couleur identique</span></div>' +
      '  </details>' +
      '  <p class="hint left">Remplit aussi les clés animées, les textes et les solides. Maj + clic sur une pastille la choisit comme couleur à remplacer.</p>' +
      '</div>';

    var $ = function (id) { return el.querySelector("#" + id); };
    var norm = function (h) { return String(h).replace(/[^0-9a-f]/gi, "").toUpperCase(); };

    /* ----- Éditeur ----- */
    function setCur(hex, persist) {
      cur = norm(hex);
      $("c-big").style.background = "#" + cur;
      if ($("c-rep-to")) $("c-rep-to").style.background = "#" + cur;
      if (picker && !fromPicker) picker.set(cur);
      if (document.activeElement !== $("c-hex")) $("c-hex").value = cur;
      if (persist !== false) api.store.set("colors.current", cur);
      markActive();
    }
    // Sélecteur intégré (replié / déplié en cliquant sur la pastille)
    var fromPicker = false;
    var picker = SZPicker.create($("c-picker"), {
      hex: cur, noHex: true,
      onInput: function (h) { fromPicker = true; setCur(h, false); fromPicker = false; },
      onChange: function (h) { fromPicker = true; setCur(h); fromPicker = false; }
    });
    var pkOpen = api.store.get("colors.pickerOpen", true);
    $("c-picker").hidden = !pkOpen;
    $("c-big").onclick = function () {
      pkOpen = !pkOpen; $("c-picker").hidden = !pkOpen; api.store.set("colors.pickerOpen", pkOpen);
    };
    $("c-hex").addEventListener("change", function () {
      var all = (this.value.match(/[0-9a-f]{6}\b|\b[0-9a-f]{3}\b/gi) || []).map(function (h) {
        h = h.toUpperCase();
        return h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
      });
      if (!all.length) { api.status("Code HEX invalide (ex. DDFF12).", "err"); this.value = cur; return; }
      setCur(all[0]);
      if (all.length > 1) {
        var P = pal();
        all.forEach(function (h) { if (P.colors.indexOf(h) < 0) P.colors.push(h); });
        saveLib(); renderAll();
        this.value = cur;
        api.status(all.length + " couleurs ajoutées à « " + P.name + " ».", "ok");
      }
    });

    /* ----- Segments ----- */
    function segInit(id, key) {
      var s = $(id);
      s.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("on", b.dataset.v === st[key]);
        b.onclick = function () {
          st[key] = b.dataset.v;
          api.store.set("colors.prefs", st);
          s.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
          if (key === "scope") scan();
          if (key === "mode") showStroke();
        };
      });
    }
    segInit("c-mode", "mode");

    /* ----- Outils de contour (visibles en mode Contour) ----- */
    function showStroke() {
      $("c-stroke").hidden = st.mode !== "stroke";
      $("c-apply").textContent = st.mode === "stroke" ? "Appliquer au contour" : "Appliquer";
    }
    var width = $("c-width"), radius = $("c-radius");
    width.value = st.width; radius.value = st.radius;
    width.onchange = function () { st.width = Math.max(0, +width.value || 0); width.value = st.width; api.store.set("colors.prefs", st); };
    radius.onchange = function () { st.radius = Math.max(0, +radius.value || 0); radius.value = st.radius; api.store.set("colors.prefs", st); };
    el.querySelectorAll("[data-w]").forEach(function (b) {
      b.onclick = function () { width.value = Math.max(0, (+width.value || 0) + (+b.dataset.w)); width.onchange(); };
    });
    $("c-add-stroke").onclick = function () {
      api.run("SZ.colors.addStroke", [cur, st.width]).then(function (r) { if (r.indexOf("OK:") === 0) { pushRecent(cur); renderAll(); lastScan = 0; autoScan(); } });
    };
    $("c-rm-stroke").onclick = function () { api.run("SZ.colors.removeStroke", []); };
    $("c-round").onclick = function () { api.run("SZ.colors.roundCorners", [st.radius]); };
    el.querySelectorAll("#c-style button").forEach(function (b) {
      b.onclick = function () { api.run("SZ.colors.strokeStyle", [+b.dataset.cap, +b.dataset.join]); };
    });
    showStroke();
    segInit("c-scope", "scope");

    /* ----- Nuanciers ----- */
    function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
    function swatch(hex, kind) {
      var b = document.createElement("button");
      b.className = "sw";
      b.style.background = "#" + hex;
      b.title = "#" + hex;
      b.dataset.hex = hex;
      var P = pal();
      var act = kind === "saved" ? "×" : (P.colors.indexOf(hex) < 0 ? "+" : "");
      if (act) b.innerHTML = act === "×" ? '<em class="del-btn" title="Retirer de la palette">' + SZDel.html() + "</em>"
        : '<em title="Ajouter à « ' + esc(P.name) + ' »">' + SZIcon("plus") + "</em>";
      b.onclick = function (e) {
        if (e.target.tagName === "EM") {
          if (act === "×" && !SZDel.confirm(e.target)) return;
          if (act === "×") P.colors.splice(P.colors.indexOf(hex), 1);
          else P.colors.push(hex);
          touch(P);
          saveLib();
          return renderAll();
        }
        if (e.shiftKey) { setRepFrom(hex); return; }
        setCur(hex);
        if (kind === "saved") { touch(P); saveLib(); }
        if (!e.altKey) apply();
      };
      return b;
    }
    function fill(id, list, kind, empty) {
      var box = $(id);
      box.innerHTML = "";
      if (!list.length) { box.innerHTML = '<p class="sw-empty">' + empty + "</p>"; return; }
      list.forEach(function (h) { box.appendChild(swatch(h, kind)); });
    }
    function markActive() {
      el.querySelectorAll(".sw").forEach(function (s) { s.classList.toggle("on", s.dataset.hex === cur); });
    }

    /* ----- Bibliothèque de palettes ----- */
    var sortMode = api.store.get("colors.sort", "manual"), query = "";
    function touch(p) { p.used = Date.now(); }

    function visible() {
      var list = lib.slice(0), q = query.trim().toLowerCase();
      if (q) list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; });
      if (sortMode === "recent") list.sort(function (a, b) { return (b.used || b.created || 0) - (a.used || a.created || 0); });
      if (sortMode === "az") list.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }); });
      // Les palettes étoilées restent en haut, dans l'ordre choisi
      return list.filter(function (p) { return p.star; }).concat(list.filter(function (p) { return !p.star; }));
    }

    var drawerOpen = api.store.get("colors.drawer", false);
    function renderLib() {
      var P = pal(), others = visible().filter(function (p) { return p.id !== P.id; });
      // La palette en cours, toujours visible
      var act = $("c-active");
      act.innerHTML = "";
      renderRows(act, [P], P);
      // Les autres : menu dépliant
      $("c-more").hidden = lib.length < 2;
      $("c-more-label").textContent = (drawerOpen ? "Masquer" : "Autres palettes") + " (" + (lib.length - 1) + ")";
      $("c-more").classList.toggle("open", drawerOpen);
      $("c-drawer").hidden = !drawerOpen || lib.length < 2;
      $("c-tools").hidden = lib.length < 5;
      el.querySelectorAll("#c-sort button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === sortMode); });
      var box = $("c-lib");
      box.innerHTML = "";
      if (!others.length) { box.innerHTML = '<p class="sw-empty">' + (query ? 'Aucune palette ne correspond à « ' + esc(query) + ' ».' : "Aucune autre palette.") + '</p>'; return; }
      renderRows(box, others, P);
      sortableLib(box);
    }
    function renderRows(box, list, P) {
      list.forEach(function (p) {
        var row = document.createElement("div");
        var on = p.id === P.id;
        row.className = "pl" + (on ? " on" : "") + (p.star ? " starred" : "");
        row.dataset.id = p.id;
        row.draggable = box.id === "c-lib";
        var star = '<i class="pl-star' + (p.star ? " on" : "") + '" title="' + (p.star ? "Retirer des favorites" : "Garder en haut de la liste") + '">' + SZIcon("star") + "</i>";
        if (on) {
          row.innerHTML = '<div class="pl-head"><i class="pl-grip" title="Glisser pour déplacer">' + SZIcon("grip") + '</i><span class="pl-name" title="Double-clic pour renommer">' + esc(p.name) + '</span>' +
            '<span class="pl-count">' + p.colors.length + '</span>' + star + '<i class="pl-ase" title="Exporter cette palette en .ase (Illustrator, Photoshop)">.ase</i><i class="pl-del del-btn" title="Supprimer la palette">' + SZDel.html() + '</i></div>' +
            '<div class="swatches pl-sw"></div>';
          var sw = row.querySelector(".pl-sw");
          if (!p.colors.length) sw.innerHTML = '<p class="sw-empty">Vide : « + Palette » ajoute la couleur courante, ou colle plusieurs codes HEX dans le champ.</p>';
          else p.colors.forEach(function (h) { sw.appendChild(swatch(h, "saved")); });
          var nm = row.querySelector(".pl-name");
          nm.ondblclick = function () { startRename(nm, p); };
          row.querySelector(".pl-ase").onclick = function (e) { e.stopPropagation(); exportASE(p); };
          var del = row.querySelector(".pl-del");
          del.onclick = function () {
            if (!SZDel.confirm(del)) return;
            lib = lib.filter(function (x) { return x.id !== p.id; });
            activeId = lib[0] ? lib[0].id : null;
            saveLib(); renderAll();
            api.status("Palette « " + p.name + " » supprimée.", "ok");
          };
        } else {
          row.innerHTML = '<div class="pl-head"><i class="pl-grip" title="Glisser pour déplacer">' + SZIcon("grip") + '</i><span class="pl-name">' + esc(p.name) + '</span>' +
            '<span class="pl-strip">' + p.colors.slice(0, 10).map(function (h) { return '<i style="background:#' + h + '"></i>'; }).join("") + '</span>' +
            '<span class="pl-count">' + p.colors.length + '</span>' + star + '</div>';
          row.onclick = function (e) {
            if (e.target.classList.contains("pl-star")) return;
            activeId = p.id; touch(p); drawerOpen = false; api.store.set("colors.drawer", false); saveLib(); renderAll();
          };
          row.title = "Ouvrir « " + p.name + " »";
        }
        row.querySelector(".pl-star").onclick = function (e) {
          e.stopPropagation();
          p.star = !p.star; saveLib(); renderAll();
        };
        box.appendChild(row);
      });
    }
    $("c-more").onclick = function () { drawerOpen = !drawerOpen; api.store.set("colors.drawer", drawerOpen); renderLib(); markActive(); };

    /* Glisser-déposer : l'ordre affiché devient « ton ordre ». */
    function sortableLib(box) {
      var drag = null;
      box.querySelectorAll(".pl").forEach(function (row) {
        row.addEventListener("dragstart", function (e) {
          if (e.target.closest && e.target.closest(".sw")) { e.preventDefault(); return; }
          drag = row; row.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          try { e.dataTransfer.setData("text/plain", row.dataset.id); } catch (x) {}
        });
        row.addEventListener("dragover", function (e) {
          if (!drag || drag === row) return;
          e.preventDefault();
          var r = row.getBoundingClientRect();
          box.insertBefore(drag, e.clientY < r.top + r.height / 2 ? row : row.nextSibling);
        });
        row.addEventListener("dragend", function () {
          if (!drag) return;
          drag.classList.remove("dragging"); drag = null;
          var ids = Array.prototype.map.call(box.querySelectorAll(".pl"), function (r) { return r.dataset.id; });
          ids.unshift(activeId);
          var shown = lib.filter(function (p) { return ids.indexOf(p.id) >= 0; });
          var hidden = lib.filter(function (p) { return ids.indexOf(p.id) < 0; });
          lib = ids.map(function (id) { return shown.filter(function (p) { return p.id === id; })[0]; }).concat(hidden);
          sortMode = "manual"; api.store.set("colors.sort", sortMode);
          saveLib(); renderAll();
        });
      });
    }

    $("c-search").oninput = function () { query = this.value; renderLib(); markActive(); };
    el.querySelectorAll("#c-sort button").forEach(function (b) {
      b.onclick = function () { sortMode = b.dataset.v; api.store.set("colors.sort", sortMode); renderLib(); markActive(); };
    });

    /* ----- Remplacer une couleur partout ----- */
    var rep = api.store.get("colors.replace", { from: "FF5A36", scope: "comp", tol: 0 });
    function setRepFrom(h) {
      rep.from = norm(h); api.store.set("colors.replace", rep);
      $("c-rep-from").style.background = "#" + rep.from;
      if (document.activeElement !== $("c-rep-hex")) $("c-rep-hex").value = rep.from;
    }
    function initReplace() {
      setRepFrom(rep.from);
      $("c-rep-hex").oninput = function () { var h = norm(this.value); if (h.length === 6) setRepFrom(h); };
      $("c-rep-from").onclick = function () { SZPicker.popover($("c-rep-from"), rep.from, setRepFrom); };
      $("c-rep-tol").value = rep.tol;
      $("c-rep-tol").onchange = function () { rep.tol = Math.max(0, Math.min(60, +this.value || 0)); this.value = rep.tol; api.store.set("colors.replace", rep); };
      $("c-rep-scope").querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("on", b.dataset.v === rep.scope);
        b.onclick = function () {
          rep.scope = b.dataset.v; api.store.set("colors.replace", rep);
          $("c-rep-scope").querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
        };
      });
      $("c-rep-go").onclick = function () {
        if (rep.from === cur) return api.status("Les deux couleurs sont identiques.", "err");
        api.run("SZ.colors.replaceAll", [rep.from, cur, rep.scope, rep.tol]).then(function (r) { if (r.indexOf("OK:") === 0) { pushRecent(cur); lastScan = 0; scan(true); } });
      };
    }

    /* ----- Export d'une palette en .ase (Adobe Swatch Exchange) ----- */
    function buildASE(p) {
      function u16(n) { var b = Buffer.alloc(2); b.writeUInt16BE(n, 0); return b; }
      function u32(n) { var b = Buffer.alloc(4); b.writeUInt32BE(n, 0); return b; }
      function f32(n) { var b = Buffer.alloc(4); b.writeFloatBE(n, 0); return b; }
      function name(t) { var b = Buffer.from(t + "\u0000", "utf16le"); b.swap16(); return Buffer.concat([u16(t.length + 1), b]); }
      function block(type, body) { return Buffer.concat([u16(type), u32(body.length), body]); }
      var blocks = [block(0xC001, name(p.name))];
      p.colors.forEach(function (h) {
        var c = SZPicker.hex2rgb(h);
        blocks.push(block(0x0001, Buffer.concat([name("#" + h), Buffer.from("RGB ", "ascii"), f32(c[0] / 255), f32(c[1] / 255), f32(c[2] / 255), u16(2)])));
      });
      blocks.push(block(0xC002, Buffer.alloc(0)));
      return Buffer.concat([Buffer.from("ASEF", "ascii"), u16(1), u16(0), u32(blocks.length)].concat(blocks));
    }
    function exportASE(p) {
      var node = SZBridge.node;
      if (!node) return api.status("Export indisponible hors After Effects.", "err");
      if (!p.colors.length) return api.status("La palette est vide.", "err");
      var file = p.name.replace(/[\\\/:*?"<>|]/g, "-") + ".ase";
      api.call("SZ.pickSavePath", [file, "Exporter la palette (.ase)", ".ase"]).then(function (r) {
        if (r.indexOf("FILE:") !== 0) return;
        try { node("fs").writeFileSync(r.slice(5), buildASE(p)); api.status("Palette exportée : " + node("path").basename(r.slice(5)), "ok"); }
        catch (e) { api.status("Impossible d'écrire le fichier : " + e.message, "err"); }
      });
    }

    function renderAll() {
      renderLib();
      fill("c-recent", recent, "recent", "Les couleurs appliquées apparaîtront ici.");
      fill("c-project", project, "project", "Aucune couleur trouvée.");
      markActive();
    }
    /* Renommage : double-clic sur le nom → champ en place ; Entrée valide, Échap annule. */
    function startRename(span, p) {
      var inp = document.createElement("input");
      inp.className = "pl-name-edit";
      inp.value = p.name;
      inp.spellcheck = false;
      span.replaceWith(inp);
      inp.focus(); inp.select();
      var done = false;
      function finish(ok) {
        if (done) return; done = true;
        if (ok && inp.value.trim()) { p.name = inp.value.trim(); saveLib(); }
        renderAll();
      }
      inp.onkeydown = function (e) { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
      inp.onblur = function () { finish(true); };
    }
    function newPalette(name, colors) {
      var p = { id: "p" + Date.now() + Math.floor(Math.random() * 1000), name: name, colors: colors || [], created: Date.now(), used: Date.now() };
      lib.unshift(p); activeId = p.id; saveLib(); renderAll();
      return p;
    }
    $("c-new").onclick = function () {
      newPalette("Palette " + (lib.length + 1), []);
      var nm = el.querySelector(".pl.on .pl-name"); if (nm) startRename(nm, pal());
    };
    $("c-proj-save").onclick = function () {
      if (!project.length) return api.status("Aucune couleur à enregistrer.", "err");
      newPalette(st.scope === "project" ? "Couleurs du projet" : "Couleurs de la compo", project.slice(0, 40));
      api.status("Palette créée avec " + Math.min(project.length, 40) + " couleurs : renomme-la.", "ok");
    };

    /* ----- Import / export ----- */
    $("c-exp").onclick = function () {
      var data = JSON.stringify({ app: "Toolkit", type: "palettes", version: 1, palettes: lib.map(function (p) { return { name: p.name, colors: p.colors }; }) }, null, 2);
      api.run("SZ.saveTextFile", [data, "sur-core-palettes.json", "Exporter les palettes"]);
    };
    $("c-imp").onclick = function () {
      api.call("SZ.pickFile", ["Importer des palettes (.ase, .json, .txt)", "*.ase;*.json;*.txt"]).then(function (r) {
        if (r.indexOf("FILE:") !== 0) return;
        var path = r.slice(5), node = SZBridge.node;
        if (!node) return api.status("Import indisponible hors After Effects.", "err");
        var fs = node("fs"), base = node("path").basename(path).replace(/\.[^.]+$/, "");
        var got = [];
        try {
          if (/\.ase$/i.test(path)) got = parseASE(fs.readFileSync(path), base);
          else {
            var txt = fs.readFileSync(path, "utf8");
            try {
              var j = JSON.parse(txt);
              (j.palettes || (Array.isArray(j) ? j : [])).forEach(function (p) { if (p && p.colors) got.push({ name: String(p.name || base), colors: p.colors.map(norm).filter(function (h) { return h.length === 6; }) }); });
            } catch (e) {
              var hx = (txt.match(/#?[0-9a-f]{6}\b/gi) || []).map(norm);
              if (hx.length) got.push({ name: base, colors: hx });
            }
          }
        } catch (err) { return api.status("Fichier illisible : " + err.message, "err"); }
        got = got.filter(function (p) { return p.colors.length; });
        if (!got.length) return api.status("Aucune couleur trouvée dans ce fichier.", "err");
        got.reverse().forEach(function (p) { lib.unshift({ id: "p" + Date.now() + Math.floor(Math.random() * 1e6), name: p.name, colors: dedupe(p.colors), created: Date.now(), used: Date.now() }); });
        activeId = lib[0].id; saveLib(); renderAll();
        api.status(got.length + " palette" + (got.length > 1 ? "s importées" : " importée") + ".", "ok");
      });
    };
    function dedupe(a) { return a.filter(function (h, i) { return a.indexOf(h) === i; }); }

    /* Lecture d'un nuancier Adobe .ase (groupes = palettes). */
    function parseASE(b, fallbackName) {
      if (b.toString("ascii", 0, 4) !== "ASEF") throw new Error("ce n'est pas un fichier .ase");
      var off = 12, out = [], cur0 = { name: fallbackName, colors: [] }, curP = cur0;
      out.push(cur0);
      function str(at, len) { var s2 = Buffer.from(b.slice(at, at + len * 2)); s2.swap16(); return s2.toString("utf16le").replace(/\u0000+$/, ""); }
      function hex(r, g, bl) { return [r, g, bl].map(function (v) { var x = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16); return x.length < 2 ? "0" + x : x; }).join("").toUpperCase(); }
      function lab2rgb(L, A, B) {
        var y = (L + 16) / 116, x = A / 500 + y, z = y - B / 200;
        function f(t) { return t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787; }
        x = 0.95047 * f(x); y = f(y); z = 1.08883 * f(z);
        var r = x * 3.2406 + y * -1.5372 + z * -0.4986, g = x * -0.9689 + y * 1.8758 + z * 0.0415, bb = x * 0.0557 + y * -0.2040 + z * 1.0570;
        function gm(c) { return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c; }
        return [gm(r), gm(g), gm(bb)];
      }
      while (off + 6 <= b.length) {
        var type = b.readUInt16BE(off), len = b.readUInt32BE(off + 2), p = off + 6;
        if (type === 0xC001) {
          var n = b.readUInt16BE(p);
          curP = { name: str(p + 2, n) || fallbackName, colors: [] };
          out.push(curP);
        } else if (type === 0xC002) {
          curP = cur0;
        } else if (type === 0x0001) {
          var nl = b.readUInt16BE(p); p += 2 + nl * 2;
          var model = b.toString("ascii", p, p + 4); p += 4;
          var c;
          if (model === "RGB ") c = hex(b.readFloatBE(p), b.readFloatBE(p + 4), b.readFloatBE(p + 8));
          else if (model === "CMYK") {
            var C = b.readFloatBE(p), M = b.readFloatBE(p + 4), Y = b.readFloatBE(p + 8), K = b.readFloatBE(p + 12);
            c = hex((1 - C) * (1 - K), (1 - M) * (1 - K), (1 - Y) * (1 - K));
          } else if (model === "Gray") { var gr = b.readFloatBE(p); c = hex(gr, gr, gr); }
          else if (model === "LAB ") { var l = lab2rgb(b.readFloatBE(p) * 100, b.readFloatBE(p + 4), b.readFloatBE(p + 8)); c = hex(l[0], l[1], l[2]); }
          if (c) curP.colors.push(c);
        }
        off += 6 + len;
      }
      return out;
    }

    /* ----- Actions After Effects ----- */
    function pushRecent(hex) {
      recent = [hex].concat(recent.filter(function (h) { return h !== hex; })).slice(0, 16);
      api.store.set("colors.recent", recent);
    }
    function apply() {
      api.run("SZ.colors.apply", [cur, st.mode, st.width]).then(function (r) {
        if (r.indexOf("OK:") === 0) { pushRecent(cur); renderAll(); lastScan = 0; autoScan(); }
      });
    }
    $("c-apply").onclick = apply;

    $("c-save").onclick = function () {
      var P = pal();
      if (P.colors.indexOf(cur) >= 0) return api.status("#" + cur + " est déjà dans « " + P.name + " ».");
      P.colors.push(cur);
      saveLib(); renderAll();
      api.status("#" + cur + " ajouté à « " + P.name + " ».", "ok");
    };

    $("c-pick").onclick = function () {
      api.call("SZ.colors.pick", [st.mode]).then(function (r) {
        if (r.indexOf("COL:") === 0) { setCur(r.slice(4)); api.status("Couleur récupérée : #" + r.slice(4), "ok"); }
        else api.status(r.indexOf("ERR:") === 0 ? r.slice(4) : "Aucune réponse d'After Effects.", "err");
      });
    };

    /* « Dans le projet » : actualisé automatiquement (ouverture de l'onglet, changement Compo/Projet,
       après chaque couleur appliquée, et quand la souris revient sur le panneau). Le bouton ↻ reste dispo.
       quiet : pas de « Analyse… », on ne redessine que si la liste a changé. */
    var lastScan = 0, scanning = false;
    var lastDur = 0;
    function scan(quiet) {
      if (scanning) return Promise.resolve();
      scanning = true; lastScan = Date.now();
      var t0 = Date.now();
      if (quiet !== true) $("c-project").innerHTML = '<p class="sw-empty">Analyse…</p>';
      return api.call("SZ.colors.scan", [st.scope]).then(function (r) {
        scanning = false; lastDur = Date.now() - t0;
        var next;
        if (r.indexOf("COL:") === 0) next = r.slice(4) ? r.slice(4).split(",") : [];
        else { next = []; if (r.indexOf("ERR:") === 0 && quiet !== true) api.status(r.slice(4), "err"); }
        if (!SZBridge.inAE) next = ["DDFF12", "1F1F1F", "FFFFFF", "FF5A36", "3B82F6", "F2E8DA"];
        if (quiet === true && next.join() === project.join()) return;
        project = next;
        renderAll();
      }, function () { scanning = false; });
    }
    $("c-scan").onclick = function () { scan(false); };
    function autoScan() {
      if (!document.body.contains(el) || el.closest("#offscreen")) return;   // onglet fermé ou montage hors écran
      if (Date.now() - lastScan < 1500) return;
      scan(true);
    }
    // Retour de la souris sur le panneau (après avoir travaillé dans After Effects)
    document.documentElement.addEventListener("mouseenter", autoScan);
    el.querySelectorAll("#c-scope button").forEach(function (b) { b.addEventListener("click", function () { lastScan = 0; setTimeout(autoScan, 0); }); });

    /* Mise à jour continue, adaptée au poids du projet : l'intervalle suit la durée de la dernière analyse
       (≈ 8 × sa durée, entre 1 s et 15 s ; au moins 3 s en mode « Projet »). En pause quand l'onglet est fermé,
       la section repliée ou le panneau masqué : After Effects n'est sollicité que si la liste est visible. */
    function liveTick() {
      if (!document.body.contains(el) || el.closest("#offscreen")) return;      // onglet quitté → on s'arrête
      var box = $("c-project");
      if (!box) return;
      var visible = !document.hidden && box.offsetParent !== null;
      if (!visible || scanning) return setTimeout(liveTick, 2000);
      scan(true).then(function () {
        var min = st.scope === "project" ? 3000 : 1000;
        setTimeout(liveTick, Math.min(15000, Math.max(min, lastDur * 8)));
      });
    }
    if (!el.closest("#offscreen")) setTimeout(liveTick, 1500);

    setCur(cur, false);
    initReplace();
    renderAll();
    scan();
  }
});
