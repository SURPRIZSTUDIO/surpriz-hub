/* Module Calques — interface. */
SZ.register({
  id: "layers",
  name: "Calques",
  order: 6,

  mount: function (el, api) {
    var st = api.store.get("layers.prefs", { nullMode: "group", parent: true, textMode: "letters", keep: true });
    if (!st.textAs) st.textAs = "shapes";
    if (st.chain == null) st.chain = false;
    if (!st.chainFrames) st.chainFrames = 2;

    function seg(name, options) {
      return '<div class="seg" data-name="' + name + '">' + options.map(function (o) {
        return '<button data-v="' + o[0] + '"' + (o[0] === st[name] ? ' class="on"' : "") + ">" + o[1] + "</button>";
      }).join("") + "</div>";
    }
    function sw(name, label) {
      return '<label class="switch"><input type="checkbox" data-name="' + name + '"' + (st[name] ? " checked" : "") +
        '><span class="track"></span>' + label + "</label>";
    }

    el.innerHTML =
      '<div class="section-title">Null de contrôle</div>' +
      '<div class="form">' +
      '  <div class="frow"><label>Créer</label>' + seg("nullMode", [["group", "Un pour tous"], ["each", "Un par calque"]]) + '</div>' +
      '  ' + sw("parent", "Parenter les calques au null") +
      '  <button class="btn primary" id="l-null">Créer le null</button>' +
      '</div>' +

      '<div class="section-title mt">Découper</div>' +
      '<div class="form">' +
      '  <div class="frow"><label>Par</label>' + seg("textMode", [["letters", "Lettres"], ["words", "Mots"], ["lines", "Lignes"]]) + '</div>' +
      '  <div class="frow"><label>Texte</label>' + seg("textAs", [["shapes", "En formes"], ["text", "Éditable"]]) + '</div>' +
      '  ' + sw("keep", "Garder l'original (masqué)") +
      '  <div class="frow">' + sw("chain", "Décaler de") +
      '    <div class="num"><button data-cf="-1">−</button><input class="input" id="l-cf" type="number" min="1" step="1"><button data-cf="1">+</button></div><span class="unit">im.</span></div>' +
      '  <button class="btn primary" id="l-split">Découper la sélection</button>' +
      '</div>' +
      '<p class="hint left mt">Texte <b>En formes</b> : converti en formes puis découpé, en un clic. <b>Éditable</b> : chaque morceau reste un texte modifiable (texte de point uniquement).<br>Calque de forme : découpé par lettre (un groupe = un calque), mot ou ligne.<br>Chaque morceau garde sa place, avec son ancrage centré.<br><b>Décaler de</b> : chaque morceau démarre ce nombre d\x27images après le précédent, prêt pour une animation lettre par lettre.</p>';

    function save() { api.store.set("layers.prefs", st); }

    el.querySelectorAll(".seg").forEach(function (s) {
      s.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          s.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
          st[s.dataset.name] = b.dataset.v;
          save();
        };
      });
    });
    el.querySelectorAll(".switch input").forEach(function (c) {
      c.onchange = function () { st[c.dataset.name] = c.checked; save(); };
    });

    var cf = el.querySelector("#l-cf");
    cf.value = st.chainFrames;
    cf.onchange = function () { st.chainFrames = Math.max(1, Math.round(+cf.value || 1)); cf.value = st.chainFrames; save(); };
    el.querySelectorAll("[data-cf]").forEach(function (b) {
      b.onclick = function () { cf.value = Math.max(1, (+cf.value || 1) + (+b.dataset.cf)); cf.onchange(); };
    });
    el.querySelector("#l-null").onclick = function () { api.run("SZ.layers.makeNull", [st.nullMode, st.parent]); };
    el.querySelector("#l-split").onclick = function () {
      api.status("Découpage en cours…");
      var curve = st.chainCurve ? api.store.get("curves.current", null) : null;
      api.run("SZ.layers.split", [st.textMode, st.keep, st.textAs, st.chain ? st.chainFrames : 0, curve]);
    };
  }
});
