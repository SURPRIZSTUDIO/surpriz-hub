/* Module Clés — interface. */
SZ.register({
  id: "keys",
  name: "Clés",
  order: 3,

  mount: function (el, api) {
    var st = api.store.get("keys.prefs", { frames: 2, order: "sel", target: "layers", pct: 50 });

    function seg(name, options, value) {
      return '<div class="seg" data-name="' + name + '">' + options.map(function (o) {
        return '<button data-v="' + o[0] + '"' + (o[0] === value ? ' class="on"' : "") + ">" + o[1] + "</button>";
      }).join("") + "</div>";
    }

    el.innerHTML =
      '<div class="section-title">Valeur</div>' +
      '<div class="btn-grid">' +
      '  <button class="btn tool" id="k-copy" title="Mémorise la valeur des clés sélectionnées"><b>' + SZIcon("copy") + '</b>Copier la valeur</button>' +
      '  <button class="btn tool" id="k-pv" title="Pose la valeur mémorisée sur les clés sélectionnées, sans toucher à leur timing ni à leur courbe"><b>' + SZIcon("paste") + '</b>Coller la valeur</button>' +
      '</div>' +
      '<p class="hint left" id="k-clip" hidden></p>' +

      '<div class="section-title mt">Temps</div>' +
      '<div class="btn-grid">' +
      '  <button class="btn tool" id="k-rev" title="Renverse l\'ordre des clés sélectionnées"><b>' + SZIcon("reverse") + '</b>Inverser</button>' +
      '  <button class="btn tool" id="k-pp" title="Ajoute le chemin retour après la dernière clé"><b>' + SZIcon("mirror") + '</b>Miroir</button>' +
      '  <button class="btn tool" id="k-af" title="Aligne la première clé de chaque propriété sur la plus précoce"><b>' + SZIcon("alignStart") + '</b>Aligner début</button>' +
      '  <button class="btn tool" id="k-al" title="Aligne la dernière clé de chaque propriété sur la plus tardive"><b>' + SZIcon("alignEnd") + '</b>Aligner fin</button>' +
      '  <button class="btn tool" id="k-clone" title="Duplique les clés sélectionnées à l\'indicateur de temps"><b>' + SZIcon("plus") + '</b>Cloner ici</button>' +
      '  <button class="btn tool" id="k-cti" title="Déplace les clés sélectionnées sur l\'indicateur de temps"><b>' + SZIcon("playhead") + '</b>Sur l\'indicateur</button>' +
      '  <button class="btn tool" id="k-rval" title="Inverse les valeurs des clés sélectionnées, sans toucher à leur timing ni à leurs courbes"><b>' + SZIcon("flipValues") + '</b>Inverser valeurs</button>' +
      '  <button class="btn tool" id="k-snap" title="Recale sur une image entière les clés qui tombent entre deux images"><b>' + SZIcon("snap") + '</b>Arrondir à l\'image</button>' +
      '</div>' +

      '<div class="section-title mt">Escalier</div>' +
      '<div class="form">' +
      '  <div class="frow"><label>Décalage</label><div class="num"><button data-d="-1">−</button><input class="input" id="k-frames" type="number" min="0" step="1"><button data-d="1">+</button></div><span class="unit">images</span></div>' +
      '  <div class="frow"><label>Ordre</label>' + seg("order", [["sel", "↓ Haut"], ["rev", "↑ Bas"], ["rand", "Aléatoire"]], st.order) + '</div>' +
      '  <div class="frow"><label>Décaler</label>' + seg("target", [["layers", "Calques"], ["keys", "Clés sélect."]], st.target) + '</div>' +
      '  <div class="frow"><label>Rythme</label>' + seg("spread", [["linear", "Régulier"], ["curve", "Selon la courbe"]], st.spread || "linear") + '</div>' +
      '  <div class="k-curve" id="k-curve" hidden>' +
      '    <svg class="k-cv-svg" id="k-cv-svg" viewBox="0 0 100 100" title="Glisse les poignées pour modifier la courbe du décalage"></svg>' +
      '    <div class="k-cv-presets" id="k-cv-presets"></div>' +
      '  </div>' +
      '  <button class="btn primary" id="k-stagger">Appliquer l\'escalier</button>' +
      '</div>' +

      '<div class="section-title mt">Étirer le timing</div>' +
      '<div class="form">' +
      '  <div class="chips" id="k-chips"><button data-p="50">50 %</button><button data-p="75">75 %</button><button data-p="150">150 %</button><button data-p="200">200 %</button></div>' +
      '  <div class="frow"><label>Durée</label><div class="num"><input class="input" id="k-pct" type="number" min="1" step="5"></div><span class="unit">%</span>' +
      '  <button class="btn" id="k-stretch">Étirer</button></div>' +
      '</div>';

    var $ = function (id) { return el.querySelector("#" + id); };
    function save() { api.store.set("keys.prefs", st); }

    $("k-rev").onclick = function () { api.run("SZ.keys.reverse", []); };
    $("k-pp").onclick = function () { api.run("SZ.keys.pingpong", []); };
    $("k-copy").onclick = function () {
      api.run("SZ.keys.copy", []).then(function (r) {
        if (r.indexOf("OK:") !== 0) return;
        $("k-clip").hidden = false; $("k-clip").textContent = "En mémoire : " + r.slice(3).split("\n")[0];
        // La courbe des clés copiées est aussi envoyée dans l'onglet Courbes.
        api.call("SZ.curves.read", []).then(function (c) {
          if (c.indexOf("BEZ:") !== 0) return;
          api.store.set("curves.current", c.slice(4).split(",").map(Number));
          $("k-clip").textContent += " · courbe dispo dans Courbes";
        });
      });
    };
    $("k-pv").onclick = function () { api.run("SZ.keys.pasteValue", []); };
    $("k-af").onclick = function () { api.run("SZ.keys.alignFirst", []); };
    $("k-al").onclick = function () { api.run("SZ.keys.alignLast", []); };
    $("k-clone").onclick = function () { api.run("SZ.keys.clone", []); };
    $("k-cti").onclick = function () { api.run("SZ.keys.alignToCTI", []); };

    var frames = $("k-frames");
    frames.value = st.frames;
    frames.onchange = function () { st.frames = Math.max(0, Math.round(+frames.value || 0)); frames.value = st.frames; save(); };
    el.querySelectorAll(".num button[data-d]").forEach(function (b) {
      b.onclick = function () { frames.value = Math.max(0, (+frames.value || 0) + (+b.dataset.d)); frames.onchange(); };
    });

    el.querySelectorAll(".seg").forEach(function (s) {
      s.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          s.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          st[s.dataset.name] = b.dataset.v;
          save();
        };
      });
    });

    /* « Selon la courbe » : mini éditeur + presets (intégrés, tes presets, favoris en premier).
       La courbe de l'escalier est indépendante de celle de l'onglet Courbes. */
    var kc = api.store.get("keys.spreadCurve", null) || api.store.get("curves.current", [0.65, 0, 0.35, 1]);
    function presetList() {
      var builtin = window.SZ_CURVE_PRESETS || [{ name: "InOut Cubic", v: [0.65, 0, 0.35, 1] }];
      var user = api.store.get("curves.user", []), favs = api.store.get("curves.favs", []);
      var all = user.concat(builtin), key = function (v) { return v.map(function (n) { return Math.round(n * 1000) / 1000; }).join(","); };
      var fav = all.filter(function (p) { return favs.indexOf(key(p.v)) >= 0; });
      return fav.concat(all.filter(function (p) { return favs.indexOf(key(p.v)) < 0; }));
    }
    function same(a, b) { for (var i = 0; i < 4; i++) if (Math.abs(a[i] - b[i]) > 0.005) return false; return true; }
    function miniSvg(v) {
      var f = function (x) { return 5 + x * 20; }, g = function (y) { return 25 - y * 20; };
      return '<svg viewBox="0 0 30 30"><path d="M' + f(0) + ',' + g(0) + ' C' + f(v[0]) + ',' + g(v[1]) + ' ' + f(v[2]) + ',' + g(v[3]) + ' ' + f(1) + ',' + g(1) + '"/></svg>';
    }
    var lo = 0, hi = 1, P = 12, S = 100 - 2 * P;
    function ry() { lo = Math.min(0, kc[1], kc[3]); hi = Math.max(1, kc[1], kc[3]); }
    function X(x) { return P + x * S; }
    function Y(y) { return P + (hi - y) / (hi - lo) * S; }
    function drawCurve() {
      var svg = $("k-cv-svg"); ry();
      svg.innerHTML =
        '<rect class="k-cv-box" x="' + X(0) + '" y="' + Y(1) + '" width="' + S + '" height="' + (Y(0) - Y(1)) + '"/>' +
        '<line class="k-cv-arm" x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(kc[0]) + '" y2="' + Y(kc[1]) + '"/>' +
        '<line class="k-cv-arm" x1="' + X(1) + '" y1="' + Y(1) + '" x2="' + X(kc[2]) + '" y2="' + Y(kc[3]) + '"/>' +
        '<path class="k-cv-path" d="M' + X(0) + ',' + Y(0) + ' C' + X(kc[0]) + ',' + Y(kc[1]) + ' ' + X(kc[2]) + ',' + Y(kc[3]) + ' ' + X(1) + ',' + Y(1) + '"/>' +
        '<circle class="k-cv-h" data-h="0" cx="' + X(kc[0]) + '" cy="' + Y(kc[1]) + '" r="5"/>' +
        '<circle class="k-cv-h" data-h="1" cx="' + X(kc[2]) + '" cy="' + Y(kc[3]) + '" r="5"/>';
      $("k-cv-presets").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", same(JSON.parse(b.dataset.v), kc)); });
    }
    function renderPresets() {
      $("k-cv-presets").innerHTML = presetList().map(function (p) {
        return '<button data-v="' + JSON.stringify(p.v) + '" title="' + String(p.name).replace(/"/g, "&quot;") + '">' + miniSvg(p.v) + "</button>";
      }).join("");
      $("k-cv-presets").querySelectorAll("button").forEach(function (b) {
        b.onclick = function () { kc = JSON.parse(b.dataset.v); api.store.set("keys.spreadCurve", kc); drawCurve(); };
      });
    }
    (function dragHandles() {
      var svg = $("k-cv-svg");
      function toVal(e) {
        var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 100, py = (e.clientY - r.top) / r.height * 100;
        var x = Math.min(1, Math.max(0, (px - P) / S)), y = hi - (py - P) / S * (hi - lo);
        return [Math.round(x * 100) / 100, Math.round(Math.max(-1, Math.min(2, y)) * 100) / 100];
      }
      // Souris suivie sur tout le document (le pointer capture ne marche pas dans After Effects sur Mac)
      svg.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        var t = e.target.closest ? e.target.closest(".k-cv-h") : null, h;
        if (t) h = +t.getAttribute("data-h");
        else { var v = toVal(e), d0 = Math.abs(v[0] - kc[0]) + Math.abs(v[1] - kc[1]), d1 = Math.abs(v[0] - kc[2]) + Math.abs(v[1] - kc[3]); h = d0 <= d1 ? 0 : 1; }
        function move(ev) { var v2 = toVal(ev); kc = kc.slice(0); kc[h * 2] = v2[0]; kc[h * 2 + 1] = v2[1]; drawCurve(); ev.preventDefault(); }
        function up() {
          document.removeEventListener("mousemove", move, true); document.removeEventListener("mouseup", up, true);
          api.store.set("keys.spreadCurve", kc);
        }
        document.addEventListener("mousemove", move, true); document.addEventListener("mouseup", up, true);
      });
    })();
    function spreadHint() {
      var on = st.spread === "curve";
      $("k-curve").hidden = !on;
      if (on) { renderPresets(); drawCurve(); }
    }
    el.querySelectorAll('.seg[data-name="spread"] button').forEach(function (b) { b.addEventListener("click", spreadHint); });
    spreadHint();
    $("k-stagger").onclick = function () {
      var curve = st.spread === "curve" ? kc : null;
      api.run("SZ.keys.stagger", [st.frames, st.order, st.target, curve]);
    };
    $("k-rval").onclick = function () { api.run("SZ.keys.reverseValues", []); };
    $("k-snap").onclick = function () { api.run("SZ.keys.snapFrames", []); };

    var pct = $("k-pct");
    pct.value = st.pct;
    pct.onchange = function () { st.pct = Math.max(1, +pct.value || 100); pct.value = st.pct; save(); };
    $("k-chips").querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { pct.value = b.dataset.p; pct.onchange(); api.run("SZ.keys.stretch", [st.pct]); };
    });
    $("k-stretch").onclick = function () { api.run("SZ.keys.stretch", [st.pct]); };
  }
});
