/* Module Courbes — éditeur de Bézier, presets, application aux images clés. */

/* Presets intégrés, partagés avec l'onglet Clés (escalier « Selon la courbe »). */
window.SZ_CURVE_PRESETS = [
  { name: "Linéaire",    v: [0.333, 0.333, 0.667, 0.667] },
  { name: "Doux",        v: [0.25, 0.1, 0.25, 1] },
  { name: "In Sine",     v: [0.12, 0, 0.39, 0] },
  { name: "Out Sine",    v: [0.61, 1, 0.88, 1] },
  { name: "InOut Sine",  v: [0.37, 0, 0.63, 1] },
  { name: "In Cubic",    v: [0.32, 0, 0.67, 0] },
  { name: "Out Cubic",   v: [0.33, 1, 0.68, 1] },
  { name: "InOut Cubic", v: [0.65, 0, 0.35, 1] },
  { name: "In Quint",    v: [0.64, 0, 0.78, 0] },
  { name: "Out Quint",   v: [0.22, 1, 0.36, 1] },
  { name: "InOut Quint", v: [0.83, 0, 0.17, 1] },
  { name: "In Expo",     v: [0.7, 0, 0.84, 0] },
  { name: "Out Expo",    v: [0.16, 1, 0.3, 1] },
  { name: "InOut Expo",  v: [0.87, 0, 0.13, 1] },
  { name: "In Back",     v: [0.36, 0, 0.66, -0.56] },
  { name: "Out Back",    v: [0.34, 1.56, 0.64, 1] },
  { name: "InOut Back",  v: [0.68, -0.6, 0.32, 1.6] }
];

SZ.register({
  id: "curves",
  name: "Courbes",
  order: 2,

  // Clic droit sur un preset : l'épingler l'applique directement depuis l'accès rapide.
  pin: function (btn, api) {
    var part = "auto", tag = "";   // le côté appliqué dépend des clés sélectionnées (voir host.jsx)
    if (btn.id === "cv-apply") {
      var cur = api.store.get("curves.current", [0.65, 0, 0.35, 1]);
      return { fn: "SZ.curves.apply", args: cur.concat([part]), label: "Courbe " + cur.map(function (n) { return Math.round(n * 100) / 100; }).join(",") + tag };
    }
    if (!btn.classList.contains("cv-tile")) return null;
    return { fn: "SZ.curves.apply", args: JSON.parse(btn.dataset.v).concat([part]), label: btn.querySelector("span").textContent + tag };
  },

  mount: function (el, api) {
    var BUILTIN = window.SZ_CURVE_PRESETS;

    var cur = api.store.get("curves.current", [0.65, 0, 0.35, 1]);
    var user = api.store.get("curves.user", []);

    // Géométrie de l'éditeur : carré unité de U px, marges pour les dépassements.
    var U = 150, PX = 22, PY = 34, W = U + PX * 2, H = U + PY * 2;
    var sx = function (x) { return PX + x * U; };
    var sy = function (y) { return PY + (1 - y) * U; };

    el.innerHTML =
      '<div class="section-title">Courbe</div>' +
      '<div class="curve-editor">' +
      '  <svg id="cv-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '    <rect class="cv-box" x="' + PX + '" y="' + PY + '" width="' + U + '" height="' + U + '"/>' +
      '    <line class="cv-grid" x1="' + sx(0.5) + '" y1="' + PY + '" x2="' + sx(0.5) + '" y2="' + (PY + U) + '"/>' +
      '    <line class="cv-grid" x1="' + PX + '" y1="' + sy(0.5) + '" x2="' + (PX + U) + '" y2="' + sy(0.5) + '"/>' +
      '    <line class="cv-arm" id="cv-a1"/><line class="cv-arm" id="cv-a2"/>' +
      '    <path class="cv-path" id="cv-path"/>' +
      '    <g id="cv-onion-pts"></g>' +
      '    <circle class="cv-end" cx="' + sx(0) + '" cy="' + sy(0) + '" r="3"/>' +
      '    <circle class="cv-end" cx="' + sx(1) + '" cy="' + sy(1) + '" r="3"/>' +
      '    <circle class="cv-h" id="cv-h1" r="6"/><circle class="cv-h" id="cv-h2" r="6"/>' +
      '  </svg>' +
      '  <div class="cv-prev-row"><div class="cv-preview" id="cv-track"><span class="cv-mark" id="cv-m0"></span><span class="cv-mark" id="cv-m1"></span><div id="cv-ghosts"></div><i id="cv-dot"></i></div>' +
      '    <button class="icon-btn cv-onion" id="cv-onion" title="Pelure d\'oignon : montre les positions à intervalles réguliers">' + SZIcon("onion") + '</button></div>' +
      '  <div class="cv-val-row">' +
      '    <input class="input cv-values" id="cv-values" spellcheck="false" title="Colle une valeur cubic-bezier">' +
      '    <button class="icon-btn" id="cv-read" title="Copier des clés : récupère la courbe entre les 2 clés sélectionnées">' + SZIcon("copy") + '</button>' +
      '    <button class="icon-btn" id="cv-save" title="Enregistrer la courbe actuelle dans tes presets">' + SZIcon("plus") + '</button>' +
      '  </div>' +
      '  <button class="btn primary" id="cv-apply" title="2 clés sélectionnées : courbe entière · 1 seule clé : seulement son côté">Appliquer aux clés sélectionnées</button>' +
      '  <div class="btn-row" id="cv-save-row" hidden>' +
      '    <input class="input grow" id="cv-name" placeholder="Nom du preset" spellcheck="false">' +
      '    <button class="btn primary" id="cv-save-ok">OK</button>' +
      '  </div>' +
      '</div>' +
      '<div class="section-title mt">Favoris</div>' +
      '<div class="cv-presets" id="cv-favs"></div>' +
      '<div class="section-title mt">Presets</div>' +
      '<div class="cv-presets" id="cv-presets"></div>' +
      '<p class="hint mt">Clic ou glisser sur la courbe : charger · Double-clic ou glisser sur « Appliquer » : appliquer · étoile : favori.<br>Sélectionne 2 clés pour la courbe entière, ou 1 seule clé pour ne changer que son côté (sa sortie si c\'est la première, son entrée si c\'est la dernière).</p>';

    var $ = function (id) { return el.querySelector("#" + id); };
    var svg = $("cv-svg"), h1 = $("cv-h1"), h2 = $("cv-h2");

    function fmt(n) { return String(Math.round(n * 100) / 100); }

    function draw() {
      var p = "M" + sx(0) + "," + sy(0) + " C" + sx(cur[0]) + "," + sy(cur[1]) + " " +
              sx(cur[2]) + "," + sy(cur[3]) + " " + sx(1) + "," + sy(1);
      $("cv-path").setAttribute("d", p);
      h1.setAttribute("cx", sx(cur[0])); h1.setAttribute("cy", sy(cur[1]));
      h2.setAttribute("cx", sx(cur[2])); h2.setAttribute("cy", sy(cur[3]));
      var a1 = $("cv-a1"), a2 = $("cv-a2");
      a1.setAttribute("x1", sx(0)); a1.setAttribute("y1", sy(0)); a1.setAttribute("x2", sx(cur[0])); a1.setAttribute("y2", sy(cur[1]));
      a2.setAttribute("x1", sx(1)); a2.setAttribute("y1", sy(1)); a2.setAttribute("x2", sx(cur[2])); a2.setAttribute("y2", sy(cur[3]));
      if (document.activeElement !== $("cv-values")) $("cv-values").value = cur.map(fmt).join(", ");
      var ymin = Math.min(0, cur[1], cur[3]), ymax = Math.max(1, cur[1], cur[3]);
      var top = sy(ymax) - 14, bottom = sy(ymin) + 14;
      top = Math.min(top, PY - 14 + 0); bottom = Math.max(bottom, PY + U + 14);
      svg.setAttribute("viewBox", "0 " + top + " " + W + " " + (bottom - top));
      layoutTrack();
      markActive();
    }

    function set(v, persist) {
      cur = [
        Math.min(1, Math.max(0, v[0])), Math.min(1.6, Math.max(-0.6, v[1])),
        Math.min(1, Math.max(0, v[2])), Math.min(1.6, Math.max(-0.6, v[3]))
      ];
      draw();
      if (persist !== false) api.store.set("curves.current", cur);
    }

    /* Glisser les poignées.
       Événements souris classiques suivis sur tout le document (et non pointer capture sur le cercle SVG,
       qui ne fonctionne pas dans After Effects sur Mac). Un clic près d'une poignée l'attrape aussi. */
    function svgPoint(ev) {
      var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    function startDrag(ix, e) {
      e.preventDefault(); e.stopPropagation();
      var handle = ix === 0 ? h1 : h2;
      handle.classList.add("on");
      function move(ev) {
        var sp = svgPoint(ev), v = cur.slice(0);
        v[ix] = (sp.x - PX) / U;
        v[ix + 1] = 1 - (sp.y - PY) / U;
        if (ev.shiftKey) { v[ix] = Math.round(v[ix] * 20) / 20; v[ix + 1] = Math.round(v[ix + 1] * 20) / 20; }
        set(v, false);
        ev.preventDefault();
      }
      function up() {
        handle.classList.remove("on");
        document.removeEventListener("mousemove", move, true);
        document.removeEventListener("mouseup", up, true);
        api.store.set("curves.current", cur);
      }
      document.addEventListener("mousemove", move, true);
      document.addEventListener("mouseup", up, true);
    }
    svg.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      if (e.target === h1) return startDrag(0, e);
      if (e.target === h2) return startDrag(2, e);
      // clic dans l'éditeur : on attrape la poignée la plus proche (si à moins de ~24 px)
      var sp = svgPoint(e), p1 = [PX + cur[0] * U, PY + (1 - cur[1]) * U], p2 = [PX + cur[2] * U, PY + (1 - cur[3]) * U];
      var d1 = Math.hypot(sp.x - p1[0], sp.y - p1[1]), d2 = Math.hypot(sp.x - p2[0], sp.y - p2[1]);
      var scale = svg.getScreenCTM().a || 1;
      if (Math.min(d1, d2) * scale <= 24) startDrag(d1 <= d2 ? 0 : 2, e);
    });

    // Saisie / collage de valeurs (accepte « cubic-bezier(a,b,c,d) »)
    $("cv-values").addEventListener("change", function () {
      var nums = (this.value.match(/-?\d*\.?\d+/g) || []).map(Number);
      if (nums.length === 4) set(nums);
      else { api.status("Format attendu : x1, y1, x2, y2", "err"); draw(); }
    });

    // Aperçu animé
    function bez(t) {
      // x(u) = t résolu par dichotomie, puis y(u)
      var lo = 0, hi = 1, u = t;
      for (var i = 0; i < 24; i++) {
        u = (lo + hi) / 2;
        var x = 3 * (1 - u) * (1 - u) * u * cur[0] + 3 * (1 - u) * u * u * cur[2] + u * u * u;
        if (x < t) lo = u; else hi = u;
      }
      return 3 * (1 - u) * (1 - u) * u * cur[1] + 3 * (1 - u) * u * u * cur[3] + u * u * u;
    }
    /* Aperçu : la piste s'adapte aux dépassements (Back…) pour que la pastille reste dedans.
       Les repères marquent le départ et l'arrivée ; la pelure d'oignon montre l'espacement. */
    var dot = $("cv-dot"), t0 = performance.now(), raf, lo = 0, hi = 1;
    var onion = api.store.get("curves.onion", false), STEPS = 13;
    function pos(y) { return (y - lo) / (hi - lo); }
    function place(elm, y) { var f = pos(y); elm.style.left = "calc(" + (f * 100) + "% - " + (f * 12) + "px)"; }
    function layoutTrack() {
      if (!$("cv-track")) return;
      lo = 0; hi = 1;
      for (var i = 0; i <= 60; i++) { var y = bez(i / 60); if (y < lo) lo = y; if (y > hi) hi = y; }
      var m0 = $("cv-m0"), m1 = $("cv-m1");
      m0.style.left = "calc(" + (pos(0) * 100) + "% - " + (pos(0) * 12 - 6) + "px)";
      m1.style.left = "calc(" + (pos(1) * 100) + "% - " + (pos(1) * 12 - 6) + "px)";
      // Repères utiles seulement si la courbe dépasse (Back…) : sinon le départ et l'arrivée sont les bords de la piste.
      m0.hidden = m1.hidden = !(lo < -0.001 || hi > 1.001);
      var g = $("cv-ghosts"), pts = $("cv-onion-pts");
      g.innerHTML = ""; pts.innerHTML = "";
      $("cv-onion").classList.toggle("on", onion);
      if (!onion) return;
      for (var k = 0; k < STEPS; k++) {
        var t = k / (STEPS - 1), yv = bez(t);
        var gh = document.createElement("span");
        gh.className = "cv-ghost";
        gh.style.opacity = (0.18 + 0.5 * t).toFixed(2);
        place(gh, yv);
        g.appendChild(gh);
        var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", sx(t)); c.setAttribute("cy", sy(yv)); c.setAttribute("r", 2.6);
        c.setAttribute("class", "cv-opt");
        pts.appendChild(c);
      }
    }
    $("cv-onion").onclick = function () { onion = !onion; api.store.set("curves.onion", onion); layoutTrack(); };
    function tick(now) {
      if (!document.body.contains(dot)) return cancelAnimationFrame(raf);
      var cycle = 1700, run = 1100, t = ((now - t0) % cycle) / run;
      place(dot, t >= 1 ? 1 : bez(t));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // Presets
    function mini(v) {
      var s = 30, m = 6, f = function (x) { return m + x * s; }, g = function (y) { return m + (1 - y) * s; };
      return '<svg viewBox="0 0 42 42" width="42" height="42"><rect x="6" y="6" width="30" height="30" class="mini-box"/>' +
        '<path class="mini-path" d="M' + f(0) + ',' + g(0) + ' C' + f(v[0]) + ',' + g(v[1]) + ' ' + f(v[2]) + ',' + g(v[3]) +
        ' ' + f(1) + ',' + g(1) + '"/></svg>';
    }
    function same(a, b) {
      for (var i = 0; i < 4; i++) if (Math.abs(a[i] - b[i]) > 0.005) return false;
      return true;
    }
    function markActive() {
      var tiles = el.querySelectorAll(".cv-tile");
      for (var i = 0; i < tiles.length; i++) {
        tiles[i].classList.toggle("on", same(JSON.parse(tiles[i].dataset.v), cur));
      }
    }
    var favs = api.store.get("curves.favs", []);   // clés « x1,y1,x2,y2 »
    function keyOf(v) { return v.map(function (n) { return Math.round(n * 1000) / 1000; }).join(","); }
    function isFav(v) { return favs.indexOf(keyOf(v)) >= 0; }
    function toggleFav(v) {
      var k = keyOf(v), i = favs.indexOf(k);
      if (i >= 0) favs.splice(i, 1); else favs.push(k);
      api.store.set("curves.favs", favs);
      renderPresets();
    }

    function tile(p, isUser, userIdx) {
      var b = document.createElement("button");
      var fav = isFav(p.v);
      b.className = "cv-tile" + (isUser ? " user" : "");
      b.draggable = true;
      b.dataset.v = JSON.stringify(p.v);
      b.title = p.name + "  (" + p.v.join(", ") + ")";
      b.innerHTML = mini(p.v) + "<span>" + p.name.replace(/</g, "&lt;") + "</span>" +
        '<i class="star' + (fav ? " on" : "") + '" title="' + (fav ? "Retirer des favoris" : "Ajouter aux favoris") + '">' + SZIcon("star") + "</i>" +
        (isUser ? '<em class="del-btn" title="Supprimer ce preset">' + SZDel.html() + '</em>' : "");
      b.onclick = function (e) {
        if (e.target.classList.contains("star")) return toggleFav(p.v);
        if (e.target.tagName === "EM") {
          if (!SZDel.confirm(e.target)) return;
          var fi = favs.indexOf(keyOf(user[userIdx].v));
          if (fi >= 0) { favs.splice(fi, 1); api.store.set("curves.favs", favs); }
          user.splice(userIdx, 1);
          api.store.set("curves.user", user);
          return renderPresets();
        }
        set(p.v);
      };
      b.ondblclick = function (e) {
        if (e.target.classList.contains("star") || e.target.tagName === "EM") return;
        set(p.v); apply();
      };
      return b;
    }

    function renderPresets() {
      var all = user.map(function (p, i) { return { p: p, user: true, i: i }; })
        .concat(BUILTIN.map(function (p) { return { p: p, user: false }; }));
      var favBox = $("cv-favs"), box = $("cv-presets"), nf = 0;
      favBox.innerHTML = ""; box.innerHTML = "";
      all.forEach(function (it) {
        if (isFav(it.p.v)) { favBox.appendChild(tile(it.p, it.user, it.i)); nf++; }
        box.appendChild(tile(it.p, it.user, it.i));
      });
      if (!nf) favBox.innerHTML = '<p class="sw-empty">Clique sur l\'étoile d\'un preset pour l\'épingler ici.</p>';
      markActive();
    }

    var part = "auto";   // 2 clés : courbe entière · 1 clé : seulement son côté
    function apply() { api.run("SZ.curves.apply", cur.concat([part])); }

    /* Glisser un preset sur l'éditeur pour le charger (ou sur « Appliquer » pour l'appliquer). */
    el.addEventListener("dragstart", function (e) {
      var t = e.target.closest && e.target.closest(".cv-tile");
      if (!t) return;
      e.dataTransfer.setData("text/plain", t.dataset.v);
      e.dataTransfer.effectAllowed = "copy";
    });
    [["cv-svg", false], ["cv-apply", true]].forEach(function (d) {
      var zone = $(d[0]);
      zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("drop"); });
      zone.addEventListener("dragleave", function () { zone.classList.remove("drop"); });
      zone.addEventListener("drop", function (e) {
        e.preventDefault(); zone.classList.remove("drop");
        try { set(JSON.parse(e.dataTransfer.getData("text/plain"))); if (d[1]) apply(); } catch (x) {}
      });
    });
    $("cv-apply").onclick = apply;

    $("cv-read").onclick = function () {
      api.call("SZ.curves.read", []).then(function (r) {
        if (r.indexOf("BEZ:") === 0) {
          set(r.slice(4).split(",").map(Number));
          api.status("Courbe copiée. Sélectionne les clés cibles puis Appliquer.", "ok");
        } else api.status(r.indexOf("ERR:") === 0 ? r.slice(4) : (r || "Aucune réponse d'After Effects."), "err");
      });
    };

    $("cv-save").onclick = function () {
      var row = $("cv-save-row");
      row.hidden = !row.hidden;
      if (!row.hidden) $("cv-name").focus();
    };
    function save() {
      var name = $("cv-name").value.trim();
      if (!name) return;
      user.unshift({ name: name, v: cur.slice(0) });
      api.store.set("curves.user", user);
      $("cv-name").value = "";
      $("cv-save-row").hidden = true;
      renderPresets();
      api.status("Preset « " + name + " » enregistré.", "ok");
    }
    $("cv-save-ok").onclick = save;
    $("cv-name").onkeydown = function (e) { if (e.key === "Enter") save(); if (e.key === "Escape") $("cv-save").click(); };

    renderPresets();
    draw();
  }
});
