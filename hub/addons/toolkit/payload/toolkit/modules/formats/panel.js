/* Module Compos — créer, adapter, dupliquer en profondeur. */
SZ.register({
  id: "formats",
  name: "Compos",
  order: 0,

  pin: function (btn, api) {
    if (!btn.classList.contains("f-tile")) return null;
    var st = api.store.get("formats.prefs", {}), name = btn.querySelector("b").textContent;
    var dims = btn.title.split("×").map(function (x) { return Math.round(+x.trim()); });
    var payload = JSON.stringify({ formats: [{ name: name, w: dims[0], h: dims[1] }], fps: st.fps || 25,
      duration: st.duration || 10, bg: st.bg || "000000", base: (st.base || "").trim() });
    return { fn: "SZ.formats.create", args: [payload], label: name };
  },

  mount: function (el, api) {
    var GROUPS = [
      ["Réseaux sociaux", [
        { id: "ig45",  name: "Insta 4:5",     w: 1080, h: 1350, tag: "4:5" },
        { id: "ig11",  name: "Carré",         w: 1080, h: 1080, tag: "1:1" },
        { id: "story", name: "Story / Reels", w: 1080, h: 1920, tag: "9:16" },
        { id: "ig34",  name: "Insta 3:4",     w: 1080, h: 1440, tag: "3:4" },
        { id: "li",    name: "LinkedIn",      w: 1200, h: 1500, tag: "4:5" },
        { id: "x169",  name: "X / Twitter",   w: 1600, h: 900,  tag: "16:9" }
      ]],
      ["Vidéo", [
        { id: "hd",    name: "Full HD",       w: 1920, h: 1080, tag: "16:9" },
        { id: "uhd",   name: "4K UHD",        w: 3840, h: 2160, tag: "16:9" }
      ]]
    ];
    var FPS = [24, 25, 30, 50, 60];

    var st = api.store.get("formats.prefs", {});
    if (!st.sel) st.sel = ["hd"];
    if (!st.fps) st.fps = 25;
    if (!st.duration) st.duration = 10;
    if (!st.durUnit) st.durUnit = "s";
    if (!st.bg) st.bg = "000000";
    if (!st.fit) st.fit = "contain";
    if (st.base == null) st.base = "";
    var custom = api.store.get("formats.custom", []);   // [{id,name,w,h}]

    function all() {
      var list = custom.slice(0);
      GROUPS.forEach(function (g) { list = list.concat(g[1]); });
      return list;
    }
    function byId(id) { return all().filter(function (f) { return f.id === id; })[0]; }
    function save() { api.store.set("formats.prefs", st); }

    el.innerHTML =
      '<div id="f-groups"></div>' +

      '<div class="f-perso" id="f-perso" hidden>' +
      '  <input class="input" id="f-name" placeholder="Nom (ex. Écran salon)" spellcheck="false">' +
      '  <div class="frow"><div class="num"><input class="input" id="f-w" type="number" min="4" placeholder="L"></div>' +
      '    <span class="unit">×</span><div class="num"><input class="input" id="f-h" type="number" min="4" placeholder="H"></div><span class="unit">px</span>' +
      '    <button class="btn" id="f-from" title="Reprendre la taille de la compo active">Compo active</button></div>' +
      '  <div class="btn-row"><button class="btn grow" id="f-cancel">Annuler</button><button class="btn primary grow" id="f-ok">Ajouter</button></div>' +
      '</div>' +

      '<div class="section-title mt">Réglages</div>' +
      '<div class="form">' +
      '  <div class="frow"><label>Images/s</label><div class="seg" id="f-fps">' + FPS.map(function (f) { return '<button data-v="' + f + '">' + f + "</button>"; }).join("") + '</div></div>' +
      '  <div class="frow"><label>Durée</label><div class="num"><input class="input f-dur" id="f-dur" spellcheck="false" title="Secondes, images, ou timecode (ex. 00:00:10:00)"></div>' +
      '    <div class="seg mini" id="f-unit"><button data-v="s" title="Secondes">s</button><button data-v="f" title="Images">im</button><button data-v="tc" title="Timecode (hh:mm:ss:ii)">TC</button></div>' +
      '  </div>' +
      '  <div class="frow"><label>Préfixe</label><input class="input grow f-text" id="f-base" placeholder="Optionnel" spellcheck="false" title="Ajouté devant le nom des compos créées (ex. nom du projet)">' +
      '    <span class="unit">Fond</span><button class="f-bg" id="f-bgbox" title="Couleur de fond"></button></div>' +
      '</div>' +

      '<button class="btn primary x-go mt" id="f-create"><b>Créer</b><small id="f-sum"></small></button>' +

      '<div class="section-title mt">Marges de sécurité</div>' +
      '<div class="form">' +
      '  <div class="seg seg-act" id="f-safe">' +
      '    <button data-z="reels" title="Instagram / Facebook Reels (9:16)">Reels</button>' +
      '    <button data-z="stories" title="Instagram / Facebook Stories (9:16)">Stories</button>' +
      '    <button data-z="tiktok" title="TikTok (9:16)">TikTok</button>' +
      '    <button data-z="grid" title="Grille du profil Instagram : les posts 4:5 y sont recadrés en 3:4">Grille Insta</button>' +
      '  </div>' +
      '  <p class="hint left">Pose sur la compo active un calque guide (jamais rendu) : en rouge, les zones cachées par l\'interface de l\'appli. Un seul guide à la fois : choisir un autre réseau remplace le précédent, recliquer sur le guide actif le retire.<br>' +
      '  <b>Grille Insta</b> : sur un profil Instagram, les posts 4:5 sont affichés recadrés en 3:4 ; le guide montre ce qui reste visible.</p>' +
      '</div>' +

      '<div class="section-title mt">Adapter à d\'autres formats</div>' +
      '<div class="form">' +
      '  <p class="hint left">Ton anim est finie en 16:9 et il te faut la version 4:5 et 9:16 ? Ouvre-la, choisis les formats au-dessus (Ctrl/Cmd + clic), puis clique ici. ' +
      '  Une compo est créée par format, avec ton anim dedans, recadrée. Tu modifies l\'original, toutes les versions suivent.</p>' +
      '  <div class="frow"><label>Cadrage</label><div class="seg" id="f-fit"><button data-v="contain">Tout voir</button><button data-v="cover">Remplir le cadre</button></div></div>' +
      '  <button class="btn" id="f-adapt">Adapter la compo active</button>' +
      '</div>' +

      '<div class="section-title mt">Dupliquer en profondeur</div>' +
      '<div class="form">' +
      '  <p class="hint left">Copie la compo <b>et toutes ses précompos</b> : la copie est totalement indépendante de l\'original. Les médias (vidéos, images, sons) restent partagés.</p>' +
      '  <div class="frow"><label>Source</label><div class="seg" id="f-dsrc"><button data-v="active">Compo active</button><button data-v="selection">Sélection Projet</button></div></div>' +
      '  <details class="adv"><summary>Options avancées</summary>' +
      '    <div class="frow"><label>Changer</label><input class="input grow f-text" id="f-dfrom" placeholder="Teaser" spellcheck="false" title="Remplace ce mot dans le nom des copies (compo et précompos)">' +
      '      <span class="unit">par</span><input class="input grow f-text" id="f-dto" placeholder="Reveal" spellcheck="false"></div>' +
      '    <div class="frow"><label>Suffixe</label><input class="input grow f-text" id="f-dsuf" placeholder="_copie" spellcheck="false" title="Ajouté au nom des copies quand « Changer » est vide"></div>' +
      '    <div class="frow"><label>Exclure</label><input class="input grow f-text" id="f-dkeep" placeholder="ex. Logo" spellcheck="false" title="Les précompos dont le nom contient un de ces mots ne sont pas copiées (elles restent partagées)"></div>' +
      '    <label class="switch"><input type="checkbox" id="f-dfold"><span class="track"></span>Ranger la copie dans un dossier</label>' +
      '  </details>' +
      '  <button class="btn" id="f-dup">Dupliquer en profondeur</button>' +
      '</div>';

    var $ = function (id) { return el.querySelector("#" + id); };

    /* ---------- Grille ---------- */
    function thumb(f) {
      var r = f.w / f.h, W = 26, H = 26, w = r >= 1 ? W : W * r, h = r >= 1 ? H / r : H;
      return '<i class="f-ratio"><b style="width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px"></b></i>';
    }
    function tile(f, isCustom) {
      var on = st.sel.indexOf(f.id) >= 0;
      return '<button class="f-tile' + (on ? " on" : "") + '" data-id="' + f.id + '" title="' + f.w + " × " + f.h + (f.tag ? " · " + f.tag : "") + '">' +
        thumb(f) + '<span><b>' + f.name.replace(/</g, "&lt;") + '</b><small>' + f.w + "×" + f.h + "</small></span>" +
        (isCustom ? '<em class="del-btn" title="Supprimer ce format">' + SZDel.html() + '</em>' : "") + "</button>";
    }
    function render() {
      chosen();
      var html = "";
      GROUPS.forEach(function (g, gi) {
        html += '<div class="section-title' + (gi ? " mt" : "") + '">' + g[0] + '</div><div class="f-grid">' + g[1].map(function (f) { return tile(f, false); }).join("") + "</div>";
      });
      html += '<div class="c-head mt"><span class="section-title">Mes formats</span>' +
        '<button class="icon-btn" id="f-add" title="Ajouter un format perso">' + SZIcon("plus") + '</button></div>' +
        '<div class="f-grid">' + (custom.length ? custom.map(function (f) { return tile(f, true); }).join("")
          : '<p class="sw-empty">Ajoute tes formats clients avec +.</p>') + "</div>";
      html += '<p class="hint left mt-s">Ctrl/Cmd + clic : plusieurs · Double-clic : créer</p>';
      $("f-groups").innerHTML = html;
      $("f-groups").querySelectorAll(".f-tile").forEach(function (b) {
        b.onclick = function (e) {
          var id = b.dataset.id;
          if (e.target.tagName === "EM") {
            if (!SZDel.confirm(e.target)) return;
            custom = custom.filter(function (f) { return f.id !== id; });
            api.store.set("formats.custom", custom);
            st.sel = st.sel.filter(function (x) { return x !== id; }); save();
            return render();
          }
          // Clic = choisir ce format seul ; Ctrl/Cmd/Maj + clic = en ajouter plusieurs
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            var i = st.sel.indexOf(id);
            if (i >= 0) { if (st.sel.length > 1) st.sel.splice(i, 1); } else st.sel.push(id);
          } else st.sel = [id];
          save(); render();
        };
        b.ondblclick = function (e) { if (e.target.tagName !== "EM") { st.sel = [b.dataset.id]; save(); render(); create(); } };
      });
      $("f-add").onclick = function () { $("f-perso").hidden = false; $("f-name").focus(); };
      summary();
    }
    function chosen() {
      var c = st.sel.map(byId).filter(Boolean);
      if (!c.length) { st.sel = ["hd"]; save(); c = [byId("hd")]; }
      return c;
    }
    function summary() {
      var c = chosen();
      $("f-sum").textContent = c.length === 1
        ? c[0].name + " · " + c[0].w + "×" + c[0].h + " · " + st.fps + " i/s · " + durLabel()
        : c.length + " formats · " + st.fps + " i/s · " + durLabel();
      $("f-create").querySelector("b").textContent = c.length > 1 ? "Créer " + c.length + " compos" : "Créer la compo";
    }

    /* ---------- Format perso ---------- */
    function closePerso() { $("f-perso").hidden = true; $("f-name").value = ""; $("f-w").value = ""; $("f-h").value = ""; }
    $("f-cancel").onclick = closePerso;
    $("f-from").onclick = function () {
      api.call("SZ.formats.activeSize", []).then(function (r) {
        if (r.indexOf("SIZE:") !== 0) return api.status(r.indexOf("ERR:") === 0 ? r.slice(4) : "Aucune réponse d'After Effects.", "err");
        var p = r.slice(5).split(",");
        $("f-w").value = p[0]; $("f-h").value = p[1];
        if (!$("f-name").value) $("f-name").value = p.slice(3).join(",");
      });
    };
    $("f-ok").onclick = function () {
      var w = Math.round(+$("f-w").value), h = Math.round(+$("f-h").value);
      if (!(w >= 4 && h >= 4)) return api.status("Indique une largeur et une hauteur (en px).", "err");
      var name = $("f-name").value.trim() || (w + "×" + h);
      var f = { id: "c" + Date.now(), name: name, w: w, h: h };
      custom.unshift(f);
      api.store.set("formats.custom", custom);
      st.sel = [f.id]; save();
      closePerso(); render();
      api.status("Format « " + name + " » ajouté.", "ok");
    };

    /* ---------- Réglages ---------- */
    function seg(id, key, num) {
      $(id).querySelectorAll("button").forEach(function (b) {
        var v = num ? +b.dataset.v : b.dataset.v;
        b.classList.toggle("on", v === st[key]);
        b.onclick = function () {
          st[key] = v; save();
          $(id).querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
          summary();
        };
      });
    }
    seg("f-fps", "fps", true);
    $("f-fps").addEventListener("click", function () { showDur(); summary(); });
    seg("f-fit", "fit", false);
    var dur = $("f-dur"), base = $("f-base");
    /* Durée : en secondes, en images ou en timecode (hh:mm:ss:ii).
       En mode TC, on peut taper juste des chiffres, comme dans After Effects : « 412 » = 00:00:04:12. */
    function frames() { return Math.round(st.duration * st.fps); }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    function toTC(totalFrames) {
      var fps = Math.round(st.fps), f = totalFrames % fps, sTot = Math.floor(totalFrames / fps);
      return pad2(Math.floor(sTot / 3600)) + ":" + pad2(Math.floor(sTot / 60) % 60) + ":" + pad2(sTot % 60) + ":" + pad2(f);
    }
    function durLabel() { return (Math.round(st.duration * 100) / 100) + " s (" + frames() + " im)"; }
    function showDur() {
      if (document.activeElement === dur) return;
      dur.value = st.durUnit === "f" ? frames() : st.durUnit === "tc" ? toTC(frames()) : Math.round(st.duration * 1000) / 1000;
    }
    function parseDur(txt) {
      txt = String(txt).trim().replace(",", ".");
      var fps = Math.round(st.fps);
      if (txt.indexOf(":") >= 0 || (st.durUnit === "tc" && /^\d+$/.test(txt))) {
        var p;
        if (txt.indexOf(":") >= 0) p = txt.split(":").map(Number);
        else {   // chiffres seuls, lus par paires depuis la droite : 412 → 0:0:4:12
          var d = txt.replace(/^0+/, "") || "0", parts = [];
          while (d.length) { parts.unshift(+d.slice(-2)); d = d.slice(0, -2); }
          p = parts;
        }
        while (p.length < 4) p.unshift(0);
        var fr = ((p[0] * 3600 + p[1] * 60 + p[2]) * fps) + p[3];
        return fr > 0 ? fr / st.fps : null;
      }
      var n = parseFloat(txt);
      if (!(n > 0)) return null;
      return st.durUnit === "f" ? n / st.fps : n;
    }
    $("f-unit").querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.v === st.durUnit);
      b.onclick = function () {
        st.durUnit = b.dataset.v; save();
        $("f-unit").querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
        showDur();
      };
    });
    showDur();
    base.value = st.base;
    $("f-bgbox").style.background = "#" + st.bg;
    dur.oninput = function () { var d = parseDur(dur.value); if (d) { st.duration = Math.max(1 / st.fps, d); save(); summary(); } };
    dur.onblur = showDur;
    dur.onkeydown = function (e) {
      if (e.key === "Enter") dur.blur();
      // ↑ ↓ : une image (Maj : une seconde)
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        var step = (e.shiftKey ? Math.round(st.fps) : 1) * (e.key === "ArrowUp" ? 1 : -1);
        st.duration = Math.max(1, frames() + step) / st.fps; save(); summary();
        dur.value = st.durUnit === "f" ? frames() : st.durUnit === "tc" ? toTC(frames()) : Math.round(st.duration * 1000) / 1000;
      }
    };
    base.oninput = function () { st.base = base.value; save(); };
    $("f-bgbox").onclick = function () {
      SZPicker.popover($("f-bgbox"), st.bg, function (h) { st.bg = h; $("f-bgbox").style.background = "#" + h; save(); });
    };

    /* ---------- Actions ---------- */
    function payload() {
      return JSON.stringify({ formats: chosen().map(function (f) { return { name: f.name, w: f.w, h: f.h }; }),
        fps: st.fps, duration: st.duration, bg: st.bg, base: st.base.trim(), fit: st.fit });
    }
    function create() { api.run("SZ.formats.create", [payload()]); }
    $("f-create").onclick = create;
    $("f-adapt").onclick = function () { api.run("SZ.formats.adapt", [payload()]); };
    /* Marges de sécurité : un seul guide actif, affiché comme sélectionné. */
    var safeOn = "";
    function showSafe() { el.querySelectorAll("#f-safe button").forEach(function (x) { x.classList.toggle("on", x.dataset.z === safeOn); }); }
    el.querySelectorAll("#f-safe button").forEach(function (b) {
      b.onclick = function () {
        api.run("SZ.formats.safeZone", [b.dataset.z]).then(function (r) {
          if (r && r.indexOf("ERR:") === 0) return;
          safeOn = safeOn === b.dataset.z ? "" : b.dataset.z; showSafe();
        });
      };
    });
    api.call("SZ.formats.safeZoneState", []).then(function (r) {
      if (r && r.indexOf("SAFE:") === 0) { safeOn = r.slice(5); showSafe(); }
    });

    /* ---------- Dupliquer en profondeur ---------- */
    var dup = api.store.get("formats.dup", { source: "active", from: "", to: "", suffix: "_copie", keep: "", folder: true });
    seg2("f-dsrc", dup, "source");
    [["f-dfrom", "from"], ["f-dto", "to"], ["f-dsuf", "suffix"], ["f-dkeep", "keep"]].forEach(function (p) {
      var inp = $(p[0]); inp.value = dup[p[1]] || "";
      inp.oninput = function () { dup[p[1]] = inp.value; api.store.set("formats.dup", dup); };
    });
    $("f-dfold").checked = dup.folder !== false;
    $("f-dfold").onchange = function () { dup.folder = this.checked; api.store.set("formats.dup", dup); };
    $("f-dup").onclick = function () {
      api.status("Duplication en cours…");
      api.run("SZ.formats.deepDuplicate", [JSON.stringify(dup)]);
    };
    function seg2(id, obj, key) {
      $(id).querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("on", b.dataset.v === obj[key]);
        b.onclick = function () {
          obj[key] = b.dataset.v; api.store.set("formats.dup", obj);
          $(id).querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
        };
      });
    }

    render();
  }
});
