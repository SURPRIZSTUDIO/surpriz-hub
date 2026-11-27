/* Sélecteur de couleur Toolkit : zone saturation/luminosité, teinte, HEX + RGB + TSL visibles d'un coup.
   SZPicker.create(container, { hex, onInput(hex), onChange(hex) }) → { set(hex), get() }
   SZPicker.popover(anchor, hex, onChange(hex)) → ouvre le sélecteur dans une bulle sous l'élément. */
(function () {
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function hex2rgb(h) {
    h = String(h || "").replace(/[^0-9a-f]/gi, "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    if (h.length !== 6) return null;
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function rgb2hex(r, g, b) {
    return [r, g, b].map(function (v) { var s = Math.round(clamp(v, 0, 255)).toString(16); return s.length < 2 ? "0" + s : s; }).join("").toUpperCase();
  }
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  }
  function hsv2rgb(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /* Pipette écran : dans le navigateur → API EyeDropper ; dans After Effects → lecture système (js/screenpick.js). */
  function canDrop() {
    if (window.SZBridge && SZBridge.inAE) return !!(window.SZScreenPick && SZScreenPick.available());
    return !!window.EyeDropper;
  }

  function create(root, opt) {
    opt = opt || {};
    var hsv = [0, 0, 0];
    /* Pipette écran : l'API du navigateur existe dans After Effects mais n'y fonctionne pas (CEP) → masquée dans AE. */
    var en = window.SZI18N && SZI18N.lang === "en";
    var LB = en ? ["R", "G", "B", "H", "S", "B"] : ["R", "V", "B", "T", "S", "L"];
    root.classList.add("pk");
    root.innerHTML =
      '<div class="pk-sv"><i class="pk-knob"></i></div>' +
      '<div class="pk-row">' +
      '  <div class="pk-hue"><i class="pk-knob"></i></div>' +
      (canDrop() ? '  <button class="icon-btn pk-drop" title="Prélever une couleur à l\'écran">' + SZIcon("pipette") + '</button>' : "") +
      '</div>' +
      '<div class="pk-fields">' +
      (opt.noHex ? "" : '  <label class="pk-hex"><span>#</span><input data-k="hex" maxlength="7" spellcheck="false"></label>') +
      '  <label><span>' + LB[0] + '</span><input data-k="r" inputmode="numeric"></label>' +
      '  <label><span>' + LB[1] + '</span><input data-k="g" inputmode="numeric"></label>' +
      '  <label><span>' + LB[2] + '</span><input data-k="b" inputmode="numeric"></label>' +
      '  <label><span>' + LB[3] + '</span><input data-k="h" inputmode="numeric"></label>' +
      '  <label><span>' + LB[4] + '</span><input data-k="s" inputmode="numeric"></label>' +
      '  <label><span>' + LB[5] + '</span><input data-k="v" inputmode="numeric"></label>' +
      '</div>';

    var sv = root.querySelector(".pk-sv"), hue = root.querySelector(".pk-hue");
    var svK = sv.querySelector(".pk-knob"), hueK = hue.querySelector(".pk-knob");
    var F = {};
    root.querySelectorAll(".pk-fields input").forEach(function (i) { F[i.dataset.k] = i; });

    function hex() { var c = hsv2rgb(hsv[0], hsv[1], hsv[2]); return rgb2hex(c[0], c[1], c[2]); }

    function draw(skip) {
      var h = hex(), c = hex2rgb(h);
      sv.style.background = "linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,rgba(255,255,255,0)),hsl(" + hsv[0] + ",100%,50%)";
      svK.style.left = (hsv[1] * 100) + "%";
      svK.style.top = ((1 - hsv[2]) * 100) + "%";
      svK.style.background = "#" + h;
      hueK.style.left = (hsv[0] / 360 * 100) + "%";
      hueK.style.background = "hsl(" + hsv[0] + ",100%,50%)";
      var vals = { hex: h, r: c[0], g: c[1], b: c[2], h: Math.round(hsv[0]), s: Math.round(hsv[1] * 100), v: Math.round(hsv[2] * 100) };
      for (var k in F) if (F[k] !== skip && document.activeElement !== F[k]) F[k].value = vals[k];
    }
    function emit(final) {
      var h = hex();
      if (opt.onInput) opt.onInput(h);
      if (final && opt.onChange) opt.onChange(h);
    }

    /* Glisser à la souris, écouté sur tout le document (comme l'éditeur de courbes) :
       sur Mac, dans After Effects, la capture de pointeur ne suit pas le glisser. */
    function drag(el, onMove) {
      el.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        function mv(ev) {
          var r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          onMove(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1));
          draw(); emit(false);
        }
        function up(ev) {
          document.removeEventListener("mousemove", mv, true);
          document.removeEventListener("mouseup", up, true);
          window.removeEventListener("blur", up);
          if (ev && ev.type === "mouseup") mv(ev);
          emit(true);
        }
        mv(e);
        document.addEventListener("mousemove", mv, true);
        document.addEventListener("mouseup", up, true);
        window.addEventListener("blur", up);
      });
    }
    drag(sv, function (x, y) { hsv[1] = x; hsv[2] = 1 - y; });
    drag(hue, function (x) { hsv[0] = Math.min(359.9, x * 360); });

    function fromFields(k) {
      if (k === "hex") {
        var c = hex2rgb(F.hex.value);
        if (!c) return false;
        hsv = rgb2hsv(c[0], c[1], c[2]);
      } else if (k === "r" || k === "g" || k === "b") {
        hsv = rgb2hsv(clamp(+F.r.value || 0, 0, 255), clamp(+F.g.value || 0, 0, 255), clamp(+F.b.value || 0, 0, 255));
      } else {
        hsv = [clamp(+F.h.value || 0, 0, 359.9), clamp(+F.s.value || 0, 0, 100) / 100, clamp(+F.v.value || 0, 0, 100) / 100];
      }
      return true;
    }
    Object.keys(F).forEach(function (k) {
      var i = F[k];
      i.addEventListener("input", function () { if (k !== "hex" || /^#?[0-9a-f]{6}$/i.test(i.value)) { if (fromFields(k)) { draw(i); emit(false); } } });
      i.addEventListener("change", function () { if (fromFields(k)) emit(true); draw(); });
      i.addEventListener("focus", function () { i.select(); });
      i.addEventListener("keydown", function (e) {
        if (e.key === "Enter") i.blur();
        if (k !== "hex" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          var step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
          i.value = (+i.value || 0) + step;
          if (fromFields(k)) { draw(i); emit(true); }
        }
      });
    });

    var drop = root.querySelector(".pk-drop");
    // Dans After Effects : on prépare la pipette dès l'affichage du sélecteur (démarrage instantané au clic)
    if (drop && window.SZBridge && SZBridge.inAE && window.SZScreenPick && SZScreenPick.preload) { try { SZScreenPick.preload(); } catch (e) {} }
    var cancelPick = null;
    if (drop) drop.onclick = function () {
      if (!(window.SZBridge && SZBridge.inAE)) {
        new window.EyeDropper().open().then(function (r) { api.set(r.sRGBHex); emit(true); }, function () {});
        return;
      }
      if (cancelPick) { cancelPick(); return; }
      var before = hex(), en = window.SZI18N && SZI18N.lang === "en";
      drop.classList.add("picking");
      var tip = document.createElement("div");
      tip.className = "pk-msg";
      tip.textContent = en ? "Hover the color, then press Shift or click · Esc / right-click to cancel"
                           : "Survole la couleur puis Maj ou clic · Échap ou clic droit pour annuler";
      root.appendChild(tip);
      /* Souris au-dessus du panneau → loupe cachée et clics ignorés (pause) ; elle revient dès qu'on sort.
         Filet de sécurité : sans mouvement détecté dans le panneau pendant 0,6 s, on considère qu'on en est sorti. */
      var docEl = document.documentElement, paused = true, idle = null;
      function setPause(on) { if (on !== paused) { paused = on; SZScreenPick.pause(on); } }
      function onMove() { setPause(true); clearTimeout(idle); idle = setTimeout(function () { setPause(false); }, 600); }
      function onLeave() { clearTimeout(idle); setPause(false); }
      docEl.addEventListener("mousemove", onMove); docEl.addEventListener("mouseleave", onLeave);
      idle = setTimeout(function () { setPause(false); }, 600);
      cancelPick = SZScreenPick.start(function (h) { api.set(h); emit(false); }, function (h, msg) {
        clearTimeout(idle); docEl.removeEventListener("mousemove", onMove); docEl.removeEventListener("mouseleave", onLeave);
        cancelPick = null; drop.classList.remove("picking"); tip.remove();
        if (h) { api.set(h); emit(true); }
        else { api.set(before); emit(false); if (msg) { tip.textContent = msg; root.appendChild(tip); setTimeout(function () { tip.remove(); }, 6000); } }
      });
    };

    var api = {
      set: function (h) { var c = hex2rgb(h); if (!c) return; hsv = rgb2hsv(c[0], c[1], c[2]); draw(); },
      get: hex
    };
    api.set(opt.hex || "FFFFFF");
    return api;
  }

  /* Bulle flottante attachée à un élément. */
  var openPop = null;
  function closePop() {
    if (!openPop) return;
    openPop.el.remove();
    document.removeEventListener("mousedown", openPop.outside, true);
    openPop = null;
  }
  function popover(anchor, hex, onChange) {
    var same = openPop && openPop.anchor === anchor;
    closePop();
    if (same) return;
    var app = document.getElementById("app") || document.body;
    var el = document.createElement("div");
    el.className = "pk-pop";
    app.appendChild(el);
    create(el, { hex: hex, onInput: onChange, onChange: onChange });
    var a = anchor.getBoundingClientRect(), r = app.getBoundingClientRect();
    var w = Math.min(240, r.width - 16);
    el.style.width = w + "px";
    el.style.left = clamp(a.right - r.left - w, 8, r.width - w - 8) + "px";
    var top = a.bottom - r.top + 6;
    if (top + 250 > r.height) top = Math.max(8, a.top - r.top - 256);
    el.style.top = top + "px";
    function outside(e) { if (!el.contains(e.target) && !anchor.contains(e.target)) closePop(); }
    setTimeout(function () { document.addEventListener("mousedown", outside, true); }, 0);
    openPop = { el: el, anchor: anchor, outside: outside };
  }

  window.SZPicker = { create: create, popover: popover, close: closePop, hex2rgb: hex2rgb };
})();
