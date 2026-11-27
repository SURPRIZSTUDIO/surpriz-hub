/* Module Point d'ancrage — interface. */
SZ.register({
  id: "anchor",
  name: "Ancrage",
  order: 1,

  // Épingler un point fige le mode (chaque calque / toute la sélection) et l'option contour choisis à ce moment-là.
  pin: function (btn, api) {
    if (!btn.classList.contains("anchor-pt")) return null;
    var p = JSON.parse(btn.dataset.p), group = api.store.get("anchor.mode", "each") === "group", ext = api.store.get("anchor.extents", false);
    return { fn: group ? "SZ.anchor.setGroup" : "SZ.anchor.set", args: [p[0], p[1], ext],
      label: btn.title + (group ? " · sélection" : "") + (ext ? " · contour" : "") };
  },

  mount: function (el, api) {
    var points = [
      [0, 0, "Haut gauche"],   [0.5, 0, "Haut"],     [1, 0, "Haut droite"],
      [0, 0.5, "Gauche"],      [0.5, 0.5, "Centre"], [1, 0.5, "Droite"],
      [0, 1, "Bas gauche"],    [0.5, 1, "Bas"],      [1, 1, "Bas droite"]
    ];

    el.innerHTML =
      '<div class="section-title">Point d\'ancrage</div>' +
      '<div class="anchor-wrap">' +
      '  <div class="anchor-grid" id="anc-grid"></div>' +
      '  <div class="anchor-opts">' +
      '    <div class="seg" id="anc-mode"><button data-v="each">Chaque calque</button><button data-v="group">Toute la sélection</button></div>' +
      '    <label class="switch"><input type="checkbox" id="anc-ext"><span class="track"></span>Inclure le contour</label>' +
      '  </div>' +
      '  <p class="hint">Le calque ne bouge pas : la position est compensée.<br>« Toute la sélection » : un ancrage commun, pour tourner un groupe autour de son centre.</p>' +
      '</div>';

    var mode = api.store.get("anchor.mode", "each");
    el.querySelectorAll("#anc-mode button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.v === mode);
      b.onclick = function () {
        mode = b.dataset.v; api.store.set("anchor.mode", mode);
        el.querySelectorAll("#anc-mode button").forEach(function (x) { x.classList.toggle("on", x === b); });
      };
    });
    var ext = el.querySelector("#anc-ext");
    ext.checked = api.store.get("anchor.extents", false);
    ext.onchange = function () { api.store.set("anchor.extents", ext.checked); };

    var grid = el.querySelector("#anc-grid");
    points.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "anchor-pt" + (p[0] === 0.5 && p[1] === 0.5 ? " center" : "");
      b.title = p[2];
      b.dataset.p = JSON.stringify([p[0], p[1]]);
      b.innerHTML = "<i></i>";
      b.onclick = function () { api.run(mode === "group" ? "SZ.anchor.setGroup" : "SZ.anchor.set", [p[0], p[1], ext.checked]); };
      grid.appendChild(b);
    });
  }
});
