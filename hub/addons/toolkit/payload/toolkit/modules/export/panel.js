/* Module Export — rendu en un clic, noms automatiques, conversion MP4 / MOV (ProRes) / GIF via ffmpeg. */
var SZ_EXPORT = {
  id: "export",
  name: "Export",
  order: 8,

  mount: function (el, api) {
    var DEF = {
      source: "active", range: "work", pattern: "[comp]_[date]",
      destMode: "project", destRel: "./Exports", destCustom: "",
      compress: true, format: "mp4", qualities: ["med"], width: 0, gifFps: 15, deleteSrc: true, prores: "422",
      om: "", rs: "", mode: "now", ffmpeg: ""
    };
    var st = api.store.get("export.prefs", {});
    for (var k in DEF) if (st[k] === undefined) st[k] = DEF[k];
    var lastFile = null;
    var node = SZBridge.node;

    var Q = { low: ["Basse", 30], med: ["Moyenne", 24], high: ["Haute", 18] };
    // QuickTime : Apple ProRes (profil ffmpeg prores_ks, format de pixels)
    var PRORES = { "422": ["ProRes 422", 2, "yuv422p10le"], hq: ["422 HQ", 3, "yuv422p10le"], "4444": ["4444 + alpha", 4, "yuva444p10le"] };
    var EN = window.SZI18N && SZI18N.lang === "en";
    var TOKENS = EN ? [["[comp]", "Compo"], ["[project]", "Projet"], ["[date]", "Date"], ["[time]", "Heure"], ["[size]", "Taille"], ["[fps]", "Fps"]]
                    : [["[comp]", "Compo"], ["[projet]", "Projet"], ["[date]", "Date"], ["[heure]", "Heure"], ["[taille]", "Taille"], ["[fps]", "Fps"]];

    function seg(name, opts) {
      return '<div class="seg" data-name="' + name + '">' + opts.map(function (o) {
        return '<button data-v="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }
    function sw(id, label) {
      return '<label class="switch"><input type="checkbox" id="' + id + '"><span class="track"></span>' + label + "</label>";
    }

    /* ---------- Profils d'export ---------- */
    var PKEYS = ["range", "pattern", "destMode", "destRel", "destCustom", "compress", "format", "qualities", "width", "gifFps", "deleteSrc", "prores", "om", "rs", "mode"];
    var profiles = api.store.get("export.profiles", null);
    if (!profiles) {
      profiles = [
        { name: "Réseaux sociaux · MP4 léger", s: { compress: true, format: "mp4", qualities: ["med"], width: 1080, deleteSrc: true, mode: "now" } },
        { name: "Client · haute qualité", s: { compress: true, format: "mp4", qualities: ["high"], width: 0, deleteSrc: false, mode: "now" } },
        { name: "GIF léger (Slack, mail)", s: { compress: true, format: "gif", gifFps: 15, width: 480, deleteSrc: true, mode: "now" } }
      ];
      api.store.set("export.profiles", profiles);
    }
    var curProfile = api.store.get("export.profile", "");

    el.innerHTML =
      '<div class="x-prof">' +
      '  <select class="input grow" id="x-prof" title="Profil d\'export"></select>' +
      '  <button class="icon-btn" id="x-prof-save" title="Enregistrer les réglages actuels comme profil">' + SZIcon("plus") + '</button>' +
      '  <button class="icon-btn del-btn" id="x-prof-del" title="Supprimer ce profil">' + SZDel.html() + '</button>' +
      '</div>' +
      '<div class="btn-row x-prof-new" id="x-prof-new" hidden><input class="input grow f-text" id="x-prof-name" placeholder="Nom du profil" spellcheck="false"><button class="btn primary" id="x-prof-ok">OK</button></div>' +
      '<button class="btn primary x-go" id="x-go"><b>Exporter</b><small id="x-sum"></small></button>' +
      '<div class="x-progress" id="x-prog" hidden><i id="x-bar"></i></div>' +

      '<div class="section-title mt">Quoi</div>' +
      '<div class="form">' +
      '  <div class="frow"><label>Source</label>' + seg("source", [["active", "Compo active"], ["selection", "Sélection Projet"]]) + '</div>' +
      '  <div class="frow"><label>Durée</label>' + seg("range", [["work", "Zone de travail"], ["full", "Compo entière"]]) + '</div>' +
      '</div>' +

      '<div class="section-title mt">Nom du fichier</div>' +
      '<div class="form">' +
      '  <input class="input" id="x-pattern" spellcheck="false">' +
      '  <div class="chips" id="x-tokens">' + TOKENS.map(function (t) { return '<button data-t="' + t[0] + '">+ ' + t[1] + "</button>"; }).join("") + '</div>' +
      '  <p class="hint left" id="x-preview"></p>' +
      '</div>' +

      '<div class="c-head mt"><span class="section-title">Destination</span>' +
      '  <button class="icon-btn" id="x-open" title="Ouvrir le dossier d\'export">' +
      '    ' + SZIcon("folder") + '</button></div>' +
      '<div class="form">' +
      '  ' + seg("destMode", [["project", "Près du projet"], ["custom", "Dossier fixe"], ["ask", "Demander"]]) +
      '  <input class="input" id="x-rel" spellcheck="false" title="Chemin relatif au fichier .aep (../ pour remonter)">' +
      '  <div class="btn-row" id="x-custom-row"><input class="input grow" id="x-custom" spellcheck="false" placeholder="Aucun dossier choisi"><button class="btn" id="x-pick">Choisir…</button></div>' +
      '</div>' +

      '<div class="c-head mt"><span class="section-title">Compression</span>' + sw("x-compress", "") + '</div>' +
      '<div class="form" id="x-comp-box">' +
      '  <div class="frow"><label>Format</label>' + seg("format", [["mp4", "MP4"], ["mov", "MOV"], ["gif", "GIF"]]) + '</div>' +
      '  <div class="frow" id="x-q-row"><label>Qualité</label><div class="seg multi" id="x-q">' +
           Object.keys(Q).map(function (q) { return '<button data-q="' + q + '">' + Q[q][0] + "</button>"; }).join("") + '</div></div>' +
      '  <div class="frow" id="x-pr-row"><label>Codec</label>' + seg("prores", ["422", "hq", "4444"].map(function (k) { return [k, PRORES[k][0]]; })) + '</div>' +
      '  <div class="frow" id="x-fps-row"><label>Images/s</label><div class="num"><input class="input" id="x-fps" type="number" min="1" max="50"></div></div>' +
      '  <div class="frow"><label>Taille</label><div class="seg" id="x-width" title="Largeur maximale du fichier compressé (jamais agrandi)">' +
           [[0, "Origine"], [1920, "1920"], [1080, "1080"], [720, "720"], [480, "480"]].map(function (w) { return '<button data-w="' + w[0] + '">' + w[1] + "</button>"; }).join("") + '</div></div>' +
      '  ' + sw("x-keep", "Garder aussi le fichier haute qualité") +
      '  <p class="hint left" id="x-ff"></p>' +
      '</div>' +

      '<details class="x-adv mt"><summary class="section-title">Rendu avancé</summary>' +
      '  <div class="form">' +
      '    <div class="frow"><label>Mode</label>' + seg("mode", [["now", "Rendre ici"], ["ame", "Media Encoder"]]) + '</div>' +
      '    <div class="field"><label>Module de sortie</label><div class="btn-row"><select class="input grow" id="x-om"></select>' +
      '      <button class="icon-btn" id="x-reload" title="Recharger les listes">' + SZIcon("refresh") + '</button></div></div>' +
      '    <div class="field"><label>Paramètres de rendu</label><select class="input" id="x-rs"></select></div>' +
      '  </div>' +
      '</details>' +

      '<button class="btn x-files mt" id="x-files">Compresser des fichiers existants…</button>';

    var $ = function (id) { return el.querySelector("#" + id); };
    function save() { api.store.set("export.prefs", st); }

    /* ---------- Segments / interrupteurs ---------- */
    el.querySelectorAll(".seg[data-name]").forEach(function (s) {
      var key = s.dataset.name;
      s.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("on", b.dataset.v === st[key]);
        b.onclick = function () {
          st[key] = b.dataset.v; save();
          s.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
          refresh();
        };
      });
    });
    el.querySelectorAll("#x-q button").forEach(function (b) {
      b.onclick = function () {
        var q = b.dataset.q, i = st.qualities.indexOf(q);
        if (i >= 0) { if (st.qualities.length > 1) st.qualities.splice(i, 1); } else st.qualities.push(q);
        save(); refresh();
      };
    });
    [["x-compress", "compress"]].forEach(function (p) {
      var c = $(p[0]);
      c.checked = !!st[p[1]];
      c.onchange = function () { st[p[1]] = c.checked; save(); pickDefaultOM(); refresh(); };
    });
    // « Garder aussi le fichier haute qualité » = inverse de deleteSrc (le rendu After Effects avant compression)
    $("x-keep").checked = !st.deleteSrc;
    $("x-keep").onchange = function () { st.deleteSrc = !this.checked; save(); refresh(); };
    // Taille : largeur maximale (0 = taille de la compo)
    function showWidth() { el.querySelectorAll("#x-width button").forEach(function (b) { b.classList.toggle("on", +b.dataset.w === (+st.width || 0)); }); }
    el.querySelectorAll("#x-width button").forEach(function (b) { b.onclick = function () { st.width = +b.dataset.w; save(); showWidth(); refresh(); }; });
    showWidth();
    [["x-pattern", "pattern", false], ["x-rel", "destRel", false], ["x-custom", "destCustom", false], ["x-fps", "gifFps", true]].forEach(function (p) {
      var inp = $(p[0]);
      inp.value = st[p[1]];
      inp.oninput = function () { st[p[1]] = p[2] ? Math.max(0, +inp.value || 0) : inp.value; save(); refresh(); };
    });
    $("x-pattern").addEventListener("change", preview);
    el.querySelectorAll("#x-tokens button").forEach(function (b) {
      b.onclick = function () {
        var inp = $("x-pattern"), pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
        var sep = pos > 0 && !/[_\-\s]$/.test(inp.value.slice(0, pos)) ? "_" : "";
        inp.value = inp.value.slice(0, pos) + sep + b.dataset.t + inp.value.slice(pos);
        st.pattern = inp.value; save(); preview(); refresh();
        inp.focus();
      };
    });

    /* ---------- Affichage ---------- */
    function refresh() {
      $("x-rel").hidden = st.destMode !== "project";
      $("x-custom-row").hidden = st.destMode !== "custom";
      var ame = st.mode === "ame";
      $("x-comp-box").classList.toggle("off", !st.compress || ame);
      $("x-compress").disabled = ame;
      $("x-q-row").hidden = st.format !== "mp4";
      $("x-fps-row").hidden = st.format !== "gif";
      $("x-pr-row").hidden = st.format !== "mov";
      el.querySelectorAll("#x-q button").forEach(function (b) { b.classList.toggle("on", st.qualities.indexOf(b.dataset.q) >= 0); });

      var parts = [st.source === "active" ? "Compo active" : "Sélection Projet", st.range === "work" ? "zone de travail" : "compo entière"];
      var to = ame ? "Media Encoder"
        : (st.compress && ffmpegPath()) ? (st.format === "gif" ? "GIF" : st.format === "mov" ? "MOV " + (PRORES[st.prores] || PRORES["422"])[0] : "MP4 " + st.qualities.map(function (q) { return Q[q][0].toLowerCase(); }).join(" + "))
        : (st.om || "module de sortie par défaut");
      $("x-sum").textContent = parts.join(" · ") + "  →  " + to;
    }

    var pvTimer;
    function preview() {
      clearTimeout(pvTimer);
      pvTimer = setTimeout(function () {
        api.call("SZ.exportx.preview", [st.pattern, st.source]).then(function (r) {
          $("x-preview").textContent = r.indexOf("NAME:") === 0 ? "Aperçu : " + r.slice(5) : "";   // les boutons + montrent déjà les jetons
        });
      }, 150);
    }

    /* ---------- ffmpeg ---------- */
    var ffCache;
    function ffmpegPath() {
      if (ffCache !== undefined) return ffCache;
      ffCache = null;
      if (!node) return null;
      var fs = node("fs"), path = node("path"), win = (typeof process !== "undefined" ? process.platform : navigator.platform.toLowerCase()).indexOf("win") === 0;
      var exe = win ? "ffmpeg.exe" : "ffmpeg";
      var cands = [st.ffmpeg, path.join(SZBridge.extensionPath(), "bin", exe)];
      if (win) cands.push("C:\\ffmpeg\\bin\\ffmpeg.exe", "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe");
      else cands.push("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg");
      for (var i = 0; i < cands.length; i++) {
        try { if (cands[i] && fs.existsSync(cands[i])) { ffCache = cands[i]; return ffCache; } } catch (e) {}
      }
      try {
        var found = node("child_process").execSync(win ? "where ffmpeg" : "command -v ffmpeg", { encoding: "utf8", timeout: 3000 }).split(/\r?\n/)[0].trim();
        if (found) ffCache = found;
      } catch (e2) {}
      return ffCache;
    }
    function showFF() {
      var p = ffmpegPath();
      $("x-ff").innerHTML = p
        ? "ffmpeg : <code>" + p.replace(/</g, "&lt;") + "</code> · <a href='#' id='x-ffpick'>changer</a>"
        : (node ? "ffmpeg introuvable : la compression est désactivée. <a href='#' id='x-ffpick'>Localiser ffmpeg</a>"
                : "Compression indisponible hors After Effects.");
      var a = $("x-ffpick");
      if (a) a.onclick = function (e) {
        e.preventDefault();
        api.call("SZ.exportx.pickFfmpeg", []).then(function (r) {
          if (r.indexOf("FILE:") !== 0) return;
          st.ffmpeg = r.slice(5); save(); ffCache = undefined; showFF(); refresh();
        });
      };
    }

    function progress(p) {
      $("x-prog").hidden = p == null;
      $("x-bar").style.width = Math.round((p || 0) * 100) + "%";
    }

    function toSec(t) { var m = /(\d+):(\d+):([\d.]+)/.exec(t); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : 0; }

    /* Lance ffmpeg ; onProg(0..1) ; résout true/false */
    function ffmpeg(args, onProg) {
      return new Promise(function (resolve) {
        var proc = node("child_process").spawn(ffmpegPath(), args, { windowsHide: true });
        var dur = 0, errTail = "";
        proc.stderr.on("data", function (d) {
          var s = String(d);
          errTail = (errTail + s).slice(-600);
          var md = /Duration:\s*([\d:.]+)/.exec(s); if (md) dur = toSec(md[1]);
          var mt = /time=\s*([\d:.]+)/.exec(s); if (mt && dur) onProg(Math.min(1, toSec(mt[1]) / dur));
        });
        proc.on("error", function () { resolve({ ok: false, err: "Impossible de lancer ffmpeg." }); });
        proc.on("close", function (code) { resolve({ ok: code === 0, err: errTail.split(/\r?\n/).filter(Boolean).pop() }); });
      });
    }

    function outName(src, suffix, ext) {
      var path = node("path"), fs = node("fs");
      var dir = path.dirname(src), base = path.basename(src, path.extname(src)) + suffix;
      var out = path.join(dir, base + ext), n = 2;
      while (fs.existsSync(out) || out === src) { out = path.join(dir, base + "_" + (n < 10 ? "0" + n : n) + ext); n++; }
      return out;
    }

    /* Compresse une liste de fichiers ; deleteSrc : supprimer les sources si tout a réussi. */
    function compressAll(files, deleteSrc) {
      var jobs = [];
      files.forEach(function (src) {
        if (st.format === "gif") {
          var vf = "fps=" + (st.gifFps || 15) + (st.width ? ",scale='min(" + st.width + ",iw)':-1:flags=lanczos" : "") +
            ",split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4";
          jobs.push({ src: src, out: outName(src, "", ".gif"), args: ["-vf", vf, "-loop", "0"] });
        } else if (st.format === "mov") {
          var pr = PRORES[st.prores] || PRORES["422"];
          var scaleM = st.width ? "scale='min(" + st.width + ",trunc(iw/2)*2)':-2" : "scale=trunc(iw/2)*2:trunc(ih/2)*2";
          jobs.push({
            src: src,
            out: outName(src, /\.mov$/i.test(src) ? "_prores" : "", ".mov"),
            args: ["-c:v", "prores_ks", "-profile:v", String(pr[1]), "-pix_fmt", pr[2], "-vendor", "apl0",
                   "-vf", scaleM, "-c:a", "pcm_s16le"]
          });
        } else {
          var multi = st.qualities.length > 1;
          st.qualities.forEach(function (q) {
            var scale = st.width ? "scale='min(" + st.width + ",trunc(iw/2)*2)':-2" : "scale=trunc(iw/2)*2:trunc(ih/2)*2";
            jobs.push({
              src: src,
              out: outName(src, multi ? "_" + Q[q][0].toLowerCase() : (/\.mp4$/i.test(src) ? "_web" : ""), ".mp4"),
              args: ["-c:v", "libx264", "-preset", "medium", "-crf", String(Q[q][1]), "-pix_fmt", "yuv420p",
                     "-vf", scale, "-movflags", "+faststart", "-c:a", "aac", "-b:a", "160k"]
            });
          });
        }
      });

      var done = [], failed = [], i = 0;
      function next() {
        if (i >= jobs.length) {
          progress(null);
          if (deleteSrc && !failed.length) {
            var fs = node("fs");
            files.forEach(function (f) { try { fs.unlinkSync(f); } catch (e) {} });
          }
          if (done.length) lastFile = done[done.length - 1];
          if (failed.length) api.status("Compression : " + failed.length + " échec(s)\n" + failed[0], "err");
          else api.status(done.length + " fichier" + (done.length > 1 ? "s" : "") + " prêt" + (done.length > 1 ? "s" : "") + " : " + node("path").basename(done[0]) + (done.length > 1 ? "…" : ""), "ok");
          return Promise.resolve(done);
        }
        var j = jobs[i++];
        api.status("Compression " + i + "/" + jobs.length + " · " + node("path").basename(j.out));
        return ffmpeg(["-y", "-hide_banner", "-i", j.src].concat(j.args, [j.out]), function (p) {
          progress((i - 1 + p) / jobs.length);
        }).then(function (r) {
          if (r.ok) done.push(j.out); else failed.push(node("path").basename(j.src) + " : " + (r.err || "erreur"));
          return next();
        });
      }
      progress(0);
      return next();
    }

    /* ---------- Modèles de rendu ---------- */
    var templates = { om: [], rs: [] };
    function fillSelect(sel, list, value, emptyLabel) {
      sel.innerHTML = '<option value="">' + emptyLabel + "</option>" + list.map(function (t) {
        return '<option' + (t === value ? " selected" : "") + ">" + t.replace(/</g, "&lt;") + "</option>";
      }).join("");
    }
    /* Choisit automatiquement le module de sortie, tant que l'utilisateur n'en a pas imposé un :
       haute qualité si on compresse ensuite, H.264 sinon. */
    function pickDefaultOM() {
      if (!templates.om.length) return;
      if (st.om && !st.omAuto && templates.om.indexOf(st.om) >= 0) return;
      var re = (st.compress && ffmpegPath()) ? /(high quality|haute qualit|lossless|sans perte)/i : /h\.?264/i;
      var found = templates.om.filter(function (t) { return re.test(t) && !/alpha/i.test(t); })[0];
      st.om = found || ""; st.omAuto = true; save();
      fillSelect($("x-om"), templates.om, st.om, "Par défaut d'After Effects");
    }
    function loadTemplates() {
      api.call("SZ.exportx.templates", []).then(function (r) {
        if (r.indexOf("TPL:") !== 0) return;
        var p = r.slice(4).split("\u0001");
        templates.om = p[0] ? p[0].split("\u0002") : [];
        templates.rs = p[1] ? p[1].split("\u0002") : [];
        if (!st.rs) st.rs = templates.rs.filter(function (t) { return /best|optimal|meilleur/i.test(t); })[0] || "";
        fillSelect($("x-om"), templates.om, st.om, "Par défaut d'After Effects");
        fillSelect($("x-rs"), templates.rs, st.rs, "Par défaut d'After Effects");
        pickDefaultOM();
        refresh();
      });
    }
    $("x-om").onchange = function () { st.om = this.value; st.omAuto = false; save(); refresh(); };
    $("x-rs").onchange = function () { st.rs = this.value; save(); };
    $("x-reload").onclick = loadTemplates;

    /* ---------- Actions ---------- */
    $("x-pick").onclick = function () {
      api.call("SZ.exportx.pickFolder", []).then(function (r) {
        if (r.indexOf("DIR:") !== 0) return;
        st.destCustom = r.slice(4); $("x-custom").value = st.destCustom; save();
      });
    };
    $("x-open").onclick = function () { api.run("SZ.exportx.openFolder", [st.destMode, st.destRel, st.destCustom, lastFile || ""]); };

    var busy = false;
    $("x-go").onclick = function () {
      if (busy) return;
      busy = true;
      $("x-go").classList.add("busy");
      api.status("Rendu en cours dans After Effects…");
      var opts = { source: st.source, range: st.range, pattern: st.pattern, destMode: st.destMode,
        destRel: st.destRel, destCustom: st.destCustom, om: st.om, rs: st.rs, mode: st.mode };
      api.call("SZ.exportx.render", [JSON.stringify(opts)]).then(function (r) {
        if (r.indexOf("OUT:") !== 0) { api.status(r.indexOf("ERR:") === 0 ? r.slice(4) : (r.slice(3) || r), r.indexOf("OK:") === 0 ? "ok" : "err"); return; }
        var body = r.slice(4).split("\u0003"), files = body[0].split("\u0001");
        lastFile = files[files.length - 1];
        if (st.compress && st.mode !== "ame" && ffmpegPath()) return compressAll(files, st.deleteSrc);
        api.status(files.length + " fichier" + (files.length > 1 ? "s rendus" : " rendu") + (body[1] ? "\n" + body[1] : ""), "ok");
      }).then(function () {
        busy = false; $("x-go").classList.remove("busy");
      }, function () { busy = false; $("x-go").classList.remove("busy"); progress(null); });
    };

    $("x-files").onclick = function () {
      if (!ffmpegPath()) return api.status("ffmpeg est nécessaire pour compresser des fichiers.", "err");
      api.call("SZ.exportx.pickFiles", []).then(function (r) {
        if (r.indexOf("FILES:") !== 0) return;
        compressAll(r.slice(6).split("\u0001"), false);
      });
    };

    function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
    function matches(pf) { return Object.keys(pf.s).every(function (k) { return same(pf.s[k], st[k]); }); }
    function drawProfiles() {
      var sel = $("x-prof"), active = profiles.filter(function (p) { return p.name === curProfile; })[0];
      var label = active && !matches(active) ? " (modifié)" : "";
      sel.innerHTML = '<option value="">Profil : réglages libres</option>' + profiles.map(function (p) {
        return '<option' + (p.name === curProfile ? " selected" : "") + ' value="' + p.name.replace(/"/g, "&quot;") + '">' +
          p.name.replace(/</g, "&lt;") + (p.name === curProfile ? label : "") + "</option>";
      }).join("");
      $("x-prof-del").hidden = !active;
    }
    $("x-prof").onchange = function () {
      curProfile = this.value; api.store.set("export.profile", curProfile);
      var pf = profiles.filter(function (p) { return p.name === curProfile; })[0];
      if (pf) {
        Object.keys(pf.s).forEach(function (k) { st[k] = JSON.parse(JSON.stringify(pf.s[k])); });
        if (!pf.s.om) st.omAuto = true;
        save();
        api.reload();   // ré-affiche avec les nouveaux réglages
        api.status("Profil « " + pf.name + " » chargé.", "ok");
        return;
      }
      drawProfiles();
    };
    $("x-prof-save").onclick = function () { $("x-prof-new").hidden = !$("x-prof-new").hidden; if (!$("x-prof-new").hidden) $("x-prof-name").focus(); };
    function saveProfile() {
      var name = $("x-prof-name").value.trim();
      if (!name) return;
      var data = {};
      PKEYS.forEach(function (k) { data[k] = JSON.parse(JSON.stringify(st[k])); });
      profiles = profiles.filter(function (p) { return p.name !== name; });
      profiles.unshift({ name: name, s: data });
      curProfile = name;
      api.store.set("export.profiles", profiles); api.store.set("export.profile", curProfile);
      $("x-prof-new").hidden = true; $("x-prof-name").value = "";
      drawProfiles();
      api.status("Profil « " + name + " » enregistré.", "ok");
    }
    $("x-prof-ok").onclick = saveProfile;
    $("x-prof-name").onkeydown = function (e) { if (e.key === "Enter") saveProfile(); if (e.key === "Escape") $("x-prof-new").hidden = true; };
    var delArmed = false;
    $("x-prof-del").onclick = function () {
      if (!SZDel.confirm(this)) return;
      profiles = profiles.filter(function (p) { return p.name !== curProfile; });
      api.status("Profil « " + curProfile + " » supprimé.", "ok");
      curProfile = ""; api.store.set("export.profiles", profiles); api.store.set("export.profile", "");
      drawProfiles();
    };
    // Le libellé « (modifié) » suit les changements de réglages
    el.addEventListener("click", function (e) { if (!e.target.closest(".x-prof")) setTimeout(drawProfiles, 0); });
    el.addEventListener("change", function (e) { if (e.target.id !== "x-prof") setTimeout(drawProfiles, 0); });

    showFF();
    refresh();
    preview();
    loadTemplates();
    drawProfiles();
  }
};
SZ.register(SZ_EXPORT);
